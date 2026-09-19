# Course and training performance measurements

Measured on 2026-07-12 against the configured remote PostgreSQL development database. Timings include network latency and small deterministic fixtures; structural request and query counts are the primary regression constraints.

## Phase 1

- Chapter stats: one recent-attempt query for two lines; five rows returned in 127 ms.
- Mixed weak/untrained filtering: one recent-attempt query; five rows returned in 68 ms.
- Selected-line preparation: one query for two lines and two move nodes, 279 ms.
- The bounded loader returned exactly the newest five of seven scored attempts.

## Phase 2

- Library primary data changed from a course list, one stats request per course, and selected hierarchy requests to one catalog request.
- One-course/one-line catalog fixture: one attempt query and 605 ms total.
- Course detail changed from four initial requests to one overview request.
- One-course/one-line overview fixture: one attempt query and 403 ms total.

## Phase 3

- Marathon initialization prepares the selected scope once. A measured one-line preparation query took 471 ms.
- Two continuation calls performed no line reconstruction query. Total time, including ownership validation and session/attempt writes, was 512 ms and 304 ms.
- In-memory runs expire after 30 minutes of inactivity and are capped at 1,000 runs.

## `TrainingSublineAttempt.movesJson` audit

Runtime inspection found writes when an attempt starts and no historical read path. Database aggregates for 530 rows were:

- average JSON storage: 1,091 bytes;
- p95 and p99: 1,806 bytes;
- table including indexes: 1,286,144 bytes;
- indexes: 393,216 bytes.

The column remains an immutable historical snapshot. Summary reads exclude it; no storage migration or persistent `LineSubline` projection was introduced.
