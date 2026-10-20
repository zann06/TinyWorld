import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { IslandScene } from '@/world/scenes/IslandScene'
import { getIsland } from '@/data/islands'
import { SceneLoader } from '@/features/exploration/SceneLoader'
import { InteractionLayer } from '@/features/exploration/InteractionLayer'
import { PhotoModeOverlay } from '@/features/photo-mode/PhotoMode'
import { RendererBridge } from '@/lib/renderer-bridge'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { useSettingsStore } from '@/store/settings-store'
import { useGameStore } from '@/store/game-store'
import { useUiStore } from '@/store/ui-store'
import { useDragLook, useKeyboardControls, movementState } from '@/game/input/useKeyboardControls'
import type { GameAction } from '@/game/input/input'

const DPR_BY_QUALITY = { low: 1, medium: 1.25, high: 1.75 } as const

/** The live 3D viewport plus every system that drives it. */
export function WorldCanvas() {
  const quality = useSettingsStore((s) => s.quality)
  const sensitivity = useSettingsStore((s) => s.cameraSensitivity)
  const showHud = useSettingsStore((s) => s.showHud)
  const photoMode = useGameStore((s) => s.photoMode)
  const select = useGameStore((s) => s.select)
  const openPanel = useGameStore((s) => s.openPanel)
  const setNearby = useGameStore((s) => s.setNearby)
  const activeIslandId = useGameStore((s) => s.activeIslandId)

  const island = useMemo(() => getIsland(activeIslandId), [activeIslandId])

  const blocking = useUiStore((s) => s.blocking)
  const inputEnabled = !blocking && !photoMode

  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  const handleAction = useCallback((action: GameAction) => {
    const state = useGameStore.getState()
    const ui = useUiStore.getState()

    switch (action) {
      case 'interact': {
        if (ui.blocking) return
        const target = state.nearbyId ?? state.selectedId
        if (!target) return
        state.interact(target)
        if (!state.panelOpen) {
          state.openPanel(target)
          ui.setPanelOpen(true)
        }
        break
      }
      case 'escape': {
        if (state.panelOpen) {
          state.closePanel()
          ui.setPanelOpen(false)
        }
        break
      }
      case 'photoMode': {
        state.setPhotoMode(!state.photoMode)
        break
      }
      default:
        break
    }
  }, [])

  useKeyboardControls({ enabled: inputEnabled, onAction: handleAction })
  useDragLook(canvasElement, sensitivity)

  useEffect(() => {
    return () => {
      movementState.dragging = false
      document.body.style.cursor = ''
    }
  }, [])

  useEffect(() => {
    if (!canvasElement) return
    canvasElement.setAttribute(
      'aria-label',
      `${island.name}. Interactive 3D world. Use the island directory to browse landmarks with the keyboard.`,
    )
  }, [canvasElement, island.name])

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id === null) {
        select(null)
        useUiStore.getState().setPanelOpen(false)
        return
      }
      select(id)
      openPanel(id)
      useUiStore.getState().setPanelOpen(true)
    },
    [select, openPanel],
  )

  const handleNearbyChange = useCallback(
    (id: string | null) => {
      setNearby(id)
    },
    [setNearby],
  )

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ErrorBoundary title="The 3D world could not start">
        <Canvas
          dpr={DPR_BY_QUALITY[quality]}
          shadows={quality === 'high' ? 'percentage' : quality === 'medium' ? 'basic' : false}
          gl={{
            antialias: quality !== 'low',
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
            alpha: false,
          }}
          camera={{ fov: 46, near: 0.5, far: 900, position: [-40, 26, 46] }}
          onCreated={({ gl, scene }) => {
            scene.background = new THREE.Color('#cfe6ef')
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.25

            const canvas = gl.domElement
            canvas.setAttribute('data-testid', 'world-canvas')
            canvas.setAttribute('role', 'img')
            setCanvasElement(canvas)
          }}
          onPointerMissed={() => handleSelect(null)}
        >
          <Suspense fallback={null}>
            <RendererBridge />
            {/*
              Keying on the island id remounts the whole scene when the explorer
              travels, which is what rebuilds the terrain geometry and the
              instanced props instead of leaving them from the previous island.
            */}
            <IslandScene
              key={island.id}
              island={island}
              shadows={quality !== 'low'}
              inputEnabled={inputEnabled}
              onSelect={handleSelect}
              onNearbyChange={handleNearbyChange}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      <SceneLoader />
      {photoMode ? <PhotoModeOverlay /> : showHud ? <InteractionLayer /> : null}
    </div>
  )
}
