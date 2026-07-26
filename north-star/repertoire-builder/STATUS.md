# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation created; user review pending.

**Implementation state:** no repertoire-builder feature implementation has been started by this program.

**Foundation branch:** `north-star/repertoire-builder-foundation`

**Base at creation:** `main` at `e90aab2b87282577f42684b80b088163320e79b3`.

## Completed in this setup

- [x] Recorded the human-controlled repertoire-builder premise.
- [x] Separated intrinsic opening, target population, player profile, and repertoire target.
- [x] Recorded arbitrary speed combinations and controlled General mode.
- [x] Recorded the multi-account level requirement and left its formula open.
- [x] Recorded opening classification as an independent dependency with intentionally blank implementation planning.
- [x] Defined the Player Chess Profile as a standalone and north-star capability.
- [x] Recorded profile override and multiple repertoire personas.
- [x] Recorded visual move choice as required while leaving exact UX open.
- [x] Recorded optional LLM and vague traps research without making them core dependencies.
- [x] Added ordered tasks, claim rules, report templates, and queue governance.

## Known parallel or external work

### Population explorer

The user stated that speed- and rating-filtered Lichess top-move extraction is being implemented in parallel. This workspace does not claim or duplicate that implementation. RB-001 begins with inspection and integration of the actual branch or PR.

### Rating normalization

At foundation creation, PR #76 contains a versioned cross-pool rating-normalization contract and helpers. It is not part of the inspected `main` base. Tasks must verify its merge or branch state before depending on it.

### Visual transformation

A separate visual-transformation program exists on its own branch. Repertoire-builder UX work should inspect and coordinate with the current visual system when RB-008 or production UI tasks begin.

## Active claims

None.

Claims belong in individual task files and must become visible on the shared base before substantive work.

## Recommended next coordination

1. Review and approve or revise this foundation.
2. Identify the branch or PR for the parallel population explorer and update RB-001.
3. Resolve the integration state of rating-normalization PR #76 before RB-002.
4. Allow RB-003 opening-classification work to proceed independently when its own planning begins.
5. Consider RB-008 visual discovery early enough to influence contracts, but do not build production UI from assumptions.

## Validation

Performed:

- inspected root repository instructions and documentation rules;
- inspected current course, opening-analysis, master-evidence, tagging, and rating/account patterns during the preceding design discussion;
- inspected the visual-transformation planning and report conventions;
- verified the foundation branch was created from `main`;
- reviewed relative links and task IDs within this workspace.

Not performed:

- application build;
- unit or integration tests;
- lint;
- architecture checks;
- browser validation.

Reason: this setup is documentation-only and changes no runtime application behavior.

## Current risks

- population explorer contract is unknown until its parallel implementation is inspected;
- rating normalization is not yet on the foundation base;
- opening classification is a required but intentionally undefined dependency;
- visual choice design may change API and state assumptions;
- multi-account level and confidence formulas need empirical validation;
- the task queue is an initial ordering and should be revised through completion reports.

## Update protocol

After every claimed task or meaningful program session:

1. update this status;
2. update the task file;
3. add or update the required report;
4. assess queue priority and dependencies;
5. update roadmap, decisions, and open questions where evidence changed them.
