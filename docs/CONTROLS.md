# Controls

## Desktop

| Input                         | Action                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| `W` `A` `S` `D` or arrow keys | Walk. Movement is relative to the camera.                           |
| Drag anywhere on the world    | Look around (orbit the camera).                                     |
| Mouse wheel                   | Zoom out, from close-up (9 units) to a wide island view (62 units). |
| Click a landmark              | Select it and open its details.                                     |
| Click empty ground            | Clear the selection.                                                |
| `E`                           | Interact with the nearest landmark. Also opens its details.         |
| `Esc`                         | Close the open detail panel or dialog.                              |
| `F`                           | Enter or leave photo mode.                                          |
| `J`                           | Open the discovery journal.                                         |
| Tab / Shift+Tab               | Move focus through every control.                                   |
| Enter or Space                | Activate the focused control.                                       |

Movement is blocked while a dialog is open and while the pointer is inside a
text field, so typing in the search box never walks your character.

## Mobile and tablet

| Input                                | Action                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Drag the stick (bottom left)         | Walk. The stick is analog, so a short drag is a slow walk. |
| Drag the world (anywhere else)       | Look around.                                               |
| Pinch                                | Zoom.                                                      |
| Tap a landmark                       | Select it and open its details.                            |
| Tap the action button (bottom right) | Interact with the nearest landmark.                        |
| Tap the journal button               | Open the discovery journal.                                |
| Tap the camera button                | Enter photo mode.                                          |

Touch controls appear automatically on devices with a coarse pointer. The
object detail panel becomes a bottom sheet that can be dismissed by tapping the
scrim.

## Without a mouse or a keyboard

Every important action has an equivalent that does not depend on 3D input:

- The **island directory** lists all ten landmarks with their full text,
  category and discovery status, and can be searched and filtered.
- Each directory card can **select** a landmark in the world or perform its
  interaction directly.
- The **discovery journal** is the same directory, opened as a modal.
- Selecting a landmark from the directory also moves the camera to frame it.

There is a skip link at the top of the page that jumps straight to the
directory.

## Photo mode

| Input                    | Action                                                   |
| ------------------------ | -------------------------------------------------------- |
| `F` or the camera button | Enter / leave photo mode.                                |
| Drag                     | Look around.                                             |
| Zoom + / Zoom −          | Step the camera in or out.                               |
| Rotate                   | Turn the view 45°.                                       |
| Hide UI                  | Remove all interface chrome for a clean frame.           |
| Save PNG                 | Download the current frame as a PNG.                     |
| `X` or the close button  | Return to exploration with the previous camera restored. |

Photo mode reads the live WebGL framebuffer. It is not a screenshot of the app
window, so the interface is genuinely absent from the exported image.

## Settings

| Setting                   | Effect                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Graphics quality          | Low / Medium / High. Changes pixel ratio, shadows and decoration density. Applies immediately. |
| Time of day               | Day / Dusk / Night. Transitions smoothly.                                                      |
| Cycle time of day         | Slowly rotates between the three presets.                                                      |
| Sensitivity               | Scales drag-look and touch-look speed.                                                         |
| Invert vertical look      | Flips the vertical look axis.                                                                  |
| Mute ambient sound        | Silences the synthesised soundscape.                                                           |
| Volume                    | Master volume, 0–100%.                                                                         |
| Reduce motion             | Disables camera easing and interface animation.                                                |
| Show heads-up display     | Hides the interface for screenshots.                                                           |
| Reset settings            | Restores defaults after confirmation.                                                          |
| Reset discovered progress | Clears all discoveries after confirmation.                                                     |

Settings and progress are stored in this browser only. There is no account and
no server.

## Accessibility

- All controls are reachable by keyboard, with a visible focus ring.
- Dialogs trap focus, close on `Escape`, and return focus to the button that
  opened them. Destructive confirmations do **not** close on `Escape` — they
  require an explicit choice.
- Secondary text uses a colour measured at 6.4:1 contrast against the cream
  panels (WCAG AA requires 4.5:1).
- `prefers-reduced-motion` is honoured on first run. An explicit setting always
  overrides the system preference.
- Discovery progress and object selection are announced through live regions.
- Automated axe-core checks run in CI against the world view, the settings
  dialog and the journal.
