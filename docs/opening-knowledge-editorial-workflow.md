# Opening Knowledge Editorial Workflow

Status: RB-025 research foundation

Last updated: 2026-08-06

## Purpose

This document defines how the project expands reviewed side-aware opening knowledge beyond the initial 25-rule pilot while keeping runtime deterministic, source-controlled and reviewable.

The workflow is designed for bounded family/subfamily batches. It does not create one record for every generated opening-book row and does not treat classification-rule matching as complete strategic knowledge.

## Coverage tiers

Coverage must be reported through distinct tiers rather than one headline percentage.

### Tier 0 — Identified

The opening is resolved and has at least one matched classification rule.

This tier answers *what opening is this?* It does not prove that strategic knowledge or every classification dimension is available.

### Tier 1 — Side-useful

For one side, knowledge contains:

- a strategic summary;
- at least one reviewed plan.

White and Black Tier-1 coverage are measured independently. This is the closest measure of immediate usefulness in Builder, which consumes the repertoire target side.

### Tier 2 — Editorially complete

Knowledge contains:

- concise description;
- longer description;
- White strategic summary and at least one White plan;
- Black strategic summary and at least one Black plan.

This is the existing global `AVAILABLE` state.

### Tier 3 — Classification-complete

For one side, classification contains:

- soundness;
- at least one character trait;
- theoretical status;
- theory burden;
- at least one role.

High-confidence Tier 3 is reported separately. Knowledge expansion does not silently change classification judgments to improve this metric.

## Coverage targets

Targets apply to both generated-book breadth and populated imported-game weighting.

### Initial scale milestone

- generated entries at Tier 2: at least 60%;
- unique opening names at Tier 2: at least 50%;
- generated entries at Tier 1: at least 70% for each side;
- imported-game weight at Tier 2: at least 80% when measured against a populated environment;
- imported-game weight at Tier 1: at least 85% for each side.

### Scale exit target

- generated entries at Tier 2: at least 80%;
- unique opening names at Tier 2: at least 75%;
- generated entries at Tier 1: at least 85% for each side;
- imported-game weight at Tier 2: at least 90%;
- imported-game weight at Tier 1: at least 92% for each side;
- unknown imported-game-weighted soundness or theoretical status: no more than 10% per side;
- low-confidence imported-game-weighted classification: no more than 15% per side.

These are planning targets, not runtime guarantees. A target must not be met by inventing generic prose, suppressing unknowns or broadening selectors beyond safe strategic inheritance.

## Prioritization inputs

Every batch proposal starts from both generated and imported-game audit outputs.

The deterministic priority score includes:

- unavailable global knowledge;
- partial global knowledge;
- missing descriptions, summaries and plans;
- independent White/Black Tier-1 gaps;
- unknown classification dimensions;
- low-confidence sides;
- unique-name breadth.

The score is then reviewed with explicit non-scored context:

- theoretical importance and prevalence outside the current imported corpus;
- transpositional centrality;
- Builder demand and observed course gaps;
- whether one broad family rule can safely cover many rows;
- whether narrow exceptions are required to prevent misleading inheritance;
- available reviewable sources and reviewer competence.

The score is editorial ordering evidence. It is never candidate ranking, engine evaluation or a claim that a family is objectively more important to chess.

## Batch size

A normal batch should contain:

- 5–12 broad family or subfamily rules;
- no more than 12 narrow line exceptions unless separately justified;
- representative common, rare and transpositional fixtures;
- a measurable expected gain in generated entries, unique names and imported-game weight where populated data is available.

A batch should be split when reviewers cannot assess each side, source and inheritance effect as one coherent change.

## Manifest lifecycle

Each batch uses `OpeningKnowledgeBatchManifest`.

### `DRAFT`

The selected families, baseline, expected gains, planned rules, sources and fixtures are proposed. No claim is made that prose or judgments are reviewed.

### `READY_FOR_REVIEW`

Selectors, intended inheritance, source list, regression fixtures and acceptance thresholds are complete enough for editorial review.

### `REVIEWED`

A named reviewer and review date are recorded. Planned runtime prose must still be implemented and validated through the normal rule/source registries.

### `APPLIED`

The runtime batch is integrated, the knowledge version is bumped, all planned rules are exercised and before/after audits meet the recorded acceptance thresholds.

Manifest validation prevents stale priority-policy identity, invalid baseline totals, missing registered sources, duplicate planned rule IDs, missing fixtures and reviewed/applied states without reviewer identity.

## Source policy

### Generated opening dataset

`lichess-org/chess-openings` supplies identity, ECO, move sequence and position metadata. It does not supply project strategic prose or objective soundness judgments by itself.

### Reference material

Trusted opening references may support editorial understanding and narrow factual checks. Their prose is not copied into runtime content. Reference-only sources remain provenance inputs rather than authorship claims.

### Project-original authorship

Every reviewed runtime statement and plan must cite a registered project-original source. Runtime wording is written or substantively rewritten by the project and reviewed in context.

### Engine evidence

Offline, versioned engine evidence may inform a separate soundness review or identify tactical exceptions. Engine output does not generate strategic prose and does not change classification inside a knowledge-only batch.

### Master and population evidence

Bounded master/population statistics may support theoretical-status or practical-priority research. Dataset, filters, sample size and capture date must remain reviewable. Frequency is not equivalent to soundness.

### Copyright boundary

Do not copy book, article, course, video, study or website prose. Sources may be consulted for facts and concepts; runtime text must remain project-original and concise.

## Editorial review checklist

For every planned rule:

1. Confirm the selector matches the intended generated entries and no unrelated family.
2. Confirm broad family advice is valid for both sides across the matched structures.
3. Identify subfamilies where inherited plans become misleading.
4. Use `MERGE` by default; use removal or `REPLACE` only with an explicit strategic reason.
5. Confirm White and Black summaries are independently correct.
6. Confirm every plan has stable identity, conditions/caveats where needed, confidence and registered sources.
7. Confirm prose is orientation rather than an authoritative move recommendation.
8. Add fixtures for broad matches, narrow overrides, rare names and transpositions.
9. Run generated and imported-game audits and record before/after gains.
10. Verify candidate contract and ranking-policy versions remain unchanged.

## Stale-content handling

A rule or source must be reviewed when:

- its selector starts matching materially different generated entries after an opening-book update;
- referenced classification rule IDs change meaning or are replaced;
- a source is removed, relicensed or materially revised;
- stronger evidence contradicts a soundness or theoretical-status assumption;
- inherited plans are shown to misdescribe a significant subfamily;
- the rule has not been reviewed across two opening-book version updates.

Stale content should move to `DRAFT` or `DEPRECATED` rather than remain silently active. Replacement rules retain new stable identities or explicit revision increments according to the existing registry policy.

## Offline AI-assisted drafting

Offline AI assistance may be used to organize research notes or draft candidate wording only when:

- no generated text is published automatically;
- the model output is not treated as a source;
- selectors, claims, plans, caveats and sources are independently verified;
- the final runtime prose is project-original and reviewed;
- the manifest remains `DRAFT` until human review is complete;
- no runtime LLM or network dependency is introduced.

AI assistance must not infer soundness, fabricate provenance or bulk-generate one object per opening-book row.

## Delivery evidence

Every applied batch records:

- manifest ID and revision;
- knowledge and classification baseline versions;
- selected priority-policy version;
- before/after generated-entry and unique-name coverage;
- before/after imported-game-weighted coverage when populated data is available;
- added and changed rule/source IDs;
- regression fixtures and validation commands;
- reviewer identity and date;
- known gaps and the next backlog candidates.
