import { Settings2 } from 'lucide-react'
import { islandDiscoverableCount } from '@/data/objects'
import { IslandSwitcher } from '@/components/layout/IslandSwitcher'
import { useActiveDiscoveries, useActiveIsland } from '@/store/game-store'
import { summariseProgress } from '@/game/discovery/discovery'

export interface TopBarProps {
  onOpenSettings: () => void
  openSettingsLabel: string
}

/** Persistent header: brand, island switcher, live progress, settings trigger. */
export function TopBar({ onOpenSettings, openSettingsLabel }: TopBarProps) {
  const island = useActiveIsland()
  const discoveries = useActiveDiscoveries()

  const { found, total, ratio } = summariseProgress(discoveries, islandDiscoverableCount(island))

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-4">
      <div className="tw-panel pointer-events-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-base font-bold text-cream"
        >
          TW
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm leading-tight font-bold text-deep sm:text-base">
            TinyWorld
          </p>
          <p className="truncate text-xs leading-tight text-muted" data-testid="island-name">
            {island.name}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <IslandSwitcher />

        <div className="tw-panel flex items-center gap-2 px-3 py-2">
          <div
            className="h-2 w-16 overflow-hidden rounded-full bg-forest/15 sm:w-24"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={found}
            aria-label="Discovery progress"
          >
            <div
              className="h-full rounded-full bg-leaf transition-[width] duration-500"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-deep tabular-nums">
            {found}/{total}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={openSettingsLabel}
          className="tw-panel grid size-10 place-items-center text-deep transition hover:bg-sun/40 active:scale-95"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
