import { Box } from 'lucide-react'
import { ObjectDirectory } from '@/features/discoveries/ObjectDirectory'

export interface WebGLUnavailableProps {
  reason: string | null
}

/**
 * Shown when WebGL 2 cannot start.
 *
 * The 3D world is impossible, but the product is not: every landmark's text,
 * category and discovery state remains readable and usable from the DOM.
 */
export function WebGLUnavailable({ reason }: WebGLUnavailableProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-deep tw-scroll">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 sm:p-8">
        <div
          role="alert"
          className="tw-panel-deep flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center"
        >
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-sun/20 text-sun"
          >
            <Box size={22} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-cream">3D view unavailable</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-dark">
              {reason ?? 'This browser cannot start WebGL 2.'} You can still browse every landmark
              and track your discoveries using the directory below.
            </p>
          </div>
        </div>

        <ObjectDirectory headingLevel={2} />
      </div>
    </div>
  )
}
