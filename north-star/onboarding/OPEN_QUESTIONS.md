# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-07-28

Every material question has one owning task. Other tasks may contribute evidence but must not silently finalize it.

## ONB-001 / #148 — Lifecycle and product contract

- Is the recent period a rolling 90-day window or subtract-three-calendar-months date range?
- Are unrated games included by default?
- What exact event creates an onboarding run?
- Can the user skip account import, and what signed-in destination follows?
- What distinguishes onboarding completion from later preparation expansion?
- What is the first-insights gate: first indexed game, minimum sample, first wave, or feature-specific readiness?
- Which destinations are offered at import, indexed, and analysed stages?
- How does routing integrate with the Visual Transformation `/home` plan?
- What is the compact re-entry behavior after skip, failure, or completion?
- Which lifecycle state is stored versus derived?

## ONB-002 / #149 — Import

- Extend `ImportRun` or add `AccountImportRequest`?
- What worker claim/heartbeat model is reused or introduced for account-level work?
- How is Lichess bounded initial import checkpointed?
- How is Chess.com archive-month progress checkpointed?
- How is forward high-water separated from historical coverage frontier?
- How are exact no-game date intervals represented?
- How are newly inserted IDs handed to preparation without unbounded arrays?
- When are account rating stats recomputed?
- What bounded write strategy replaces per-game existence N+1 if needed?
- What is provider cancellation behavior?

## ONB-003 / #150 — Preparation orchestration

- `OnboardingRun` or general `DataPreparationRun`?
- Separate JobRuns per wave or one JobRun with checkpoints?
- How many queued waves may exist?
- What exact source/priority values are used?
- Can indexing pipeline before import completion?
- How is multi-account ordering handled?
- How does parent cancellation propagate?
- How are terminal child runs reconciled after dismissal?
- How are failed games retried without duplicating completed work?
- How does Angular consume settled-game events without duplicating job state?

## ONB-004 / #151 — Destructive lifecycle

- Exact model matrix for purge, delete account, un-index, un-analyse, and delete user.
- Must un-index always include un-analyse?
- Which tags are analysis-derived and how are they cleared/rebuilt?
- What happens to tactical feedback and scenario sessions after un-analysis?
- What happens to AI reviews?
- Is provider opening provenance required before index reset?
- How is active-work cancellation acknowledged before deletion?
- Are large deletes one transaction or bounded action steps?
- How are import/job histories retained for audit?
- What user-facing self-service subset is safe?

## ONB-005 / #152 — Administration

- Clerk subject allowlist, role/claim, or temporary separate secret?
- How is dev-single-user admin explicitly configured?
- Does the existing Angular app suffice?
- What audit model and retention are required?
- How does preview bind to execution and reject stale state?
- Which operator actions require re-authentication or two-step approval?
- What user/course metadata belongs in the first read-only release?
- What database-footprint metrics are feasible and cheap?
- What route-level rate/abuse controls are needed?

## ONB-006 / #153 — Shared-position cleanup

- Exact orphan predicate and all dependent Position relations.
- Grace period length.
- Batch size and ordering.
- Lock/transaction pattern under concurrent indexing.
- Manual-only or eventually scheduled.
- How is reclaimed storage estimated?
- Can cleanup run while analysis reads Position rows?
- What progress/cancel model is used?
- What tests prove no referenced Position is removed?

## ONB-007 / #154 — Capacity and progress

- Representative fixture/account profiles.
- p50/p90 import/index/analysis timings.
- Engine startup overhead and potential reuse.
- First-value target budget.
- Default wave size.
- Maximum queued backlog.
- Minimum evidence for ETA.
- Scaling trigger for separate workers or replicas.
- Database/provider safe load-test method.
- Which stalled-work thresholds appear in admin diagnostics?

## Cross-program

- Which Visual Transformation branch/PR becomes the base for onboarding Angular work?
- Does #133 remain one final polish issue or receive an ONB integration subtask?
- Which Player Chess Profile branch state is canonical when ONB-001 defines readiness?
- Which Repertoire Builder entry point should be offered after enough evidence exists?
- Is native mobile onboarding in the initial release or a later consumer of server state?
