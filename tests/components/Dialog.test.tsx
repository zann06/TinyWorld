import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          onClose()
        }}
        title="Test dialog"
        description="A description for the dialog."
      >
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Hidden">
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes dialog semantics with an accessible name and description', () => {
    render(
      <Dialog open onClose={() => {}} title="Accessible dialog" description="More detail here.">
        <button type="button">Action</button>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Accessible dialog' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('More detail here.')
  })

  it('moves focus to the dialog container so the title is announced', async () => {
    render(
      <Dialog open onClose={() => {}} title="Focus test">
        <button type="button">Inside</button>
      </Dialog>,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Focus test' })).toHaveFocus()
    })
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose} title="Escapable">
        <button type="button">Inside</button>
      </Dialog>,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()

    render(
      <Dialog open onClose={() => {}} title="Trap">
        <button type="button">One</button>
        <button type="button">Two</button>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Trap' })
    const closeButton = screen.getByRole('button', { name: /close/i })
    const one = screen.getByRole('button', { name: 'One' })
    const two = screen.getByRole('button', { name: 'Two' })

    // Focus order inside the dialog: close button, One, Two — and then it wraps.
    two.focus()
    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.tab()
    expect(one).toHaveFocus()

    await user.tab()
    expect(two).toHaveFocus()

    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(two).toHaveFocus()

    expect(dialog).toBeInTheDocument()
  })

  it('returns focus to the trigger when closed', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={() => {}} />)

    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: /close/i }))

    await waitFor(() => {
      expect(trigger).toHaveFocus()
    })
  })
})

describe('ConfirmDialog', () => {
  it('requires an explicit choice — Escape does not confirm or dismiss silently', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Reset progress?"
        description="This cannot be undone."
        confirmLabel="Reset"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('hides the close button for destructive confirmations', () => {
    render(
      <ConfirmDialog
        open
        title="Reset progress?"
        description="This cannot be undone."
        confirmLabel="Reset"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('calls the confirm handler', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Reset progress?"
        description="This cannot be undone."
        confirmLabel="Reset"
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorBoundary', () => {
  function Boom(): React.JSX.Element {
    throw new Error('Kaboom')
  }

  it('shows a recoverable error state instead of a blank page', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })
})
