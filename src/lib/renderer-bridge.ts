import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'

/**
 * Bridge that exposes the live WebGL renderer to UI living outside the Canvas.
 *
 * Photo mode needs the real renderer to produce a PNG, but it renders as a DOM
 * sibling of the canvas. Publishing the renderer here keeps the two in sync
 * without leaking Three.js state into React.
 */
interface RendererHolder {
  renderer: THREE.WebGLRenderer | null
  scene: THREE.Scene | null
  camera: THREE.Camera | null
}

const holder: RendererHolder = {
  renderer: null,
  scene: null,
  camera: null,
}

export function getRenderer(): RendererHolder {
  return holder
}

/** Mounted inside the Canvas; publishes and revokes the renderer reference. */
export function RendererBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    holder.renderer = gl
    holder.scene = scene
    holder.camera = camera

    return () => {
      holder.renderer = null
      holder.scene = null
      holder.camera = null
    }
  }, [gl, scene, camera])

  return null
}
