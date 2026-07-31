# RB-013 — Support repertoire personas and profile overrides

Status: REVIEW

Priority: P1

Order: 80

Delivery class: Dual-use

Planning maturity: Implemented bounded profile-to-Builder composition

GitHub issue: `#101`

Claimed by: `vokerg` / ChatGPT agent session

Claim PR: `#231`

Claim branch: `rb-013/issue-101-profile-persona-claim`

Implementation branch: `rb-013/issue-101-profile-persona-launch`

Implementation PR: `#232`

Claimed at: 2026-07-30

Claim scope: Deliver a bounded profile-to-Builder v1 using the integrated RB-004/RB-005 profile response and the existing RB-006 target provenance/override algebra. Add an explicit Player Chess Profile launch into Builder, deterministic and inspectable profile-derived setup suggestions, immutable profile provenance, editable/rejectable defaults, exact `overriddenFields` behavior, focused Angular/contract tests, and North Star documentation. Excludes course/line persistence, automatic course duplication, hidden persona inference, profile recalculation inside Builder, ranking-policy changes, AI narrative, and trap data.

## Outcome

Allow a player to use profile-derived suggestions as a starting point while deliberately creating one or more repertoires with different intents.

Examples:

- a solid `1.d4` course;
- a sharp `1.d4` course;
- a dubious practical weapon;
- a low-theory blitz course;
- a classical course intended to scale upward;
- a future trap-oriented course.

## Why this task exists

A player profile is descriptive, not destiny. The product needs an explicit mechanism for turning profile conclusions into optional defaults, recording deliberate overrides, and maintaining multiple course intents without presenting them as contradictions or errors.

## Verified repo anchors

- RB-004/RB-005 profile contracts and `/progress/profile` UI are integrated on `main` through the merged RB-004/RB-005 claim stacks;
- RB-006 already defines `PLAYER_PROFILE` default provenance and exact `overriddenFields` validation;
- the Builder setup dialog already exposes editable persona, speed, population, theory, coverage, and side controls;
- route-query launch parsing already exists for exact Course review entry points;
- candidate evidence already keeps profile fit and target fit separate;
- RB-011 course apply remains authoritative and is not changed by this slice.

## Dependencies

Satisfied for the bounded v1:

- RB-004 profile calculation is present on `main` through PRs #136 and #135;
- RB-005 profile experience is present on `main` through PRs #139, #138, and #135;
- RB-006 target contract is complete through PR #157.

Repository and issue closure state for RB-004/RB-005 remains stale and must be reconciled separately; it does not block use of their integrated runtime contracts.

## Delivered scope

- deterministic suggestions are derived independently for eligible White and Black profile evidence;
- a side requires at least five classified opening-group games before its Builder action appears;
- the strongest weighted opening character maps to the existing Balanced, Solid, Aggressive, or Surprise preset;
- profile speed, dominant theory burden, visible persona coverage default, provenance version, generation time, classification version, side, and evidence count travel through one bounded route snapshot;
- route input expires after 24 hours and malformed, unsupported, future-dated, or stale input falls back safely;
- the Builder displays profile source evidence and an explicit standard-default rejection action;
- existing setup controls remain the only effective target editor;
- profile-derived `speedPreset`, `objective`, and `coverage` use RB-006 `PLAYER_PROFILE` provenance;
- population remains independent `PEER_RESOLUTION` or explicit manual evidence;
- manual differences appear through exact RB-006 `overriddenFields`;
- changing side removes profile provenance while preserving the values as manual choices;
- persona cards expose preferred character, soundness, risk, complexity, theory, and coverage details;
- profile launch composition is exposed through the Repertoire Builder public boundary;
- no API, profile formula, ranking, reducer, course preview/apply, writer, persistence, migration, background job, AI, or trap behavior changed.

## Out of scope

- opening classification mechanics;
- trap data implementation;
- candidate ranking policy changes;
- automatic course duplication without review;
- one permanent user persona;
- LLM-generated persona labels as factual state;
- Prisma migration or persisted course/line target metadata;
- automatic profile recalculation or background synchronization;
- changing RB-011 preview/apply or course-writer behavior.

## Decisions for this bounded v1

- Personas remain transparent Builder target presets, not factual player labels.
- The profile produces one deterministic suggested setup per eligible side; it does not create a saved persona.
- Profile provenance is retained only in the route-local RB-006 target snapshot.
- Manual Builder edits always win and are recorded as overrides against immutable suggested values.
- Rejecting the suggestion restores standard Builder setup and removes profile defaults.
- Changing side rejects the side-specific profile inference and removes profile provenance.
- Personas did not become course metadata in v1.
- Persistent course intent and library presentation remain deferred until route-local use demonstrates value.

## Acceptance status

- A profile-derived default can be accepted, edited, or rejected.
- Manual target choices take precedence without altering the factual profile.
- Persona labels expose their underlying preferred characters, soundness, risk, theory, complexity, and coverage values.
- Candidate evidence continues to show profile fit and selected-target fit separately because no candidate-policy path changed.
- Different Builder launches from the same profile can choose different personas without mutating the profile or each other.
- A future traps persona can be added without changing the override model.
- Malformed, incomplete, unsupported, future-dated, or stale profile launch data falls back safely to ordinary Builder setup.
- Tests cover default acceptance, partial override, complete rejection, alternate-persona creation, side-change rejection, and legacy launch compatibility.

## Validation

Implementation head `bf37e06ca20f157d2e6af16d2ad294263fab6df8`, tested against current `main` through merge commit `64853bc48d20c1b954434ab21d4cd3ba2b4b2ea1`, passed complete repository CI run `30583815998` / #1690 on 2026-07-30:

- lint;
- repository build;
- generated opening-classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit;
- complete API and Angular tests.

Focused validation covers side-specific suggestion derivation, evidence eligibility, strict and expiring route state, safe malformed fallback, initial-position/return routing, accepted defaults, separate peer provenance, partial overrides, alternate personas, side-change provenance removal, standard setup isolation, profile action composition, setup-dialog rejection, and Course-ending/Opponent-gap compatibility.

Hands-on authenticated review against populated personal data and desktop/mobile visual review remain review activities.

## Completion updates

Personas became route-local target presets only. They did not become course or line metadata.

No new retained-intent or library-presentation task is created. Such a task should require demonstrated post-apply value rather than being added speculatively.

## Completion

Report: `reports/RB-013-2026-07-30-profile-persona-launch.md`

Review PR: `#232`

Moved to review: 2026-07-30
