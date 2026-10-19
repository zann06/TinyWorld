name: Feature request
description: Suggest an improvement to the TinyWorld exploration experience.
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: What problem would this solve?
      description: Describe the experience you were trying to have, not only the change you imagine.
    validations:
      required: true

  - type: textarea
    id: proposal
    attributes:
      label: Proposed change
    validations:
      required: true

  - type: dropdown
    id: area
    attributes:
      label: Which part of the game?
      options:
        - World and art
        - Exploration and movement
        - Landmarks and interactions
        - Discovery and progression
        - Interface and accessibility
        - Photo mode
        - Performance
        - Something else
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives you considered

  - type: checkboxes
    id: scope
    attributes:
      label: Scope check
      options:
        - label: This fits the existing single-island scope
        - label: This would need a new scene or a second island
        - label: Not sure