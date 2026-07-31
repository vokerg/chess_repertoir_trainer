# ONB-016 — Lightweight onboarding product and experience blueprint

Date: 2026-07-30

Issue: [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224)

Branch: `onb-016/issue-224-lightweight-experience-blueprint`

Base: `main` at `d0f354cb5bf8b3ff31f77e96a1b74e4dbda9e58d`

Delivery class: research/product design

Disposition: recommendation complete; repository documentation prepared for review; no runtime implementation and no merge performed

## 1. Question and outcome

### 1.1 Research question

How should Chess Repertoire Trainer turn its complex account-import, indexing, analysis, insight, tactical-training, and repertoire capabilities into a first-use experience that feels light, professional, trustworthy, and engaging rather than like another overloaded administration dashboard?

The requested direction included:

- a deliberately minimal frontend standard;
- approximately one decision or dominant action at a time;
- Lichess and Chess.com account connection, including multiple accounts;
- durable account-level import work picked up by a worker;
- visible per-account progress;
- recent-first indexing of three months of blitz and rapid games;
- earlier high-value analysis while a larger background tail continues;
- immediate personal performance insights;
- reuse of Player Chess Profile facts;
- puzzles sourced from the player's own games;
- a future bridge into the Repertoire Builder;
- reusable modules that remain useful outside onboarding;
- a method for using current OpenAI design/prototyping capabilities without replacing the existing Angular application.

### 1.2 Outcome

The recommended solution is a route-based, persisted, progressive-disclosure experience over the existing server-owned lifecycle:

1. connect one public account;
2. explicitly accept the fixed recent three-month blitz/rapid recipe;
3. begin durable background work;
4. expose truthful progress through frequent persisted milestones;
5. reveal import-only value immediately;
6. reveal opening-aware insights as indexing reaches feature-owned evidence thresholds;
7. analyse a bounded first-value sample before completing the lower-priority analysis tail, subject to ONB-003/007 decisions;
8. offer one personal tactical scenario when evidence exists;
9. offer additional accounts and older history as explicit expansion after first value;
10. optionally hand an evidence anchor to the human-controlled Repertoire Builder.

The central UX rule is **one dominant action per focused surface**. This does not require an artificial chain of modals or prohibit secondary navigation. It means each surface communicates one current decision, one current object, and one clear next action.

A new canonical document, `EXPERIENCE_BLUEPRINT.md`, records the detailed journey, standards, progress semantics, evidence model, competitor lessons, prototype workflow, failure states, and implementation slices.

## 2. Executive recommendation

### 2.1 Build a thin experience over a deep system

The product should not expose its internal complexity to prove that work is happening. Provider windows, coverage, import runs, job runs, tasks, worker slices, active fences, indexing, analysis, tactical scans, and readiness are implementation concepts. The user-facing narrative should be:

> We found your games. We are preparing the opening evidence first. You can explore now; deeper analysis will keep improving the result.

The durable system remains exact. The interface remains calm.

### 2.2 Do not build a smaller account settings page

The current account page is a capable advanced surface. It exposes provider setup, display name, global refresh, per-account sync, indexing, analysis, cursor reset, activation, default-account selection, deletion, metadata, and workflow actions in one place.

That density is appropriate for account operations. It is not appropriate for first use. Onboarding should orchestrate the accepted default and reserve advanced account lifecycle controls for Settings.

### 2.3 Do not wait for complete analysis

The repository already supports several evidence depths:

- import-only facts;
- indexed/opening-aware facts;
- analysed/profile/tactical facts.

The first meaningful reveal should occur after enough indexed evidence exists, not after every selected game has completed Stockfish analysis. Analysis should improve and deepen the experience rather than gate all value.

### 2.4 Do not add all accounts before starting

The accepted lifecycle uses one selected account for the first run. That is product-correct. Requiring every Lichess and Chess.com identity before preparation would create a longer form, an unclear denominator, more identity/deduplication questions, and slower time to value.

The product should support unlimited or policy-bounded additional accounts through explicit expansion after the first useful result. A light, playful invitation is compatible with this direction:

> Most players have another account somewhere. Add it after this first look and we'll combine the evidence carefully.

### 2.5 Never simulate progress

The desire for numbers that move quickly is valid as a desire for reassurance, but must not be implemented with fabricated progress. The product can feel active by exposing more frequent real milestones:

- provider windows or archive months checked;
- games seen and imported;
- games selected and indexed;
- openings assigned;
- games analysed;
- insights newly available;
- one personal puzzle newly ready.

An indeterminate provider request plus exact growing counts is more trustworthy than a smooth fictional percentage.

## 3. Idea-to-program reconciliation

| Product idea | Current status | ONB-016 conclusion | Owner after this report |
| --- | --- | --- | --- |
| Lightweight, professional first-use frontend | Not sufficiently specified before ONB-016 | Adopt `EXPERIENCE_BLUEPRINT.md` as the functional interaction standard | ONB-010 consumes; VT-302 finalizes visual/accessibility craft |
| One action per modal/step | Partially compatible | Use one **dominant action per focused route surface**; avoid a blocking modal train | ONB-010 / VT-302 |
| Connect Lichess and Chess.com | Existing account capability and ONB scope | Present provider choice as a focused decision, then one username field | ONB-010 with existing account/import contracts |
| Connect several accounts | Existing account model supports multiple; first run locked to one | Add accounts after first value through explicit expansion runs | ONB-009 command shape; ONB-003 ordering; ONB-010 UI |
| Suggest Lichess first because faster | Plausible but not yet benchmarked | Permit a truthful “usually quickest first look” preference only after ONB-007 evidence; never force it | ONB-007 validates; ONB-010 presents |
| One durable import task per account picked up by worker | Accepted in ONB-002 | Already represented by durable account-level `ImportRun`, one non-terminal run per account, separate worker loop | ONB-011–015 implementation |
| Per-account progress bars | Partially covered by exact progress direction | Show per-account rows for expansion runs; percentage only with fixed denominator; otherwise exact counts + indeterminate state | ONB-008 projection, ONB-010 UI, ONB-007 policy |
| Recent three months | Locked | Preserve fixed three-calendar-month snapshot | ONB-001/002, ONB-009 commands |
| Blitz and rapid; exclude bullet initially | Locked | Preserve default; bullet remains optional later expansion | ONB-001/009 |
| Index recent games before analysis | Locked | Make opening preparation the first meaningful readiness stage | ONB-003 implementation / ONB-010 narrative |
| Let the user see activity before analysis | Locked in principle, not fully choreographed | Reveal recent games, import facts, then indexed opening insights | ONB-008/010 and profile/readiness consumers |
| Analyse one month or smaller fast lane first | Compatible product requirement, not physically decided | Define a first-analysis lane UX capability; exact sample, priority, and wave policy remain delegated | ONB-003/007 |
| Continue analysing three months at low priority | Compatible with accepted background tail | Preserve exact continuation state; never call the whole recipe complete if deeper requested work remains | ONB-003/008/010 |
| Tell user data keeps improving | Compatible and recommended | Use evidence-specific partial/ready states and quiet Home background card | ONB-008/010 |
| Performance insights / fun facts | Existing product has relevant calculations | Reuse canonical Profile/account/opening calculations; show at most three evidence-labelled cards | Player Chess Profile + ONB-008/010 |
| Improvement areas by broad opening family | Compatible if evidence-backed | Present one repair area with sample, scope, confidence, and evidence link | Profile/opening analysis owner; ONB chooses small subset |
| Insights tied to tags | Possible after analysis | Only surface tags or motifs whose calculation, provenance, and readiness are canonical | Analysis/tag feature + ONB readiness |
| Puzzle from user's own game | Existing tactical detection/scenario training capability | Offer one high-confidence missed-shot scenario as an optional next action | Scenario Training + ONB-008/010 |
| Repertoire Builder entry | Existing North Star program | Offer evidence-anchored optional entry only when Builder is production-ready; no automatic move/course mutation | Repertoire Builder + ONB-010 |
| Modules also exist outside onboarding | Strongly recommended | Define reusable insight/readiness/action items consumed by Profile, Home, account progress, mobile, and Builder | ONB-008 contracts + feature owners |
| Use ChatGPT Sites / design tool | Current OpenAI feature researched | Use Sites/Figma as private synthetic-data state prototypes and editable design handoff; Angular remains production | Prototype slice + VT-302/ONB-010 |

## 4. Files and repository state inspected

### 4.1 Repository and program governance

- `AGENTS.md`
- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/README.md`
- `north-star/onboarding/FOUNDATION.md`
- `north-star/onboarding/MASTER_PLAN.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/tasks/ONB-001-lifecycle-default-recipe.md`
- `north-star/onboarding/tasks/ONB-002-bounded-import-backfill.md`
- `north-star/onboarding/tasks/ONB-003-progressive-preparation-orchestration.md`
- `north-star/onboarding/tasks/ONB-008-onboarding-disposition-readiness.md`
- `north-star/onboarding/tasks/ONB-009-onboarding-lifecycle-commands.md`
- `north-star/onboarding/tasks/ONB-010-functional-onboarding-home.md`
- ONB reports for ONB-000, ONB-001, and ONB-002
- issues #147, #150, #154, #195, #224

### 4.2 Current account/import implementation

- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.html`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `apps/web/src/app/features/accounts/data-access/accounts-api.service.ts`
- `apps/web/src/app/features/accounts/data-access/accounts.models.ts`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/prisma/schema.prisma`

### 4.3 Preparation and job system

- `docs/imported-game-job-processing.md`
- `apps/api/src/modules/jobs/`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/web/src/app/core/jobs/`

### 4.4 Existing value surfaces

- `apps/web/src/app/features/home/home-dashboard.models.ts`
- `apps/web/src/app/features/home/home-dashboard.helpers.ts`
- `apps/web/src/app/features/home/home-dashboard.store.ts`
- `apps/web/src/app/features/player-chess-profile/`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-conclusions.component.html`
- `transformation/reports/VT_301_PLAYER_CHESS_PROFILE.md`
- `docs/tactical-detections.md`
- `apps/api/src/modules/scenario-training/`
- `apps/web/src/app/features/scenario-training/tactical-missed-shot/`
- `north-star/repertoire-builder/`
- issue #105 Repertoire Builder program
- issue #133 VT-302 onboarding/accessibility/responsive polish

### 4.5 Activity and collision review

- current `main` SHA and recent commits;
- open ONB pull requests;
- active branch search for ONB and Visual Transformation names;
- issue state for ONB-003, ONB-007, ONB-010, VT-302, and Repertoire Builder.

No active ONB implementation branch or pull request was found that would collide with the documentation paths or decisions changed by ONB-016. ONB-010 and VT-302 remain unstarted/proposed or blocked. ONB-003 remains the deterministic next critical-path research task.

## 5. Verified current-state facts

### 5.1 The application already has a strong execution foundation

The PostgreSQL-backed imported-game worker survives navigation, browser reloads, API restarts, and worker restarts. It owns durable indexing and analysis jobs, task claims, cancellation, retry, stale recovery, and progress.

This makes a lightweight frontend feasible. The UI does not need to keep a tab alive or manually advance batches.

### 5.2 Provider import is the major current first-use mismatch

The current Lichess path is synchronous, streams NDJSON, performs per-game existence checks and inserts, and uses an unbounded first sync when no cursor is present. It can count individual game failures and continue.

The current Chess.com path is synchronous, loads archive months serially, and similarly processes games inside the request.

ONB-002 has already replaced this direction at the design level with durable bounded account import, exact coverage, replayable provider windows, and a separate worker loop. ONB-016 therefore does not redesign import; it defines how the resulting progress should be experienced.

### 5.3 Current account UI is operationally rich and experientially dense

The account page combines setup, synchronization, data preparation, cursor management, account lifecycle, destructive controls, metadata, and detailed action clusters.

The user would have to infer the correct sequence:

```text
add account → sync → inspect result → index → wait → analyse → inspect somewhere else
```

The onboarding experience should replace that manual sequencing with one accepted recipe and server-owned advancement.

### 5.4 Current Home already demonstrates useful prioritization

Home chooses one continue action and a limited recommendation set. This is directionally aligned with the lightweight standard. However, its current setup recommendations are independently derived from accounts, imported-game facets, courses, analysis backlog, and recent games.

ONB-001 correctly requires future Home onboarding treatment to consume the server-owned onboarding projection rather than recreate lifecycle logic in Angular.

### 5.5 Player Chess Profile is the natural insight source

The Profile architecture already separates route composition, state, API access, filters, conclusions, breakdowns, evidence, and coverage. Its presentation includes evidence labels, sample labels, metrics, positive/negative semantics, and inspectable evidence.

The onboarding reveal should be a constrained projection of canonical Profile/opening calculations, not a second set of ad hoc frontend formulas.

### 5.6 Personal-game tactical training already exists

Tactical detections are persisted over analysed imported games. A `MISSED_SHOT` detection can create a scenario-training session with the original game context and challenge position.

This satisfies the core product idea of “let the user solve something from their own game” without inventing a new puzzle engine. The remaining work is readiness, selection, and presentation.

### 5.7 Repertoire Builder can receive context but retains decision authority

The Repertoire Builder program is explicitly human-controlled. It compares evidence-backed candidate moves, lets the user choose coverage, and applies accepted branches to courses.

Onboarding may eventually supply an opening or branch anchor. It must not generate a hidden repertoire, select moves, or mutate courses as a setup side effect.

## 6. Recommended experience model

### 6.1 Product moments, not a rigid wizard

The blueprint defines these moments:

1. value promise;
2. provider choice;
3. username entry and account confirmation;
4. default recipe review;
5. durable work accepted;
6. import progress;
7. first import-only value;
8. opening preparation/indexing;
9. first indexed reveal;
10. first-analysis lane and background continuation;
11. analysed performance reveal;
12. one personal puzzle when eligible;
13. optional Builder bridge;
14. quiet core-ready transition and Home re-entry.

The route can combine or separate moments by viewport and state. The server projection remains authoritative.

### 6.2 One dominant action

Each moment has one primary action, for example:

- Connect an account
- Continue with Lichess
- Use this account
- Prepare my recent games
- Explore the app
- See the evidence
- Find the move
- Add another account
- Start a repertoire from this branch

Back, skip, pause, cancel, and advanced details remain available where appropriate, but must not visually compete with the immediate decision.

### 6.3 Route, not modal train

A protected `/onboarding` route is preferable because it supports:

- durable re-entry;
- browser navigation;
- direct links;
- responsive layouts;
- accessibility;
- non-blocking departure;
- multiple progress and reveal states.

Dialogs remain appropriate for small confirmations, such as verifying a detected account or confirming cancellation.

### 6.4 First reveal before full completion

The first reveal should occur when a feature-owned indexed threshold is met. It should contain no more than three cards and should prioritize:

- one recognizable preference;
- one supported strength or concern;
- one next investigation.

Every card must disclose sample, scope, and evidence state. A low-sample curiosity must not be styled as a confident diagnosis.

### 6.5 Analysis as a deepening stage

Analysis should first produce a small useful sample, then continue the accepted three-month tail. The exact selection could be the newest month, a representative subset, or another deterministic policy. ONB-016 does not choose between those because worker ordering, priority, fairness, cost, and measured first-value time belong to ONB-003 and ONB-007.

The UI requirement is independent of the physical policy:

- first analysed evidence can become ready early;
- remaining requested work stays visible;
- core onboarding may complete while analysis continues;
- the user's profile explicitly improves as evidence coverage grows.

## 7. Insight and reveal design

### 7.1 Evidence ladder

| Evidence state | Suitable onboarding content |
| --- | --- |
| Account accepted | provider, username, compact identity confirmation |
| Import-only | recent eligible game count, activity, colors, speed mix, W/D/L with sample |
| Indexed | opening frequencies, opening families, named coverage, recurring branches |
| Partially analysed | preliminary evaluation/tactical findings with partial warning |
| Analysis threshold met | canonical performance strengths, concerns, tactical scenario |
| Expanded accounts/history | broader trends with explicit mixed-source and scope disclosure |

### 7.2 Suggested first analysed structure

A useful structure is:

- **Keep** — an evidence-supported opening family or behavior;
- **Repair** — one recurring branch or performance gap;
- **Try next** — one concrete product action.

This structure is simple, memorable, and action-oriented. It should use deterministic application evidence and never imply causality from weak correlations.

### 7.3 Reusable contract

A presentation-ready insight should include:

- stable type;
- summary;
- evidence grade/state;
- sample size;
- account/provider/color/speed/date scope;
- metric and optional comparator;
- evidence destination;
- generation/evidence version;
- partial/unavailable warning.

The same item can then be consumed by Onboarding, Home, Player Chess Profile, account progress, opening analysis, mobile, and Builder handoff.

### 7.4 Selection responsibility

The browser may render and arrange a server-approved small set. It must not become an independent statistical or recommendation engine. Eligibility, evidence thresholds, and truth belong to canonical feature services and the readiness projection.

## 8. Multi-account design

### 8.1 First run

Use one selected account. The user should not have to reason about identity merging, duplicated games, mixed ratings, or provider-specific coverage before seeing value.

### 8.2 Expansion

After the first indexed reveal or core readiness, offer another account. Each expansion remains explicit and resumable. When multiple account imports/preparation runs overlap, show compact account rows with their own exact stage and failure state.

### 8.3 Required future decisions

Combined evidence requires exact rules for:

- same-game duplicates across providers;
- accounts belonging to different people;
- default progress account;
- rating and provider calibration;
- account removal and recomputation;
- mixed-source evidence labels.

These are not reasons to block the first run. They are reasons to make expansion explicit and inspectable.

## 9. Progress semantics

### 9.1 Three-layer progress hierarchy

1. **Product stage** — importing games, preparing openings, analysing, ready while deeper work continues.
2. **Focused facts** — exact relevant counts for the current stage.
3. **Technical detail** — existing global job panel or advanced progress view.

### 9.2 Fixed denominator rule

A percentage is allowed only when its denominator is immutable for that progress item. Examples:

- 2 of 3 archive months checked;
- 35 of 50 selected games indexed;
- 12 of 35 requested indexed successes analysed.

Do not produce one weighted “overall onboarding 63%” value by mixing provider import, indexing, and Stockfish analysis.

### 9.3 Activity without deception

Use real events and milestone transitions:

- “42 games imported so far”;
- “2 of 3 months checked”;
- “12 openings prepared”;
- “Your first opening insight is ready”;
- “One missed tactical chance is ready to try.”

### 9.4 ETA

Do not show ETA before ONB-007 approves a defensible policy. Exact counts remain the primary truth even if an ETA is later added.

## 10. Competitor review

### 10.1 Chessbook

Chessbook is the closest direct category competitor in the researched set. Its public Android listing presents custom repertoire construction, spaced repetition, gap detection, online-game mistake review, model games, and Lichess/Chess.com support.

Useful lessons:

- connect online-game evidence directly to repertoire work;
- communicate coverage and gaps;
- reduce irrelevant theory;
- maintain a tight build/train/review loop.

Chess Repertoire Trainer should differentiate through progressive preparation, explicit evidence depth, Player Chess Profile, own-game tactical actions, and human-controlled Builder handoff.

### 10.2 OpeningFit

OpeningFit is the closest first-payoff pattern. It begins from a public username, focuses on recent blitz/rapid games, labels small samples, and structures the result around a best fit, biggest issue, and next action.

Useful lessons:

- minimize setup fields;
- answer a few valuable questions rather than opening a dashboard;
- label evidence strength;
- make the first report structure clear.

### 10.3 OpenBook

OpenBook positions itself as a simple and intuitive repertoire builder/trainer and supports reviewing recent Lichess and Chess.com games in the browser.

Useful lessons:

- powerful chess workflows can still feel lightweight;
- separate building from practicing;
- provide a narrow trial or first action before exposing management complexity.

### 10.4 OpeningTree

OpeningTree makes provider/source selection and filters an explicit sequence.

Useful lesson:

- provider choice deserves a focused screen rather than a dropdown in a large settings form.

Caution:

- its operational filtering sequence is more complex than this product's desired default-recipe acceptance.

### 10.5 Sources reviewed

- [Chessbook — Google Play](https://play.google.com/store/apps/details?id=com.chessbook.android)
- [OpeningFit](https://www.openingfit.com/)
- [OpenBook](https://openbookchess.com/)
- [OpeningTree](https://www.openingtree.com/)

Sources were reviewed on 2026-07-30. Competitor implementation details not publicly documented were not inferred.

## 11. OpenAI prototype and design workflow

### 11.1 Identified product

The verified current OpenAI feature matching the described intent is **ChatGPT Sites**, not “Google Sites” and not a verified product called “Cloudy Design.” Sites creates, previews, refines, hosts, and shares interactive sites and lightweight applications from ChatGPT Work or Codex.

OpenAI and Figma also provide a round-trip Codex/Figma MCP workflow where code can become editable Figma design layers and accepted Figma context can return to implementation.

### 11.2 Correct role in this repository

Use Sites or Figma Make as a high-fidelity, fixture-driven state prototype. Do not use generated Sites runtime as the new application architecture.

The production application remains Angular because the repository already has:

- guarded routes;
- Clerk authentication;
- typed HTTP contracts;
- feature stores;
- transformed shared UI primitives;
- job integration;
- server-owned lifecycle;
- existing deployment boundaries.

### 11.3 Availability caveat

Official OpenAI documentation states that Sites access depends on plan, rollout, region, and workspace settings. The launch FAQ still lists the EEA, Switzerland, and the United Kingdom as unavailable at launch. Denmark is in the EEA, so the user's actual account must be checked and a Figma/Codex or repository-local prototype fallback retained.

### 11.4 Prototype safety

Use synthetic fixtures only. Do not provide:

- real usernames or PGNs;
- provider tokens;
- Clerk tokens;
- cookies;
- environment files;
- production database access;
- private repository-wide context beyond the narrow design package.

Keep the prototype private, save reviewable versions before deployment, inspect generated source and migrations, and document every assumption.

### 11.5 Prototype review package

The input package should contain:

- `EXPERIENCE_BLUEPRINT.md`;
- locked lifecycle/progress decisions;
- screenshots or examples of transformed shared primitives;
- synthetic state fixtures;
- responsive constraints;
- accessibility and reduced-motion requirements;
- prohibited patterns;
- expected handoff artifacts.

### 11.6 Required state fixtures

At minimum:

- no account;
- provider selection;
- valid and invalid usernames;
- account confirmation;
- recipe review;
- indeterminate import with games arriving;
- fixed provider-window progress;
- partial provider failure;
- indexing progress;
- first insight ready;
- partial analysis;
- tactic ready and no tactic available;
- skipped guidance with active work;
- core ready with analysis tail;
- additional account expansion;
- return from another device/session;
- pause, retry, cancel, and attention states.

### 11.7 Handoff requirement

The accepted output is not generated framework code. It is:

- journey/state map;
- component inventory;
- copy deck;
- responsive behavior;
- motion/reduced-motion rules;
- keyboard/focus behavior;
- state screenshots or saved version;
- token mapping;
- server-contract mapping;
- assumptions/rejections;
- ONB-010/VT-302 implementation checklist.

### 11.8 Official sources

- [Creating and managing ChatGPT Sites](https://help.openai.com/en/articles/20001339)
- [ChatGPT Sites developer guide](https://learn.chatgpt.com/docs/sites)
- [OpenAI Codex and Figma launch seamless code-to-design experience](https://openai.com/index/figma-partnership/)

Sources were reviewed on 2026-07-30. Availability and product behavior must be reverified when the prototype task begins.

## 12. Alternatives considered

### 12.1 Full settings dashboard as onboarding

Rejected. It maximizes visible control before the user understands the workflow and directly recreates the overload problem.

### 12.2 Modal-by-modal blocking wizard

Rejected as the primary architecture. It makes re-entry, browser navigation, narrow layouts, and long-running background work harder. Small confirmations may still be dialogs.

### 12.3 Ask for every account first

Rejected. It delays first value, conflicts with the one-account first run, and introduces unresolved aggregation questions too early.

### 12.4 Import and analyse all history before showing anything

Rejected by existing program decisions and time-to-first-value requirements.

### 12.5 Full analysis as the first insight gate

Rejected. Indexed evidence is cheaper and useful. Analysis should deepen the result.

### 12.6 Fake or elapsed-time progress

Rejected. It conflicts with exact progress and weakens trust.

### 12.7 Angular-side insight calculations

Rejected. It would duplicate Profile/opening logic and create inconsistent recommendations.

### 12.8 Automatic repertoire generation

Rejected. It bypasses the human-controlled Builder and can create irreversible or low-trust output from partial evidence.

### 12.9 Direct production adoption of Sites-generated code

Rejected. Generated runtime assumptions may not match Angular, authentication, typed contracts, server-owned state, background services, or repository guardrails.

### 12.10 Separate onboarding visual identity

Rejected. Onboarding should be the best example of the transformed design system, not another visual system.

## 13. Schema, API, and UX implications

### 13.1 No ONB-016 schema migration

This research does not change Prisma or runtime contracts. Physical preparation schema remains owned by ONB-003 and implementation tasks.

### 13.2 Projection requirements

The future onboarding read projection needs enough presentation data to express:

- disposition and derived presentation state;
- current preparation run and accepted recipe;
- account identity;
- import, index, and analysis stage progress;
- core readiness versus deeper continuation;
- feature-specific readiness;
- newly ready reveal items;
- primary and secondary server-allowed actions;
- warnings and attention reasons;
- latest meaningful milestone;
- optional expansion recommendations.

It should not include unbounded game ID arrays or raw child-job graphs.

### 13.3 Command requirements

Lifecycle commands remain server-authoritative and idempotent. The UI consumes allowed actions for:

- start;
- skip;
- pause;
- resume;
- cancel;
- retry;
- finish no-data where approved;
- add account/history expansion;
- navigate to deterministic ready features.

### 13.4 Insight requirements

A reusable insight contract should be owned by canonical feature logic and expose scope, sample, evidence state, metric, destination, and version. ONB-008 should carry a bounded summary or reference rather than embedding an uncontrolled analytical payload.

## 14. Migration and backward compatibility

- Existing users remain adopted as onboarding `COMPLETED` under D-027.
- Existing account Settings routes and actions remain available.
- Existing protected routes and login `returnUrl` remain valid.
- The global job panel remains available.
- Existing Home behavior should be incrementally replaced only for onboarding lifecycle inference; unrelated course/training recommendations remain.
- Existing Profile, tactical training, and Builder routes remain the execution/evidence destinations.
- No existing URL is removed by this research.
- No provider or database migration is introduced.
- Generated prototype artifacts must be removable without production migration.

## 15. Security and privacy

- Public chess usernames remain personal identifiers.
- The product should state that public games will be imported and analysed.
- Every account, run, game, insight, and scenario route remains ownership-scoped.
- Multi-account expansion must not permit cross-user attachment.
- Analytics must not contain PGNs, move sequences, provider tokens, or sensitive free text.
- Prototype work uses synthetic data and private access.
- No secrets belong in Sites prompts, generated source, Figma documents, or hosting configuration.
- Sites currently does not promise data/inference residency; real user data should not be placed into the prototype workflow.

## 16. Failure and recovery

### 16.1 Invalid or unavailable account

Preserve input and identify the category of failure. Offer correction or retry without restarting the entire experience.

### 16.2 No eligible games

Do not silently finish. Offer deterministic actions such as another account, date expansion, explicit finish, or skip according to ONB-009.

### 16.3 Partial import

Show only facts proven by persisted coverage. Mark incomplete scope and expose server-allowed retry/pause/cancel behavior.

### 16.4 Partial indexing

Reveal only capabilities whose minimum evidence is met. Keep failed counts visible and attach an evidence warning.

### 16.5 All indexing failed

Do not show opening conclusions. Present a focused attention state with retry/support/finish choices.

### 16.6 Long analysis tail

Complete core onboarding when the accepted import/index gate is satisfied. Keep a compact Home progress card until the requested analysis tail settles.

### 16.7 Return from another route/session/device

Render directly from server state. Do not replay steps or celebration because local component state was lost.

## 17. Performance and operational impact

ONB-016 adds no runtime load. It defines what ONB-007 should measure:

- account acceptance to durable run creation;
- time to first imported game;
- time to recent-games visibility;
- time to first indexed game;
- time to first indexed reveal threshold;
- time to first analysed game;
- time to first analysed reveal;
- time to first personal tactical scenario;
- time to core readiness;
- time to full accepted recipe completion;
- time to expansion completion.

The primary product budget should be time to the first meaningful indexed reveal. Full analysis completion is a secondary operational target.

## 18. Analytics implications

Recommended events:

- onboarding welcome viewed;
- provider selected;
- account validation result/reason;
- account accepted;
- recipe viewed/adjusted/accepted;
- durable run started;
- user left while work active;
- user returned;
- import-only value viewed;
- indexed reveal viewed;
- evidence inspected;
- analysed reveal viewed;
- tactical scenario offered/started/completed;
- second account offered/accepted;
- core readiness reached/viewed;
- Builder entry offered/used;
- skip/pause/cancel/retry/recovery outcomes;
- milestone timing distributions.

Analytics should diagnose friction and operational stalls, not pressure users through optional actions.

## 19. Accessibility and responsive implications

ONB-010 must implement accessible behavior before VT-302 final polish:

- semantic route/page structure;
- keyboard-operable provider choices, disclosures, actions, and evidence;
- visible focus;
- status announcements throttled to meaningful transitions rather than every poll;
- no color-only status;
- labelled exact progress;
- reduced-motion equivalent;
- no timed auto-advance;
- usable 200% zoom;
- one-column narrow-phone flow;
- correct touch targets;
- field-associated errors;
- focus restoration after dialogs/state transitions;
- content remains available without animation.

## 20. Validation plan for implementation

### 20.1 Functional scenarios

- first user/no account;
- Lichess and Chess.com paths;
- invalid username;
- account already connected;
- recipe acceptance and idempotent duplicate command;
- leave and return across route/session/device;
- import active with unknown total;
- import with fixed windows;
- no games;
- partial import failure;
- import complete/index queued;
- partial indexing;
- all indexing failed;
- first indexed reveal;
- partial analysis;
- analysis tail after core readiness;
- personal tactic ready/not available;
- skip versus cancel;
- pause/resume/retry;
- second-account expansion;
- mixed account progress;
- Builder unavailable/available;
- technical job panel coexistence.

### 20.2 UI/accessibility scenarios

- desktop, tablet, compact, and narrow phone;
- keyboard only;
- screen-reader smoke;
- reduced motion;
- 200% zoom;
- long usernames and opening names;
- loading, empty, partial, error, recovery, and returning states;
- no repeated live-region noise during polling;
- focus transitions and dialog restoration.

### 20.3 Contract tests

- server allowed actions drive UI;
- no browser-derived completion;
- evidence thresholds prevent unsupported reveals;
- fixed denominator percentages only;
- child job dismissal does not erase parent progress;
- no unbounded ID arrays;
- ownership across account/run/insight/scenario destinations;
- idempotent start/expansion/retry commands.

## 21. Decisions changed

This report proposes locking the following direction in `DECISIONS.md`:

- route-based progressive disclosure and one dominant action;
- first-run density limits and no onboarding tables;
- additional accounts after first value;
- real persisted milestones instead of simulated progress;
- evidence-gated reusable reveals from canonical calculations;
- personal tactic and Builder handoffs as optional continuations;
- generated prototypes as synthetic-data design references only;
- final visual/accessibility ownership remains VT-302.

It does not change lifecycle, import, one-account first run, completion, readiness, job, provider, or Builder ownership decisions.

## 22. Open questions remaining

### ONB-003

- physical preparation model and statuses;
- wave/run topology;
- first-analysis sample ordering;
- priority/fairness;
- import-to-index pipeline cadence;
- multi-account expansion ordering;
- pause/cancel/retry reconciliation.

### ONB-007

- first-value budgets;
- Lichess-versus-Chess.com timing evidence;
- wave size;
- exact stalled-work thresholds;
- any ETA policy.

### ONB-008/009

- projection and allowed-action names;
- insight summary/reference shape;
- polling/cache policy;
- expansion and no-data command contracts.

### ONB-010/VT-302

- exact component/primitives base;
- Home versus route composition on compact screens;
- prototype tool actually available to the workspace;
- final responsive/accessibility/motion acceptance.

### Feature owners

- canonical small insight selection API;
- evidence thresholds and versioning;
- tactical scenario selection policy;
- Builder evidence-anchor destination;
- multi-provider duplicate/identity semantics.

## 23. Proposed bounded implementation work

No new technical ONB IDs are required by this research. The work maps cleanly to existing ownership:

### ONB-003 / #150

- define a first-analysis lane compatible with the UX milestones;
- preserve exact background-tail progress;
- define multi-account expansion ordering.

### ONB-007 / #154

- benchmark first-value milestones;
- validate or reject Lichess-fastest copy;
- define fixed-denominator and ETA policy.

### ONB-008 / #193

- include presentation state, stage summaries, feature readiness, latest milestone, and bounded reveal items/references in the authoritative projection.

### ONB-009 / #194

- expose idempotent start, skip, pause, resume, cancel, retry, no-data, and expansion commands plus deterministic actions/destinations.

### ONB-010 / #195

Deliver in bounded slices:

1. calm functional skeleton;
2. first indexed reveal;
3. analysed reveal and personal tactic;
4. multi-account expansion;
5. optional Builder bridge.

### VT-302 / #133

- consume the accepted state prototype;
- complete visual density, responsive, accessibility, and motion review.

### Player Chess Profile / analysis features

- expose canonical presentation-ready insight summaries and evidence thresholds.

### Repertoire Builder / #105

- define the optional evidence-anchor entry when the Builder is ready.

A separate prototype issue may be created later only when the actual tool, base branch, fixtures, and reviewer are known. Creating it now would not unblock runtime work and would risk a stale tool-specific task.

## 24. Queue impact

- ONB-003 remains the lowest-order READY task and deterministic next critical-path action.
- ONB-016 was explicitly authorized as parallel research after collision review.
- ONB-016 should move to `REVIEW`, not `DONE`, when its draft PR is available.
- ONB-008/009/010 remain `PROPOSED` and blocked by their existing backend dependencies.
- ONB-010 now additionally consumes the accepted ONB-016 experience contract.
- No implementation issue is promoted early.

## 25. Validation performed

Documentation-only research:

- root and onboarding agent instructions inspected;
- canonical onboarding documents inspected;
- task queue, issue mapping, active issue/PR/branch state inspected;
- current account UI and import services inspected;
- durable job architecture inspected;
- Home prioritization inspected;
- Player Chess Profile presentation/architecture inspected;
- tactical detection and scenario-training capability inspected;
- Repertoire Builder and VT-302 boundaries inspected;
- current official OpenAI Sites and Codex/Figma material reviewed;
- current direct/adjacent competitor product material reviewed;
- requested ideas reconciled against locked decisions and task ownership;
- first-run, partial, failure, return, expansion, reveal, puzzle, and Builder scenarios modelled.

Not run, because no runtime source, schema, migration, package, or deployment behavior changed:

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run check:architecture`
- focused API/web/mobile/domain/contracts checks
- browser automation
- provider calls
- load/benchmark tests
- database migrations

Residual validation before implementation:

- ONB-003/007 must supply physical orchestration and measured timing;
- prototype must be reviewed against synthetic fixture states;
- ONB-010 requires focused Angular/router/store/component tests and browser review;
- VT-302 requires final accessibility, responsive, and motion acceptance.

## 26. Residual risks

- OpenAI Sites availability and behavior may change before prototype work begins.
- The user's workspace in Denmark may not currently have Sites because of EEA rollout restrictions.
- Player Chess Profile calculations and Builder branches are active work; their accepted integration heads must be rechecked before implementation.
- “Lichess is faster” is a hypothesis until ONB-007 measures the durable adapters.
- The first-analysis lane can create fairness or CPU pressure if ONB-003/007 do not bound it.
- Mixed-provider duplicate and identity semantics remain unresolved.
- Too many notification/reveal moments could recreate overload if product analytics are used indiscriminately.
- A generated prototype can introduce attractive but non-implementable patterns; handoff must remain contract-first.

## 27. Final recommendation

Adopt `EXPERIENCE_BLUEPRINT.md` as the product/interaction source consumed by ONB-010 and coordinated with VT-302.

Build the first release as a calm functional skeleton over authoritative server state. Make the first useful indexed reveal the primary time-to-value target. Add analysed insights and one personal tactic next. Add multi-account expansion after first value. Add the Builder bridge only when its destination contract is ready.

Use ChatGPT Sites or Figma/Codex to test the full state matrix with synthetic data. Preserve Angular, existing feature stores, typed contracts, and the server-owned lifecycle as production authority.

The desired experience is not achieved by hiding all complexity or by drawing a prettier dashboard. It is achieved by sequencing truth:

```text
one account
  → one accepted recipe
  → visible real progress
  → one recognizable insight
  → one personal action
  → deeper optional product paths
```
