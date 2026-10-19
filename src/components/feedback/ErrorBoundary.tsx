import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Shown above the retry button. */
  title?: string
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors in the subtree and shows a recoverable UI
 * instead of unmounting the whole application to a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the diagnostic in the console; the UI only shows a calm recovery card.
    console.error('TinyWorld render error:', error, info.componentStack)
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    const { children, fallback, title = 'Something went wrong' } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)
      return (
        <div
          role="alert"
          className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-panel bg-cream px-6 py-10 text-center"
        >
          <TriangleAlert size={34} aria-hidden="true" className="text-[#a8442a]" />
          <div>
            <h2 className="text-xl font-bold text-deep">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              TinyWorld hit an unexpected problem. Your saved discoveries are safe. Try again to
              reload this part of the world.
            </p>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-leaf active:scale-95"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      )
    }

    return children
  }
}
