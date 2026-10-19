name: Bug report
description: Something in TinyWorld does not work as described.
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for the report. Please fill in what you can — a precise report
        is much faster to act on than a vague one.

  - type: textarea
    id: what-happened
    attributes:
      label: What happened
      description: What did you do, what did you expect, and what happened instead?
      placeholder: I pressed E next to the watchtower and nothing happened.
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Open the journal
        2. Click "Read the signpost"
        3. Observe…
    validations:
      required: true

  - type: input
    id: environment
    attributes:
      label: Environment
      description: Browser, version, operating system, and input method (mouse, keyboard, touch).
      placeholder: Firefox 133 on Windows 11, desktop
    validations:
      required: true

  - type: input
    id: graphics
    attributes:
      label: Graphics quality setting
      placeholder: Low / Medium / High

  - type: textarea
    id: verify
    attributes:
      label: Output of `npm run verify`
      description: Paste the result if it fails.
      render: shell

  - type: textarea
    id: screenshot
    attributes:
      label: Screenshot
      description: Drag an image here if the problem is visual.

  - type: checkboxes
    id: checks
    attributes:
      label: Additional context
      options:
        - label: This is an accessibility problem (screen reader, keyboard only, contrast)
        - label: The problem only happens on a touch device
        - label: The problem only happens at a specific graphics quality