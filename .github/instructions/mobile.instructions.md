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
- SQLite owns downloaded content and future durable sessions/attempts. Keep every query scoped by the active Clerk user and never use AsyncStorage for course content, sessions, or attempts.
- Activate course downloads through a staging revision and one exclusive transaction. A failed update must leave the previous active revision usable.
- Bearer tokens come from Clerk at request time and remain in secure Clerk/Expo storage; never persist them in SQLite or diagnostics.
- Keep synchronization orchestration feature-local until multiple independent workflows justify a shared abstraction.
- Log meaningful lifecycle and workflow failures through the bounded mobile diagnostics logger; do not stream pointer or drag diagnostics across the DOM bridge.
- Validate with `npm run lint:mobile`, `npm run test:mobile`, `npm run build:mobile`, and a physical-device board check when board behavior changes.
