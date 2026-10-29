import { useCallback, useMemo } from 'react'
import type { IslandDefinition } from '@/types'
import { ISLANDS } from '@/data/islands'
import { IslandPath, SkyDome, Terrain, Vegetation, Water } from '@/world/scenes/Environment'
import { InteractiveObjects } from '@/world/objects/InteractiveObjects'
import { ObjectiveBeacon } from '@/world/objects/ObjectiveBeacon'
import { TimeBasedLighting } from '@/world/lighting/TimeLighting'
import { LIGHTING_PRESETS } from '@/world/lighting/lighting-presets'
import { PlayerAvatar } from '@/world/characters/PlayerAvatar'
import { CameraRig } from '@/world/camera/CameraRig'
import { AmbientLife } from '@/world/ambient/AmbientLife'
import { createTerrain } from '@/world/terrain/terrain'
import { useSettingsStore } from '@/store/settings-store'

export interface IslandSceneProps {
  island: IslandDefinition
  /** Islands whose scene graph has been built and must stay resident. */
  mountedIslands: ReadonlySet<string>
  shadows: boolean
  inputEnabled: boolean
  onSelect: (id: string | null) => void
  onNearbyChange: (id: string | null) => void
}

/**
 * One island's decorative scene graph.
 *
 * Mounted once and then only toggled visible. The geometry, instanced props and
 * uploaded buffers survive travel, which is what makes returning to an island
 * cheap. Interactive objects and the player are handled by the active scene
 * only, so inactive islands cannot receive raycasts or run selection loops.
 */
function IslandEnvironment({
  island,
  shadows,
  active,
}: {
  island: IslandDefinition
  shadows: boolean
  active: boolean
}) {
  const terrain = useMemo(() => createTerrain(island), [island])
  const environment = useMemo(() => ({ shadows, island, terrain }), [shadows, island, terrain])

  return (
    <group visible={active}>
      <Water {...environment} />
      <Terrain {...environment} />
      <IslandPath {...environment} />
      <Vegetation {...environment} />
      <AmbientLife island={island} terrain={terrain} active={active} shadows={shadows} />
    </group>
  )
}

/**
 * The live island.
 *
 * Every value that differs between islands — coastline, height field, palette,
 * footpath, scatter and landmarks — arrives through the `island` prop. Nothing
 * in here branches on which island is active, so a new island needs no changes
 * to this file. Previously visited environments stay mounted while the shared
 * lighting, sky, player and camera switch to the active island.
 */
export function IslandScene({
  island,
  mountedIslands,
  shadows,
  inputEnabled,
  onSelect,
  onNearbyChange,
}: IslandSceneProps) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  const preset = LIGHTING_PRESETS[timeOfDay]

  const terrain = useMemo(() => createTerrain(island), [island])
  const mounted = useMemo(
    () => ISLANDS.filter((entry) => mountedIslands.has(entry.id)),
    [mountedIslands],
  )

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelect(id)
    },
    [onSelect],
  )

  const handleNearbyChange = useCallback(
    (id: string | null) => {
      onNearbyChange(id)
    },
    [onNearbyChange],
  )

  return (
    <>
      <fog attach="fog" args={[preset.fogColor, 150, 420]} />
      <SkyDome top={preset.skyTop} bottom={preset.skyBottom} />

      <TimeBasedLighting shadows={shadows} />

      {mounted.map((entry) => (
        <IslandEnvironment
          key={entry.id}
          island={entry}
          shadows={shadows}
          active={entry.id === island.id}
        />
      ))}

      <InteractiveObjects island={island} terrain={terrain} onSelect={handleSelect} />
      <ObjectiveBeacon island={island} terrain={terrain} />
      <PlayerAvatar island={island} />

      <CameraRig island={island} onNearbyChange={handleNearbyChange} inputEnabled={inputEnabled} />
    </>
  )
}
