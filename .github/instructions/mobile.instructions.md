---
applyTo: "apps/mobile/**/*"
---

# Native mobile changes

- Keep the React Native / Expo client independent from Angular UI and API implementation code.
- Import shared chess behavior through explicit mobile-safe exports such as `chess-domain/training`; do not import the broad `chess-domain` root from mobile.
- Import shared HTTP DTOs through feature exports such as `@chess-trainer/contracts/training` and `@chess-trainer/contracts/mobile-sync`; do not duplicate synchronization DTOs in mobile.
- Browser-only Chessground imports belong in `.dom.tsx` files. Native wrappers exchange small serializable semantic events with the DOM component.
- Keep promotion, drag interaction, legal destinations, and transient pending-board state inside the DOM component; the shared serializable reducer owns repertoire correctness, attempts, progression, completion, and review.
- Preserve immutable event IDs and native-side deduplication. After every accepted or rejected semantic move, supply the authoritative FEN and increment `positionVersion` so the board unlocks or snaps back.
- Do not use AsyncStorage for course content, sessions, or attempts. SQLite will own durable mobile application data when persistence is introduced.
- Do not add authentication, persistence, downloads, or synchronization abstractions before their rollout phase requires them.
- Log meaningful lifecycle and workflow failures through the bounded mobile diagnostics logger; do not stream pointer or drag diagnostics across the DOM bridge.
- Validate with `npm run lint:mobile`, `npm run test:mobile`, `npm run build:mobile`, and a physical-device board check when board behavior changes.
