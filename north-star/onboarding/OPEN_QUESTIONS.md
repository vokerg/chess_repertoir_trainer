# Onboarding and Data Lifecycle Open Questions

Last updated: 2026-07-29

Every material question has one owning task. Other tasks may contribute evidence but must not silently finalize it.

## ONB-001 / #148 — Lifecycle and product contract

Resolved by `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`:

- the default range is a fixed inclusive UTC date-only three-calendar-month snapshot;
- rated and unrated standard blitz/rapid games are included;
- a preparation run is created only when the user accepts a concrete recipe;
- skip dismisses guidance and does not cancel accepted work;
- user disposition is `PENDING`, `COMPLETED`, or `SKIPPED`, while active/new/returning/reset are derived or commanded;
- core completion requires terminal bounded import and indexing with at least one indexing success, not full analysis;
- readiness is feature-specific and evidence-based;
- `/home` remains signed-in entry, `/onboarding` is resumable, direct protected navigation is preserved;
- Home and clients consume a server-owned projection and allowed actions;
- existing users are adopted as completed during migration.

No ONB-001-owned product-contract question remains open.

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
- Which import counters have a fixed denominator and may expose a percentage?

Consumed ONB-001 decisions:

- bounded initial mode uses the fixed three-calendar-month recipe snapshot;
- standard blitz/rapid includes rated and unrated;
- import starts only after explicit recipe acceptance;
- `NO_RECENT_GAMES` must be represented deterministically rather than silently completing.

## ONB-003 / #150 — Preparation orchestration

Resolved by ONB-001:

- the aggregate is a repeatable user-owned `DataPreparationRun`;
- at most one non-terminal run exists per user;
- index and analysis are separate stages;
- analysis is not a core onboarding-completion gate;
- skip is separate from pause/cancel;
- Home/job-panel ownership boundaries are fixed.

Still owned by ONB-003:

- What exact Prisma model and lifecycle-status vocabulary implement `DataPreparationRun`?
- Separate JobRuns per wave or one JobRun with checkpoints?
- How many queued waves may exist?
- What exact source/priority values are used?
- Can indexing pipeline before import completion?
- How is multi-account expansion ordered?
- How does parent pause/cancellation propagate and acknowledge active work?
- How are terminal child runs reconciled after dismissal/retention cleanup?
- How are failed games retried without duplicating completed work?
- How does the preparation projection consume settled-game events without duplicating job state?
- How is the one-active-run invariant enforced under concurrency?

## ONB-004 / #151 — Destructive lifecycle

- Exact model matrix for purge, delete account, un-index, un-analyse, and delete user.
- Must un-index always include un-analyse?
- Which tags are analysis-derived and how are they cleared/rebuilt?
- What happens to tactical feedback and scenario sessions after un-analysis?
- What happens to AI reviews?
- Is provider opening provenance required before index reset?
- How is active-work cancellation acknowledged before deletion?
- Are large deletes one transaction or bounded action steps?
- How are import/job/preparation histories retained for audit?
- What user-facing self-service subset is safe?
- Which destructive operations explicitly reset onboarding disposition, and which retain completion?

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

Consumed ONB-001 decisions:

- current product may show exact stages/counts and fixed-denominator percentages only;
- ETA and qualitative completion promises remain disabled;
- visible wave size is not the worker scheduling slice.

## ONB-008 / #193 — Disposition and readiness implementation

- Final physical split between user disposition and preparation aggregate after ONB-003.
- Exact readiness contract enum names and evidence payload size.
- Polling/cache policy for the read projection.
- Migration mechanism that adopts existing users while new users begin pending.

## ONB-009 / #194 — Lifecycle commands

- Exact route grouping after import/preparation implementation endpoints exist.
- Idempotency key and duplicate-command response policy.
- Expansion command shape for older history, bullet, and additional accounts.
- Whether explicit no-data “finish without games” is a completion or skip reason in persistence.

## ONB-010 / #195 — Functional Angular experience

- Which then-current transformed shared primitives are the implementation base?
- Whether Home hosts the complete pre-core experience or links to `/onboarding` at compact widths.
- Product polling cadence after ONB-008/009 performance evidence exists.
- Exact handoff of final responsive/accessibility polish to #133.

## Cross-program

- Which Visual Transformation branch/PR becomes the base for ONB-010 Angular work?
- Does #133 remain one final polish issue or receive an ONB integration subtask?
- Which Player Chess Profile branch state is canonical when ONB-008 implements readiness?
- Which Repertoire Builder entry point should be offered after approved evidence exists?
- Native mobile onboarding is a later consumer of the server contract; when is that task allocated?