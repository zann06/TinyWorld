import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import {
  QUALITY_LEVELS,
  MAX_SENSITIVITY,
  MIN_SENSITIVITY,
  TIME_PRESETS,
} from '@/store/settings-defaults'
import { useActiveDiscoveries, useActiveIsland, useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'
import { islandDiscoverableCount } from '@/data/objects'
import type { QualityLevel, TimeOfDayPreset } from '@/types'

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

const QUALITY_LABEL: Record<QualityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const QUALITY_HINT: Record<QualityLevel, string> = {
  low: 'No shadows, fewer decorations. Best for older phones.',
  medium: 'Soft shadows, standard decoration count.',
  high: 'Full shadows, complete decoration set.',
}

const TIME_LABEL: Record<TimeOfDayPreset, string> = {
  day: 'Day',
  dusk: 'Dusk',
  night: 'Night',
}

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-deep">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          checked ? 'border-forest bg-leaf' : 'border-forest/30 bg-cream-dim'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

/**
 * Settings dialog. Every control writes to the persisted settings store and
 * takes effect immediately — there is no unsaved state.
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const settings = useSettingsStore()
  const resetProgress = useGameStore((state) => state.resetProgress)
  const pushToast = useGameStore((state) => state.pushToast)
  const island = useActiveIsland()
  const discoveries = useActiveDiscoveries()
  const discoveryCount = discoveries.length
  const landmarkTotal = islandDiscoverableCount(island)

  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmResetSettings, setConfirmResetSettings] = useState(false)

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Settings"
        description="Graphics, camera and audio preferences are saved on this device."
        size="lg"
      >
        <div className="space-y-6">
          <section aria-labelledby="settings-graphics">
            <h3
              id="settings-graphics"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Graphics
            </h3>
            <fieldset className="mt-2">
              <legend className="sr-only">Graphics quality</legend>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={settings.quality === level}
                    onClick={() => {
                      settings.setQuality(level)
                      pushToast({
                        title: 'Graphics updated',
                        description: `Quality set to ${QUALITY_LABEL[level].toLowerCase()}.`,
                        variant: 'info',
                      })
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95 ${
                      settings.quality === level
                        ? 'border-forest bg-forest text-cream'
                        : 'border-forest/25 bg-cream/60 text-deep hover:bg-forest/10'
                    }`}
                  >
                    {QUALITY_LABEL[level]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{QUALITY_HINT[settings.quality]}</p>
            </fieldset>
          </section>

          <section aria-labelledby="settings-time">
            <h3
              id="settings-time"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Time of day
            </h3>
            <fieldset className="mt-2">
              <legend className="sr-only">Time of day</legend>
              <div className="grid grid-cols-3 gap-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={settings.timeOfDay === preset}
                    onClick={() => {
                      settings.setTimeOfDay(preset)
                      settings.setAutoCycleTime(false)
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95 ${
                      settings.timeOfDay === preset
                        ? 'border-forest bg-forest text-cream'
                        : 'border-forest/25 bg-cream/60 text-deep hover:bg-forest/10'
                    }`}
                  >
                    {TIME_LABEL[preset]}
                  </button>
                ))}
              </div>
            </fieldset>
            <Toggle
              id="settings-auto-cycle"
              label="Cycle time of day"
              hint="Slowly move between day, dusk and night."
              checked={settings.autoCycleTime}
              onChange={settings.setAutoCycleTime}
            />
          </section>

          <section aria-labelledby="settings-camera">
            <h3
              id="settings-camera"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Camera
            </h3>
            <div className="mt-2 space-y-1">
              <label
                htmlFor="settings-sensitivity"
                className="flex items-center justify-between text-sm font-semibold text-deep"
              >
                Sensitivity
                <span className="font-mono text-xs text-muted">
                  {settings.cameraSensitivity.toFixed(1)}
                </span>
              </label>
              <input
                id="settings-sensitivity"
                type="range"
                min={MIN_SENSITIVITY}
                max={MAX_SENSITIVITY}
                step={0.1}
                value={settings.cameraSensitivity}
                onChange={(event) => settings.setCameraSensitivity(event.target.valueAsNumber)}
                className="w-full accent-[var(--color-leaf)]"
              />
            </div>
            <Toggle
              id="settings-invert-y"
              label="Invert vertical look"
              checked={settings.invertLookY}
              onChange={settings.setInvertLookY}
            />
          </section>

          <section aria-labelledby="settings-audio">
            <h3
              id="settings-audio"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Audio
            </h3>
            <Toggle
              id="settings-mute"
              label="Mute ambient sound"
              checked={settings.muted}
              onChange={settings.setMuted}
            />
            <div className="mt-2 space-y-1">
              <label
                htmlFor="settings-volume"
                className="flex items-center justify-between text-sm font-semibold text-deep"
              >
                Volume
                <span className="font-mono text-xs text-muted">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </label>
              <input
                id="settings-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(event) => settings.setMasterVolume(event.target.valueAsNumber)}
                disabled={settings.muted}
                className="w-full accent-[var(--color-leaf)] disabled:opacity-50"
              />
            </div>
          </section>

          <section aria-labelledby="settings-accessibility">
            <h3
              id="settings-accessibility"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Accessibility
            </h3>
            <Toggle
              id="settings-reduced-motion"
              label="Reduce motion"
              hint="Disables camera easing and interface animation."
              checked={settings.reducedMotion}
              onChange={settings.setReducedMotion}
            />
            <Toggle
              id="settings-show-hud"
              label="Show heads-up display"
              hint="Turn off for a clean screenshot."
              checked={settings.showHud}
              onChange={settings.setShowHud}
            />
          </section>

          <section aria-labelledby="settings-reset" className="border-t border-forest/15 pt-4">
            <h3
              id="settings-reset"
              className="text-sm font-bold tracking-wide text-forest uppercase"
            >
              Reset
            </h3>
            <p className="mt-1 text-xs text-muted">
              You have found {discoveryCount} of {landmarkTotal} landmarks on {island.name}.
              Resetting progress cannot be undone, and only affects this island.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetSettings(true)}
                className="rounded-full border border-forest/25 px-4 py-2 text-sm font-semibold text-deep transition hover:bg-forest/10 active:scale-95"
              >
                Reset settings
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-full border border-[#a8442a]/40 px-4 py-2 text-sm font-semibold text-[#a8442a] transition hover:bg-[#a8442a]/10 active:scale-95"
              >
                Reset discovered progress
              </button>
            </div>
          </section>

          {!settings.persistent ? (
            <p role="status" className="rounded-xl bg-sun/40 px-3 py-2 text-xs text-muted">
              This browser is blocking local storage, so your settings will not survive a refresh.
            </p>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        title="Reset discovered progress?"
        description={`Every discovery on ${island.name} will be cleared.`}
        detail={`You currently have ${discoveryCount} of ${landmarkTotal} landmarks recorded on this island. This cannot be undone.`}
        confirmLabel="Reset progress"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetProgress()
          setConfirmReset(false)
          pushToast({
            title: 'Progress reset',
            description: 'All discoveries on Greenhaven Island have been cleared.',
            variant: 'info',
          })
        }}
      />

      <ConfirmDialog
        open={confirmResetSettings}
        title="Reset settings?"
        description="Graphics, camera and audio return to their defaults."
        confirmLabel="Reset settings"
        onCancel={() => setConfirmResetSettings(false)}
        onConfirm={() => {
          settings.resetSettings()
          setConfirmResetSettings(false)
          pushToast({
            title: 'Settings reset',
            description: 'Preferences are back to their defaults.',
            variant: 'info',
          })
        }}
      />
    </>
  )
}
