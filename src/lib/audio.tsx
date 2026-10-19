import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/store/settings-store'

/**
 * Ambient island audio.
 *
 * The soundscape is synthesised with the Web Audio API — filtered noise shaped
 * into slow surf and wind — rather than loaded from an external file. That keeps
 * the project free of third-party audio licensing while still producing real,
 * continuous sound.
 *
 * Browser autoplay policy is respected: the context is only created and resumed
 * after a genuine user gesture.
 */

/** Length of the noise source buffer, in seconds. */
const NOISE_SECONDS = 4

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * NOISE_SECONDS
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  // Pink-ish noise (Voss-McCartney approximation) — softer than white noise.
  let b0 = 0
  let b1 = 0
  let b2 = 0

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + white * 0.099046
    b1 = 0.963 * b1 + white * 0.2965164
    b2 = 0.57 * b2 + white * 1.0526913
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16
  }

  return buffer
}

export function AmbientAudio() {
  const muted = useSettingsStore((state) => state.muted)
  const volume = useSettingsStore((state) => state.masterVolume)
  const quality = useSettingsStore((state) => state.quality)

  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<AudioNode[]>([])
  const startedRef = useRef(false)

  useEffect(() => {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextCtor) return

    const start = (): void => {
      if (startedRef.current) return
      startedRef.current = true

      try {
        const context = new AudioContextCtor()
        const master = context.createGain()
        master.gain.value = 0
        master.connect(context.destination)

        // --- surf: low-passed pink noise with a slow swell ---------------
        const surfSource = context.createBufferSource()
        surfSource.buffer = createNoiseBuffer(context)
        surfSource.loop = true

        const surfFilter = context.createBiquadFilter()
        surfFilter.type = 'lowpass'
        surfFilter.frequency.value = 420
        surfFilter.Q.value = 0.7

        const surfGain = context.createGain()
        surfGain.gain.value = 0.55

        surfSource.connect(surfFilter).connect(surfGain).connect(master)

        // Waves: two detuned LFOs so the swell never feels metronomic.
        const swell = context.createOscillator()
        swell.type = 'sine'
        swell.frequency.value = 0.07
        const swellDepth = context.createGain()
        swellDepth.gain.value = 240
        swell.connect(swellDepth).connect(surfFilter.frequency)

        const swell2 = context.createOscillator()
        swell2.type = 'sine'
        swell2.frequency.value = 0.043
        const swell2Depth = context.createGain()
        swell2Depth.gain.value = 0.22
        swell2.connect(swell2Depth).connect(surfGain.gain)

        // --- wind: a higher band, quieter, slowly panning ----------------
        const windSource = context.createBufferSource()
        windSource.buffer = createNoiseBuffer(context)
        windSource.loop = true

        const windFilter = context.createBiquadFilter()
        windFilter.type = 'bandpass'
        windFilter.frequency.value = 900
        windFilter.Q.value = 1.2

        const windGain = context.createGain()
        windGain.gain.value = 0.16

        windSource.connect(windFilter).connect(windGain).connect(master)

        const gust = context.createOscillator()
        gust.type = 'sine'
        gust.frequency.value = 0.031
        const gustDepth = context.createGain()
        gustDepth.gain.value = 0.1
        gust.connect(gustDepth).connect(windGain.gain)

        // --- occasional bird call, scheduled sparsely ---------------------
        const chirp = context.createOscillator()
        chirp.type = 'triangle'
        const chirpGain = context.createGain()
        chirpGain.gain.value = 0
        chirp.connect(chirpGain).connect(master)

        const scheduleChirp = (): void => {
          if (context.state === 'closed') return
          const delay = 9 + Math.random() * 16
          window.setTimeout(() => {
            if (context.state !== 'running') {
              scheduleChirp()
              return
            }
            const now = context.currentTime
            chirp.frequency.setValueAtTime(1500 + Math.random() * 500, now)
            chirp.frequency.exponentialRampToValueAtTime(2400, now + 0.09)
            chirp.frequency.exponentialRampToValueAtTime(1700, now + 0.2)
            chirpGain.gain.setValueAtTime(0, now)
            chirpGain.gain.linearRampToValueAtTime(0.035, now + 0.03)
            chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
            scheduleChirp()
          }, delay * 1000)
        }

        surfSource.start()
        windSource.start()
        swell.start()
        swell2.start()
        gust.start()
        chirp.start()
        scheduleChirp()

        contextRef.current = context
        masterRef.current = master
        nodesRef.current = [surfSource, windSource, swell, swell2, gust, chirp]
      } catch {
        // Audio is a progressive enhancement; a failure must never break the app.
        startedRef.current = false
      }
    }

    const gestures = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const gesture of gestures) {
      window.addEventListener(gesture, start, { once: true, passive: true })
    }

    return () => {
      for (const gesture of gestures) {
        window.removeEventListener(gesture, start)
      }

      const context = contextRef.current
      for (const node of nodesRef.current) {
        try {
          ;(node as OscillatorNode & AudioBufferSourceNode).stop?.()
        } catch {
          /* already stopped */
        }
        node.disconnect()
      }
      nodesRef.current = []
      masterRef.current?.disconnect()
      masterRef.current = null
      void context?.close().catch(() => undefined)
      contextRef.current = null
      startedRef.current = false
    }
  }, [])

  // Fade the master gain whenever mute or volume changes.
  useEffect(() => {
    const master = masterRef.current
    const context = contextRef.current
    if (!master || !context) return

    const target = muted ? 0 : volume * (quality === 'low' ? 0.7 : 1)
    const now = context.currentTime

    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(target, now + 0.6)

    if (context.state === 'suspended' && !muted) {
      void context.resume().catch(() => undefined)
    }
  }, [muted, volume, quality])

  return null
}
