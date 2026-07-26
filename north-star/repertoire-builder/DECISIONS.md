# Repertoire Builder Decisions

Last updated: 2026-07-26

States:

- **LOCKED** — agreed foundation; change only with explicit user revision.
- **PROVISIONAL** — current direction, subject to task evidence.
- **OPEN** — intentionally unresolved.
- **REJECTED** — considered and explicitly not selected.

## Product decisions

### RB-D001 — Human-controlled repertoire architect

State: **LOCKED**

The north star is an interactive repertoire builder that proposes evidence-backed choices while leaving important decisions to the user.

### RB-D002 — Profile conclusions are advisory

State: **LOCKED**

A player profile may initialize or rank options but cannot prevent the player from choosing another repertoire character.

### RB-D003 — Multiple repertoire personas

State: **LOCKED**

The same player may create multiple courses for the same opening with different intents, including solid, sharp, dubious, low-theory, or future traps-oriented variants.

### RB-D004 — Existing-course improvement uses the same decision mechanism

State: **LOCKED**

Course gaps, endings, deviations, and weak choices should enter the same builder workflow rather than creating separate recommendation systems.

## Environment and rating decisions

### RB-D005 — Speed selection is combinable

State: **LOCKED**

A target supports any non-empty combination of bullet, blitz, rapid, and classical. The product must not model only one selected speed.

### RB-D006 — General mode is controlled

State: **LOCKED**

General mode uses explicit weighting. It must not naively merge all games and allow the largest population to dominate accidentally.

### RB-D007 — Exact speed weights

State: **OPEN**

Equal weights, player-distribution weights, editable weights, and other formulas require evidence.

### RB-D008 — Reuse rating normalization

State: **LOCKED**

Cross-provider and cross-speed strength targeting uses the versioned rating-normalization domain merged through PR #76. Consumers must preserve the profile ID/version and stable grade IDs, use grade membership or approximate source ranges rather than exact cross-pool rating conversion, and must not introduce feature-local parity tables.

### RB-D009 — Multi-account level is required

State: **LOCKED**

The system needs an inspectable formula for players with multiple accounts and ratings.

### RB-D010 — Multi-account formula

State: **OPEN**

Recency, volume, provider, account selection, period rating, per-speed resolution, confidence, and override behavior remain undecided. PR #76 supplies the normalization vocabulary but does not resolve this formula.

## Data and profile decisions

### RB-D011 — Four evidence layers remain separate

State: **LOCKED**

Intrinsic opening profile, target-population profile, player profile, and current repertoire target are distinct concepts.

### RB-D012 — Opening classification will exist

State: **LOCKED**

The program assumes a side-aware classification of named openings will be available one way or another.

### RB-D013 — Opening-classification method

State: **OPEN**

The algorithm, curation process, hierarchy, storage, taxonomy, and confidence model are intentionally outside the current foundation.

### RB-D014 — Chess Profile is standalone

State: **LOCKED**

The player Chess Profile should deliver independent value even before the interactive builder exists.

### RB-D015 — Preference and performance are separate

State: **LOCKED**

The profile must not infer that frequent choice means strong performance or that strong performance means preference.

### RB-D016 — Profile claims retain evidence

State: **LOCKED**

Sample size, analysed coverage, filters, baseline, rating context, and confidence must remain available behind conclusions.

### RB-D017 — Tags are signals, not the complete model

State: **LOCKED**

Existing opening and game-story tags may contribute, but profile conclusions cannot be unexplained tag counts.

## Recommendation and UX decisions

### RB-D018 — Explainable recommendations

State: **LOCKED**

Candidate evidence remains separated and recommendation reasons are visible. No opaque aggregate score is sufficient by itself.

### RB-D019 — Candidate choice must be visual

State: **LOCKED**

The user should see positions and consequences, not only SAN lines or a text table.

### RB-D020 — Exact visual composition

State: **OPEN**

Multiple mini-boards, interactive preview, candidate cards, branch map, mobile behavior, and information density require prototype evidence.

### RB-D021 — Routed, resumable workbench

State: **PROVISIONAL**

A small dialog may launch setup, but the substantial workflow should be a routed workbench. Persistence requirements remain open.

### RB-D022 — Deferred coverage is first-class

State: **LOCKED**

The user can deliberately postpone an opponent response without the system treating the course as accidentally incomplete.

## Persistence and integration decisions

### RB-D023 — Reuse course reintegration patterns

State: **PROVISIONAL**

Current analysis-tree preview and course reintegration are the preferred starting pattern, subject to reinspection when the implementation task begins.

### RB-D024 — Builder-session persistence

State: **OPEN**

Do not add a database model before the workflow and resume requirements are demonstrated.

## Optional intelligence decisions

### RB-D025 — LLM is optional

State: **LOCKED**

The core roadmap does not depend on an LLM.

### RB-D026 — LLM role

State: **OPEN**

Explanation, summarization, naming, or conversational orchestration may be useful, but factual authority and write behavior require separate review.

### RB-D027 — Traps are tracked but vague

State: **LOCKED**

The roadmap includes traps research, but does not claim a trap definition, database, classification, or delivery date.

## Rejected shortcuts

### RB-D028 — Fully automatic repertoire generation without review

State: **REJECTED**

The product should not silently select and write an entire repertoire from a hidden score.

### RB-D029 — Master games as the only practical corpus

State: **REJECTED**

Master practice is one evidence source. Selected speed/rating populations and personal games are required for practical targeting.

### RB-D030 — One permanent player style label

State: **REJECTED**

Player tendencies vary by period, speed, color, rating context, and deliberate learning goal.
