import { useCallback, useMemo } from 'react'
import type { IslandDefinition } from '@/types'
import { IslandPath, SkyDome, Terrain, Vegetation, Water } from '@/world/scenes/Environment'
import { InteractiveObjects } from '@/world/objects/InteractiveObjects'
import { TimeBasedLighting } from '@/world/lighting/TimeLighting'
import { LIGHTING_PRESETS } from '@/world/lighting/lighting-presets'
import { PlayerAvatar } from '@/world/characters/PlayerAvatar'
import { CameraRig } from '@/world/camera/CameraRig'
import { createTerrain } from '@/world/terrain/terrain'
import { useSettingsStore } from '@/store/settings-store'

export interface IslandSceneProps {
  island: IslandDefinition
  shadows: boolean
  inputEnabled: boolean
  onSelect: (id: string | null) => void
  onNearbyChange: (id: string | null) => void
}

/**
 * One island.
 *
 * Every value that differs between islands — coastline, height field, palette,
 * footpath, scatter and landmarks — arrives through the `island` prop. Nothing
 * in here branches on which island is active, so a new island needs no changes
 * to this file. Remounting it with a different island (via `key`) is what forces
 * the terrain geometry and instanced props to be rebuilt.
 */
export function IslandScene({
  island,
  shadows,
  inputEnabled,
  onSelect,
  onNearbyChange,
}: IslandSceneProps) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  const preset = LIGHTING_PRESETS[timeOfDay]

  const terrain = useMemo(() => createTerrain(island), [island])
  const environment = useMemo(() => ({ shadows, island, terrain }), [shadows, island, terrain])

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

      <Water {...environment} />
      <Terrain {...environment} />
      <IslandPath {...environment} />
      <Vegetation {...environment} />

      <InteractiveObjects island={island} terrain={terrain} onSelect={handleSelect} />
      <PlayerAvatar island={island} />

      <CameraRig island={island} onNearbyChange={handleNearbyChange} inputEnabled={inputEnabled} />
    </>
  )
}
