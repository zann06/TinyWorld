import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import { createTerrain } from '@/world/terrain/terrain'
import { findNearest, normaliseInput, resolvePosition, wrapAngle } from '@/game/collision/collision'
import { EMPTY_MOVE_VECTOR, moveVectorToInput, readMoveVector } from '@/game/input/input'
import {
  MAX_CAMERA_DISTANCE,
  MAX_PITCH,
  MIN_CAMERA_DISTANCE,
  MIN_PITCH,
  movementState,
} from '@/game/input/useKeyboardControls'
import { useSettingsStore } from '@/store/settings-store'
import { readResumeSession, useGameStore, writeResumeSession } from '@/store/game-store'

const PLAYER_RADIUS = 1.15
const MOVE_SPEED = 11
/** Sprint multiplier, held with Shift or by pushing the touch stick to its edge. */
const SPRINT_MULTIPLIER = 1.55
const MOVE_ACCELERATION = 12
const MOVE_BRAKING = 16
const MOVE_STOP_EPSILON = 0.02
const INTERACTION_REACH = 5.5
const PROXIMITY_INTERVAL = 0.18
const SESSION_SAVE_INTERVAL = 4
/** How long the camera drifts toward a newly selected object, in seconds. */
const FOCUS_DURATION = 1.1

export interface CameraRigProps {
  island: IslandDefinition
  /** Fired when the object within interaction range changes. */
  onNearbyChange: (id: string | null) => void
  /** Frozen while a dialog is open or photo mode is active. */
  inputEnabled: boolean
}

/** Interactable objects considered for the proximity prompt. */
function proximityCandidates(island: IslandDefinition) {
  return island.objects
    .filter((object) => object.interactable)
    .map((object) => ({ id: object.id, position: object.position, radius: object.radius }))
}

/**
 * Third-person follow camera with WASD / touch movement.
 *
 * All per-frame work happens inside the R3F frame loop against the mutable
 * `movementState` object — React is never re-rendered for movement or camera.
 */
export function CameraRig({ island, onNearbyChange, inputEnabled }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const selectedId = useGameStore((s) => s.selectedId)

  const terrain = useMemo(() => createTerrain(island), [island])
  const candidates = useMemo(() => proximityCandidates(island), [island])
  const obstacles = island.obstacles

  // Reused every frame so walking and camera follow do not allocate.
  const scratch = useMemo(
    () => ({
      move: { ...EMPTY_MOVE_VECTOR },
      input: { x: 0, z: 0 },
      rawInput: { x: 0, z: 0 },
      direction: { x: 0, z: 0 },
      zero: { x: 0, y: 0 },
      nextPosition: { x: 0, z: 0 },
      focus: new THREE.Vector3(),
      target: new THREE.Vector3(),
      desired: new THREE.Vector3(),
    }),
    [],
  )

  const initialised = useRef<string | null>(null)
  const proximityLastRun = useRef(-Infinity)
  const lastSaveTime = useRef(0)
  const focusTimer = useRef(0)
  const smoothFocus = useRef(new THREE.Vector3())
  const focusInitialised = useRef(false)

  // Restore this island's previous session on first mount, clamped to walkable
  // ground. `initialised` is keyed by island, so travelling rebuilds the rig.
  const islandId = island.id
  useEffect(() => {
    if (initialised.current === islandId) return
    initialised.current = islandId

    const session = readResumeSession(islandId)
    const start = session ? session.position : { ...island.spawn }
    const resolved = resolvePosition(
      { x: start.x, z: start.z },
      PLAYER_RADIUS,
      obstacles,
      terrain.coastRadiusAt,
    )

    movementState.player.x = resolved.position.x
    movementState.player.z = resolved.position.z
    movementState.yaw = session ? session.yaw : island.defaultYaw
    movementState.facing = session ? session.yaw : island.defaultYaw
    // A stale drag, held key or velocity must not carry into the new island.
    movementState.pendingYawDelta = 0
    movementState.pendingPitchDelta = 0
    movementState.pendingZoomDelta = 0
    movementState.velocity.x = 0
    movementState.velocity.z = 0
    movementState.speed = 0
    focusInitialised.current = false
  }, [islandId, island.spawn, island.defaultYaw, obstacles, terrain])

  // Start a focus drift whenever the selection changes.
  useEffect(() => {
    focusTimer.current = selectedId ? FOCUS_DURATION : 0
  }, [selectedId])

  useFrame((state, delta) => {
    // Clamp after a tab-switch stall so the player cannot teleport on resume.
    const dt = Math.min(delta, 1 / 20)

    // Periodic work runs on wall-clock time, not the clamped simulation step —
    // otherwise it would stall forever on a slow device that renders at 2 fps.
    const now = state.clock.elapsedTime

    // ---- look ------------------------------------------------------------
    movementState.yaw = wrapAngle(movementState.yaw + movementState.pendingYawDelta)
    movementState.pitch = THREE.MathUtils.clamp(
      movementState.pitch + movementState.pendingPitchDelta,
      MIN_PITCH,
      MAX_PITCH,
    )
    movementState.distance = THREE.MathUtils.clamp(
      movementState.distance + movementState.pendingZoomDelta,
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    )
    movementState.pendingYawDelta = 0
    movementState.pendingPitchDelta = 0
    movementState.pendingZoomDelta = 0

    // ---- movement --------------------------------------------------------
    const keyboard = inputEnabled
      ? moveVectorToInput(readMoveVector(movementState.pressed, scratch.move), scratch.input)
      : null
    const touch = inputEnabled ? movementState.touchAxis : scratch.zero

    let inputX = touch.x + (keyboard?.x ?? 0)
    let inputZ = touch.y + (keyboard?.z ?? 0)

    const magnitude = Math.hypot(inputX, inputZ)
    if (magnitude > 1) {
      inputX /= magnitude
      inputZ /= magnitude
    }

    // Sprint: Shift on keyboard, or the touch stick pushed to its edge.
    const wantsSprint =
      magnitude > 0.01 &&
      (movementState.pressed.has('ShiftLeft') ||
        movementState.pressed.has('ShiftRight') ||
        movementState.touchSprint)
    const speed = MOVE_SPEED * magnitude * (wantsSprint ? SPRINT_MULTIPLIER : 1)
    scratch.rawInput.x = inputX
    scratch.rawInput.z = inputZ
    const direction = normaliseInput(scratch.rawInput, movementState.yaw, scratch.direction)

    // Accelerate and brake the actual velocity instead of snapping to full
    // speed. Direction changes stay responsive but no longer look like a
    // teleport, and releasing the keys glides to a stop.
    const responsiveness = magnitude > 0.01 ? MOVE_ACCELERATION : MOVE_BRAKING
    const targetVelocityX = direction.x * speed
    const targetVelocityZ = direction.z * speed
    let velocityX = THREE.MathUtils.damp(
      movementState.velocity.x,
      targetVelocityX,
      responsiveness,
      dt,
    )
    let velocityZ = THREE.MathUtils.damp(
      movementState.velocity.z,
      targetVelocityZ,
      responsiveness,
      dt,
    )

    if (Math.hypot(velocityX, velocityZ) < MOVE_STOP_EPSILON && magnitude < 0.01) {
      velocityX = 0
      velocityZ = 0
    }

    movementState.velocity.x = velocityX
    movementState.velocity.z = velocityZ
    const planarSpeed = Math.hypot(velocityX, velocityZ)
    movementState.speed = planarSpeed

    if (planarSpeed > 0) {
      scratch.nextPosition.x = movementState.player.x + velocityX * dt
      scratch.nextPosition.z = movementState.player.z + velocityZ * dt
      const resolved = resolvePosition(
        scratch.nextPosition,
        PLAYER_RADIUS,
        obstacles,
        terrain.coastRadiusAt,
      )
      movementState.player.x = resolved.position.x
      movementState.player.z = resolved.position.z
      movementState.facing = Math.atan2(velocityX, velocityZ)
    }

    // ---- camera ----------------------------------------------------------
    const playerGround = terrain.height(movementState.player.x, movementState.player.z)
    const focus = scratch.focus.set(
      movementState.player.x,
      playerGround + 1.6,
      movementState.player.z,
    )

    // Drift toward the selected landmark for a moment after selection.
    if (focusTimer.current > 0 && selectedId) {
      focusTimer.current -= dt
      const object = island.objects.find((entry) => entry.id === selectedId)
      if (object) {
        const target = scratch.target.set(
          object.position.x,
          terrain.height(object.position.x, object.position.z) + 1.5,
          object.position.z,
        )
        focus.lerp(target, 1 - Math.exp(-5 * dt))
      }
    }

    // Damping the focus point as well as the camera position removes the
    // small vertical pops caused by terrain samples and prop focus targets.
    if (!focusInitialised.current) {
      smoothFocus.current.copy(focus)
      focusInitialised.current = true
    } else {
      smoothFocus.current.lerp(focus, 1 - Math.exp(-(reducedMotion ? 30 : 12) * dt))
    }
    const smooth = smoothFocus.current

    const horizontal = Math.cos(movementState.pitch) * movementState.distance
    const vertical = Math.sin(movementState.pitch) * movementState.distance

    const desired = scratch.desired.set(
      smooth.x - Math.sin(movementState.yaw) * horizontal,
      smooth.y + vertical,
      smooth.z - Math.cos(movementState.yaw) * horizontal,
    )

    // Keep the camera above the terrain, never below the island surface.
    const groundAtCamera = terrain.height(desired.x, desired.z) + 1.8
    if (desired.y < groundAtCamera) desired.y = groundAtCamera

    const damping = reducedMotion ? 100 : 8
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, damping, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, damping, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, damping, dt)
    camera.lookAt(smooth.x, smooth.y + 0.6, smooth.z)

    // ---- proximity prompt ------------------------------------------------
    if (now - proximityLastRun.current >= PROXIMITY_INTERVAL) {
      proximityLastRun.current = now
      const nearest = findNearest(
        { x: movementState.player.x, z: movementState.player.z },
        candidates,
        INTERACTION_REACH,
      )
      onNearbyChange(nearest?.id ?? null)
    }

    // ---- session persistence ---------------------------------------------
    if (now - lastSaveTime.current >= SESSION_SAVE_INTERVAL) {
      lastSaveTime.current = now
      writeResumeSession(islandId, {
        position: { x: movementState.player.x, z: movementState.player.z },
        yaw: movementState.yaw,
      })
    }
  })

  return null
}
