import { useCallback } from 'react'
import { IslandPath, SkyDome, Terrain, Vegetation, Water } from '@/world/scenes/Environment'
import { InteractiveObjects } from '@/world/objects/InteractiveObjects'
import { TimeBasedLighting } from '@/world/lighting/TimeLighting'
import { LIGHTING_PRESETS } from '@/world/lighting/lighting-presets'
import { PlayerAvatar } from '@/world/characters/PlayerAvatar'
import { CameraRig } from '@/world/camera/CameraRig'
import { useSettingsStore } from '@/store/settings-store'

export interface GreenhavenSceneProps {
  shadows: boolean
  inputEnabled: boolean
  onSelect: (id: string | null) => void
  onNearbyChange: (id: string | null) => void
}

/**
 * Greenhaven Island — the single scene of TinyWorld.
 *
 * Composed so the first frame already reads as a photograph: the island is
 * framed as a miniature, the lighthouse anchors the high ground, and the path
 * leads the eye from the dock in the foreground to the arch at the island spine.
 */
export function GreenhavenScene({
  shadows,
  inputEnabled,
  onSelect,
  onNearbyChange,
}: GreenhavenSceneProps) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  const preset = LIGHTING_PRESETS[timeOfDay]

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

      <Water />
      <Terrain />
      <IslandPath />
      <Vegetation shadows={shadows} />

      <InteractiveObjects onSelect={handleSelect} />
      <PlayerAvatar />

      <CameraRig onNearbyChange={handleNearbyChange} inputEnabled={inputEnabled} />
    </>
  )
}
