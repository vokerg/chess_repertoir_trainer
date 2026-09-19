# Phase 0 manual board checklist

Record one result for every test on every mandatory physical device:

- `PASS`
- `PASS WITH OBSERVATION`
- `FAIL`
- `NOT TESTED`

A result with an observation must include the exact behavior, device, OS, and whether it affects the go/no-go decision.

## Build and offline packaging

- [ ] Install is a release/internal build, not an Expo development session.
- [ ] Launch once online, force close, enable airplane mode, and cold start.
- [ ] Board appears without a blank frame or remote resource error.
- [ ] Cburnett pieces appear correctly.
- [ ] Walnut square theme, rim, destinations, coordinates, and promotion UI appear correctly.
- [ ] No white WebView flash appears during normal updates.

## Basic rendering

- [ ] White orientation maps files and ranks correctly.
- [ ] Black orientation maps files and ranks correctly.
- [ ] Coordinates can be enabled and disabled.
- [ ] Last-move highlight is visible.
- [ ] Selected-square highlight is visible.
- [ ] Legal empty-square destinations use dots.
- [ ] Legal occupied-square destinations use rings.
- [ ] Check highlight is visible in the check fixture.
- [ ] Both automatic arrows are visible in the arrows fixture.

## Movement

- [ ] Tap-to-move works.
- [ ] Drag-and-drop works.
- [ ] Slow drag has no visible initial jump.
- [ ] Fast drag remains attached to the finger.
- [ ] Dropping outside legal destinations snaps back.
- [ ] Capture works and removes the captured piece.
- [ ] Kingside castling moves king and rook.
- [ ] Queenside castling moves king and rook.
- [ ] En passant removes the captured pawn.
- [ ] Disabled board allows no selection, drag, tap, or move event.

## Promotion

Run the white and black promotion fixtures.

- [ ] Promotion picker is aligned to the destination file in white orientation.
- [ ] Promotion picker is aligned to the destination file in black orientation.
- [ ] Queen promotion emits a UCI suffix `q`.
- [ ] Rook promotion emits a UCI suffix `r`.
- [ ] Bishop promotion emits a UCI suffix `b`.
- [ ] Knight promotion emits a UCI suffix `n`.
- [ ] No move event is emitted before a promotion piece is chosen.
- [ ] Picker cannot be bypassed by page scrolling or tapping outside the board.

## Native/DOM state boundary

- [ ] One legal move emits exactly one unique event ID.
- [ ] Board locks after emitting a move.
- [ ] Accept applies the authoritative FEN and unlocks the board.
- [ ] Reject restores the original FEN and unlocks the board.
- [ ] A rejected capture restores the captured piece.
- [ ] A rejected castle restores king and rook.
- [ ] A rejected promotion restores the pawn and removes the promoted piece.
- [ ] Applying an external move animates without recreating the board.
- [ ] Changing orientation does not recreate the mounted board.
- [ ] Changing coordinates, arrows, or movable state does not recreate the mounted board.

## Reliability

- [ ] Initialization count stays at `1` while the board remains mounted.
- [ ] Run `100 position updates`; the application completes without error.
- [ ] Run `100 same-FEN resets`; the application completes without error.
- [ ] Duplicate event count remains `0`.
- [ ] Error count remains `0`.
- [ ] Background and foreground the application ten times; board remains usable.
- [ ] Navigate away/reload the app and return; a fresh instance initializes cleanly.
- [ ] Rapidly switch scenarios and orientation; no stale promotion or pending move remains.

## Gesture and scrolling

- [ ] Starting a piece drag on the board does not scroll the native page.
- [ ] Starting a vertical gesture outside the board scrolls the native page.
- [ ] Tap-to-move remains reliable after page scrolling.
- [ ] Drag cancellation does not leave a ghost piece.
- [ ] Android back/foreground behavior does not leave the board locked.

## Visual comparison with web

Capture matching web and mobile screenshots for:

- [ ] Initial position.
- [ ] Selected square and legal destinations.
- [ ] Occupied destination ring.
- [ ] Last move.
- [ ] Check.
- [ ] Arrows.
- [ ] White promotion picker.
- [ ] Black promotion picker.
- [ ] Black orientation.

## Final per-device result

- Overall result:
- Blocking failures:
- Non-blocking observations:
- Screen recording or screenshot references:
- Tester:
- Date:
