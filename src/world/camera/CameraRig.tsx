import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OBSTACLES, SPAWN_POSITION } from '@/data/world'
import { WORLD_OBJECTS } from '@/data/objects'
import { terrainHeight } from '@/world/terrain/terrain'
import { findNearest, normaliseInput, resolvePosition, wrapAngle } from '@/game/collision/collision'
import { moveVectorToInput, readMoveVector } from '@/game/input/input'
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
const INTERACTION_REACH = 5.5
const PROXIMITY_INTERVAL = 0.18
const SESSION_SAVE_INTERVAL = 4
/** How long the camera drifts toward a newly selected object, in seconds. */
const FOCUS_DURATION = 1.1

export interface CameraRigProps {
  /** Fired when the object within interaction range changes. */
  onNearbyChange: (id: string | null) => void
  /** Frozen while a dialog is open or photo mode is active. */
  inputEnabled: boolean
}

/** Interactable objects considered for the proximity prompt. */
const PROXIMITY_CANDIDATES = WORLD_OBJECTS.filter((object) => object.interactable).map(
  (object) => ({
    id: object.id,
    position: object.position,
    radius: object.radius,
  }),
)

/**
 * Third-person follow camera with WASD / touch movement.
 *
 * All per-frame work happens inside the R3F frame loop against the mutable
 * `movementState` object — React is never re-rendered for movement or camera.
 */
export function CameraRig({ onNearbyChange, inputEnabled }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const selectedId = useGameStore((s) => s.selectedId)

  const initialised = useRef(false)
  const proximityLastRun = useRef(-Infinity)
  const lastSaveTime = useRef(0)
  const focusTimer = useRef(0)

  // Restore the previous session on first mount, clamped to walkable ground.
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    const session = readResumeSession()
    const start = session ? session.position : { ...SPAWN_POSITION }
    const resolved = resolvePosition({ x: start.x, z: start.z }, PLAYER_RADIUS, OBSTACLES)

    movementState.player.x = resolved.position.x
    movementState.player.z = resolved.position.z
    movementState.yaw = session ? session.yaw : 0.6
  }, [])

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
    const keyboard = inputEnabled ? moveVectorToInput(readMoveVector(movementState.pressed)) : null
    const touch = inputEnabled ? movementState.touchAxis : { x: 0, y: 0 }

    let inputX = touch.x + (keyboard?.x ?? 0)
    let inputZ = touch.y + (keyboard?.z ?? 0)

    const magnitude = Math.hypot(inputX, inputZ)
    if (magnitude > 1) {
      inputX /= magnitude
      inputZ /= magnitude
    }

    const speed = MOVE_SPEED * magnitude
    const direction = normaliseInput({ x: inputX, z: inputZ }, movementState.yaw)

    movementState.speed = THREE.MathUtils.damp(movementState.speed, speed, 8, dt)

    if (speed > 0) {
      const resolved = resolvePosition(
        {
          x: movementState.player.x + direction.x * speed * dt,
          z: movementState.player.z + direction.z * speed * dt,
        },
        PLAYER_RADIUS,
        OBSTACLES,
      )
      movementState.player.x = resolved.position.x
      movementState.player.z = resolved.position.z
    }

    // ---- camera ----------------------------------------------------------
    const playerGround = terrainHeight(movementState.player.x, movementState.player.z)
    const focus = new THREE.Vector3(
      movementState.player.x,
      playerGround + 1.6,
      movementState.player.z,
    )

    // Drift toward the selected landmark for a moment after selection.
    if (focusTimer.current > 0 && selectedId) {
      focusTimer.current -= dt
      const object = WORLD_OBJECTS.find((entry) => entry.id === selectedId)
      if (object) {
        const target = new THREE.Vector3(
          object.position.x,
          terrainHeight(object.position.x, object.position.z) + 1.5,
          object.position.z,
        )
        focus.lerp(target, 0.45)
      }
    }

    const horizontal = Math.cos(movementState.pitch) * movementState.distance
    const vertical = Math.sin(movementState.pitch) * movementState.distance

    const desired = new THREE.Vector3(
      focus.x - Math.sin(movementState.yaw) * horizontal,
      focus.y + vertical,
      focus.z - Math.cos(movementState.yaw) * horizontal,
    )

    // Keep the camera above the terrain, never below the island surface.
    const groundAtCamera = terrainHeight(desired.x, desired.z) + 1.8
    if (desired.y < groundAtCamera) desired.y = groundAtCamera

    const damping = reducedMotion ? 100 : 7
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, damping, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, damping, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, damping, dt)
    camera.lookAt(focus.x, focus.y + 0.6, focus.z)

    // ---- proximity prompt ------------------------------------------------
    if (now - proximityLastRun.current >= PROXIMITY_INTERVAL) {
      proximityLastRun.current = now
      const nearest = findNearest(
        { x: movementState.player.x, z: movementState.player.z },
        PROXIMITY_CANDIDATES,
        INTERACTION_REACH,
      )
      onNearbyChange(nearest?.id ?? null)
    }

    // ---- session persistence ---------------------------------------------
    if (now - lastSaveTime.current >= SESSION_SAVE_INTERVAL) {
      lastSaveTime.current = now
      writeResumeSession({
        position: { x: movementState.player.x, z: movementState.player.z },
        yaw: movementState.yaw,
      })
    }
  })

  return null
}
