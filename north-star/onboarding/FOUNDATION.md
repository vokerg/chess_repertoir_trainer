# Onboarding and Data Lifecycle Foundation

Last updated: 2026-07-28

This document records stable agreements for program #147. It describes target direction rather than claiming that the current product already behaves this way.

## 1. Product premise

Onboarding is a **progressive chess-data preparation experience**, not a multi-step form that must be completed before the application becomes usable.

The user should be able to:

- understand the product loop in a friendly introduction;
- connect at least one supported public chess account;
- accept a safe, useful initial preparation recipe;
- receive results progressively;
- navigate elsewhere while work continues;
- return from another route or session without losing context;
- understand which capabilities are ready and which need more prepared evidence;
- expand, pause, retry, reset, or skip optional work.

The system prepares and explains. The user retains control over scope and expansion.

## 2. Default initial recipe

The provisional product default is:

- one selected Lichess or Chess.com account;
- standard chess only;
- blitz and rapid only;
- the most recent three months;
- import first;
- index and assign openings before engine analysis;
- progressive preparation in bounded waves;
- optional expansion to older history or broader scope later.

The exact interpretation of “three months,” rated/unrated policy, multi-account defaults, and wave size belongs to ONB-001, ONB-002, ONB-003, and ONB-007. No implementation should hardcode an unresolved interpretation.

## 3. Time to first value outranks time to full completion

The program optimizes these milestones in order:

1. account accepted and preparation durably started;
2. recent games visible;
3. first indexed/opening-aware evidence visible;
4. a representative indexed sample available;
5. first analysed evidence available;
6. the default recipe complete;
7. optional historical expansion complete.

A user should not wait for all selected games to be analysed before seeing useful product value.

## 4. Server-side state is authoritative

Onboarding and preparation state must be persisted on the server. It must not depend on:

- one browser tab;
- local component state;
- a long-lived HTTP request;
- client-side processing;
- the user staying on the onboarding route.

Web and future mobile consumers should read the same lifecycle and readiness contract.

## 5. Existing durable imported-game jobs remain the execution foundation

The current PostgreSQL-backed `JobRun`/`JobTask` worker already owns:

- per-game work;
- priority;
- durable claims;
- active-game fencing;
- cancellation;
- retry;
- stale recovery;
- process restart;
- task and run progress.

The onboarding program should reuse it for indexing and analysis. It must not add Redis, a hosted queue, a generic workflow engine, or a second imported-game executor without demonstrated necessity.

A small parent preparation/orchestration aggregate is justified if it is required to express user-visible stages, bounded waves, dependencies, re-entry, and expansion. That aggregate must coordinate existing jobs rather than duplicate execution.

## 6. Import is a separate account-level concern

Provider import cannot be treated as just another imported-game task because the games do not exist yet.

The target design must distinguish:

- bounded initial import;
- normal forward incremental synchronization;
- historical backfill.

Historical backfill must not corrupt the forward high-water cursor. Large provider imports must be durable and resumable rather than requiring an HTTP request to stay open.

## 7. Indexing precedes analysis

Indexing is engine-free and also performs missing-opening assignment in the current processing service. It should be the first preparation stage because it unlocks useful navigation and aggregate evidence more cheaply than full engine analysis.

Index and analysis should remain separately observable even if a combined `PROCESS_GAMES` action continues to exist for other workflows.

## 8. Readiness is evidence-based

A page or insight is not simply “enabled” or “disabled.” The API should expose the evidence coverage relevant to it, such as:

- imported games;
- indexed games;
- named/classified opening coverage;
- analysed games;
- analysis percentage;
- sample/evidence grade;
- missing or failed preparation.

The UI should explain partial evidence without presenting unfinished analysis as complete.

## 9. Progress must be truthful

Exact counts and stage states are preferred:

- imported;
- selected;
- indexed;
- analysed;
- queued;
- running;
- failed;
- skipped;
- remaining.

An ETA must not be shown until ONB-007 demonstrates a defensible estimate policy. Indeterminate provider activity and exact task progress may coexist.

## 10. Destructive actions are domain operations

Purge, un-index, un-analyse, account deletion, and user deletion are not raw table-delete buttons.

Every destructive action requires:

- explicit retained/deleted/recomputed semantics;
- active-worker coordination;
- preview counts;
- authorization;
- idempotency;
- audit;
- bounded transactions where necessary;
- tests for cascades and races.

## 11. Shared chess analysis has a separate lifecycle

Deleting imported games removes account-owned game rows and ply references but intentionally may retain shared `Position` and `PositionAnalysis` data for reuse.

Orphan shared-position cleanup is a separate database maintenance operation. It must never delete course `MoveNode` rows, which belong to a different model.

## 12. Administrator access is not hardcoded application data

No administrator password or bearer secret belongs in source control or the normal web bundle.

The preferred initial direction is to reuse authenticated Clerk identity with a server-side environment allowlist of administrator subjects, with a dev-only equivalent for local work. ONB-005 must validate that direction and define any temporary alternative and its removal boundary.

All administrator mutations are auditable.

## 13. Visual-program boundary

This program owns behavior, states, contracts, and functional composition.

Visual Transformation #133 owns final product-wide:

- visual treatment;
- responsive polish;
- accessibility review;
- consistent empty/error states;
- motion and presentation.

The two programs must not produce competing onboarding flows. The visual program consumes the stable functional contract.

## 14. Repertoire Builder boundary

Onboarding prepares the player's evidence and introduces relevant product capabilities. It does not:

- generate a repertoire automatically;
- choose repertoire moves;
- mutate courses as an onboarding side effect;
- duplicate Player Chess Profile logic;
- duplicate Repertoire Builder sessions.

Prepared evidence and onboarding goals may later provide defaults or entry points for the Repertoire Builder program.

## 15. Delivery philosophy

Advance through small, reviewable deliveries:

1. resolve lifecycle and data invariants;
2. make import durable and bounded;
3. add progressive orchestration;
4. expose server-side readiness;
5. build the functional web flow;
6. add operator diagnostics;
7. add destructive operations only after their invariants are approved;
8. apply final visual/accessibility polish through the visual program.

Unknowns with destructive or operational consequences must not be decided incidentally inside UI work.
