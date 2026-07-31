# Lightweight Onboarding Experience Blueprint

Last updated: 2026-07-30

Status: proposed canonical product/interaction direction from ONB-016 / #224. It refines presentation and handoff behavior without changing the lifecycle, import, orchestration, progress, Visual Transformation, Player Chess Profile, or Repertoire Builder ownership boundaries recorded elsewhere.

## 1. Executive direction

The onboarding experience should feel substantially simpler than the system that powers it.

The backend may coordinate accounts, provider windows, imported games, indexing, opening assignment, analysis, tactical detection, readiness, retries, priorities, and background workers. The user should not be asked to operate those mechanisms. The product should ask one useful question at a time, begin durable work quickly, reveal value as soon as evidence permits, and let the user leave.

The intended experience is not a long modal wizard and not a reduced version of the current account settings page. It is a progressive sequence of focused moments backed by one persisted preparation lifecycle:

1. make the value proposition concrete;
2. connect one account;
3. accept a safe recent-game recipe;
4. show real work starting;
5. reveal useful evidence before full completion;
6. offer one personal action from that evidence;
7. continue deeper preparation in the background;
8. make expansion and advanced controls available later.

The target emotional progression is:

```text
uncertainty → trust → visible movement → recognition → useful surprise → agency
```

The design standard is **one dominant action per focused surface**, not literally one clickable control in the entire viewport. Secondary actions may exist, but they must be visually subordinate, reversible, and non-competing.

## 2. Relationship to locked program decisions

This blueprint preserves the existing contract:

- onboarding is persisted and resumable, not browser-local;
- `/home` remains the signed-in entry and `/onboarding` is a protected resumable route;
- users are not trapped behind onboarding;
- the first preparation run uses one selected account;
- the default recipe is a fixed recent three-calendar-month snapshot of standard blitz and rapid games, rated and unrated;
- import precedes indexing and opening assignment;
- indexing precedes analysis;
- core onboarding completion does not wait for all requested analysis;
- readiness is feature-specific and evidence-based;
- exact persisted counts precede percentages and ETA;
- provider import is account-level durable work;
- imported-game `JobRun`/`JobTask` remains the indexing and analysis executor;
- the technical job panel remains separate from the product narrative;
- Player Chess Profile calculations are not duplicated;
- onboarding does not generate or mutate a repertoire.

This blueprint adds choreography, presentation constraints, reveal rules, and reusable module boundaries.

## 3. Current implementation diagnosis

### 3.1 What already exists

The repository already contains most of the eventual value surfaces:

- multiple Lichess and Chess.com external accounts;
- account-specific import and progress data;
- imported-game browsing;
- indexing and opening assignment;
- analysis, tags, and tactical detections;
- a durable imported-game job worker and technical progress panel;
- account performance dashboards;
- Player Chess Profile conclusions, breakdowns, evidence, and coverage;
- missed-shot scenario training from the user's analysed games;
- courses, training, and the Repertoire Builder.

The problem is therefore not an absence of capabilities. It is that setup and processing responsibilities are currently exposed as a settings and operations surface.

### 3.2 Why the current account surface is not onboarding

The current account page combines:

- provider selection;
- username and optional display-name fields;
- account creation;
- all-account refresh;
- per-account sync;
- indexing;
- analysis;
- default progress selection;
- cursor reset;
- enable/disable;
- deletion;
- sync counters and workflow actions.

This is a useful advanced management surface. It is too dense for first use because the user must understand internal stages before receiving value, and several destructive or operational actions compete with the primary setup action.

The onboarding route should orchestrate and explain. Settings should remain the place where advanced users inspect and control every account.

### 3.3 Existing Home behavior

Home already ranks a continue action and up to three recommendations using accounts, imported-game facets, performance, course state, analysis backlog, and recent games. That provides a useful structural precedent: show a small number of prioritized actions instead of reproducing every capability.

The future onboarding projection must replace Home's independent setup inference for onboarding state. Home should consume one authoritative server-owned preparation projection and present:

- a prominent Start or Resume treatment before core readiness;
- a compact background-preparation card afterward;
- one best available personal action;
- no duplicated orchestration logic.

### 3.4 Existing Player Chess Profile opportunity

Player Chess Profile already has the right conceptual primitives for evidence-backed reveals:

- positive and negative conclusions;
- evidence strength labels;
- sample labels and metrics;
- opening preference and performance breakdowns;
- selectable evidence;
- coverage and partial-analysis warnings.

Onboarding should not invent a second insight engine. It should consume a bounded, presentation-ready subset of the same canonical calculations or a shared derivative read model.

### 3.5 Existing personal tactics opportunity

Persisted tactical detections already identify missed shots, punished opponent blunders, and user blunders from completed analysis. Missed-shot detections can create scenario-training sessions sourced from the user's own games.

This is an unusually strong onboarding continuation because it turns abstract analysis into one immediate personal action. It must remain evidence-gated and optional; it cannot block onboarding completion.

## 4. Lightweight front-end standards

### 4.1 One dominant question or action

Every focused onboarding surface should answer one question:

- Which account should we start with?
- Is this the right public account?
- Shall we prepare the recent useful sample?
- What is happening now?
- What did we learn first?
- What should you try next?

A surface may include Back, Skip, Learn more, or Leave, but only one action should carry primary visual weight.

### 4.2 Progressive disclosure instead of compressed density

Do not compress the account settings page into a modal. Remove information until the next decision is obvious.

Default presentation rules:

- no tables during first-run onboarding;
- no more than three insight cards in one reveal;
- no more than one expanded detail panel at a time;
- advanced recipe controls remain collapsed;
- provider implementation terms such as cursor, archive, worker slice, claim, and task are hidden;
- exact technical jobs remain available through the existing global job panel;
- destructive account operations remain in Settings;
- long explanations appear on demand, not above the primary action.

### 4.3 Calm visual hierarchy

The lightweight experience should use the transformed shared UI system, not create a separate brand.

Recommended hierarchy:

1. one short outcome-oriented heading;
2. one supporting sentence;
3. one focused object: account, recipe, progress stage, insight, or puzzle;
4. one primary action;
5. optional quiet secondary action.

Avoid grids of equally prominent cards, dense metric strips, multiple colored status badges, and competing callouts.

### 4.4 Modal policy

A sequence of blocking modals is not the recommended architecture.

Use a dedicated `/onboarding` route or route-local focused panel for the durable journey. Reserve modal/dialog treatment for bounded confirmations or a small embedded action, such as confirming the detected account. Reasons:

- the route can be bookmarked and resumed;
- browser navigation remains understandable;
- compact and accessible layouts are easier;
- progress can continue while the user navigates elsewhere;
- the experience does not feel like a trap;
- deep links and login return URLs remain valid.

### 4.5 Motion policy

Motion should communicate state change, not manufacture urgency.

Permitted examples:

- a newly imported game count increments;
- a completed stage collapses into a checkmarked summary;
- a newly ready insight enters once;
- a progress track advances from a real persisted update;
- a subtle activity indicator accompanies an indeterminate provider operation.

Avoid:

- looping celebratory motion during long-running work;
- fake counters;
- automatically advancing steps before persisted confirmation;
- progress bars that jump according to elapsed time rather than completed work;
- confetti for routine background completion;
- motion that obscures partial failure.

Respect reduced-motion preference and preserve all meaning without animation.

### 4.6 Copy policy

Copy may be warm and lightly playful, but it must not become a mascot performance.

Good tone:

- "Let's start with the games you actually play."
- "Lichess is usually the quickest first look. Chess.com works too."
- "We found your games. Opening patterns are next."
- "Most players have another account somewhere. Add it when you're ready."
- "Your data will get sharper while you explore."

Avoid:

- claims that analysis is almost done without evidence;
- shame about weak results;
- overconfident recommendations from small samples;
- excessive jokes during failures;
- implementation vocabulary;
- pressure to add every account immediately.

## 5. Recommended end-to-end journey

The journey is expressed as product moments rather than a rigid step count. Some moments may merge on larger screens or separate on compact screens, but their decisions remain distinct.

### Moment 0 — Welcome: make the promise concrete

Purpose: explain the first-value loop in one sentence.

Suggested content:

- heading: "Find the opening patterns hidden in your games."
- support: "Connect one public chess account. We'll prepare a recent sample first and show useful results while deeper analysis continues."
- primary: "Connect an account"
- secondary: "Explore without setup" or "Skip for now" where the product supports it.

Do not introduce import, indexing, Stockfish, jobs, waves, or repertoire generation here.

### Moment 1 — Choose the first source

Show two large source choices, not a provider dropdown inside a form.

Recommended ordering:

1. Lichess;
2. Chess.com.

Lichess may be labelled as the fastest first look when benchmark and current provider behavior support that statement. It must remain a preference, not a forced platform choice.

Primary action after selection: "Continue with Lichess" or "Continue with Chess.com".

### Moment 2 — Add one public username

Show one username input and a provider identity. Hide display-name and advanced account settings.

Validation should distinguish:

- invalid syntax;
- public account not found;
- provider unavailable;
- account already connected;
- account belongs to another user where ownership rules apply;
- valid account with a compact confirmation summary.

The confirmation should show enough identity to prevent a typo, such as username, provider, current rating summary when safely available, and recent activity. It should not become a profile dashboard.

Primary: "Use this account".

### Moment 3 — Review the safe recipe

Present the default recipe as a human sentence:

> Recent three months · standard chess · blitz and rapid · rated and unrated

Primary: "Prepare my recent games".

Secondary: "Adjust" opens a restrained disclosure panel. The initial release should not expose unsupported scope choices merely because the future contract can represent them.

The recipe acceptance is the durable command boundary. Account connection alone must not start preparation.

### Moment 4 — Work begins: show an honest live narrative

The experience should immediately confirm that work is durable:

- "You can leave this page. We'll keep going."
- show the selected account;
- show the current product stage;
- show exact counts as soon as they exist;
- show one primary navigation action, such as "Explore the app".

Do not make the user click Next for every batch. The server owns advancement.

### Moment 5 — Import progress

The first-run run contains one account, so the focused progress surface can stay simple. Later expansion runs can show one compact row per account.

Recommended account progress content:

- account identity and provider;
- date scope;
- stage label: connecting, discovering, importing, retrying, paused, complete, needs attention;
- exact games discovered/imported/failed when known;
- provider-window or archive progress only when the denominator is fixed and understandable;
- most recent meaningful event;
- deterministic action when intervention is needed.

When total game count is not yet known, use an indeterminate track plus exact facts, not a guessed percentage.

Examples:

- "Checking your recent Lichess games… 42 imported so far."
- "2 of 3 Chess.com months checked · 67 games imported."
- "Games are arriving. Opening patterns will appear before the full import finishes."

### Moment 6 — First imported value

As soon as recent games are visible, the user can receive import-only facts that do not require opening assignment or engine analysis.

Potential facts:

- number of recent eligible games;
- white/black distribution;
- blitz/rapid mix;
- recent activity rhythm;
- win/draw/loss record with clear sample size;
- source/account coverage.

This is a trust moment, not the main reveal. Keep it to one or two facts and a link to recent games.

### Moment 7 — Indexing and opening assignment

The product narrative should say what indexing unlocks:

- "Naming your openings"
- "Grouping recurring positions"
- "Preparing opening evidence"

Avoid the generic word "indexing" as the only explanation.

Show exact selected/indexed/failed/remaining counts. The preparation may pipeline from committed import data according to ONB-003; the UI should not care whether the physical trigger is a batch, window, or terminal import.

### Moment 8 — First meaningful reveal

Trigger a reveal when a minimum feature-owned indexed evidence threshold is met. Do not wait for every selected game.

The first reveal should contain at most three cards:

1. a recognizable preference;
2. a performance or consistency signal;
3. one next investigation.

Example structure:

- "Your White games usually begin with 1.e4" — 31 of 42 indexed White games.
- "The Caro-Kann gives you your steadiest recent positions" — evidence grade and sample.
- "Your results drop most in early ...c5 structures" — only if the canonical calculation supports it.

Each card needs:

- plain-language summary;
- sample/evidence label;
- metric or comparison;
- state: preliminary, partial, ready, or checked-empty;
- optional "See evidence" action.

Do not show statistically weak output as a conclusion. A small sample can be shown as a curiosity with an explicit low-evidence label.

### Moment 9 — Analysis fast lane

The desired product direction is to make a small, recent, useful analysed sample available before the full three-month analysis tail.

The exact selection, ordering, priority, and wave size remain owned by ONB-003 and ONB-007. The UX contract should support:

- a high-priority first-analysis lane, potentially the most recent month or a deterministic representative subset;
- lower-priority continuation for the rest of the accepted three-month recipe;
- exact analysed/queued/running/failed counts;
- feature readiness changing incrementally;
- no completion language that hides the remaining low-priority tail.

Possible narrative:

- "We're analysing a first sample now."
- "12 games are ready for deeper insights; 58 continue in the background."
- "Your profile will improve as more games finish."

### Moment 10 — Personal performance insight reveal

When analysed evidence is sufficient, reveal a small set of high-interest insights. Prefer the structure used by OpeningFit's public product positioning: one thing to keep, one thing to repair, one next action. The implementation must use this product's own deterministic evidence.

Recommended reveal:

- **Keep:** a robust opening family or behavior supported by evidence;
- **Repair:** one recurring opening branch, mistake pattern, or performance gap;
- **Try next:** one concrete product action.

Examples of realistic insight families:

- most frequently played first move by color;
- opening family frequency and recent score;
- strongest/weakest evidence-backed opening family;
- result difference between familiar and unfamiliar branches;
- branch where opening exits happen earliest;
- recurrent tactical motif after a particular opening family;
- performance difference by speed where sample thresholds permit;
- openings with high exposure but low coverage or low confidence;
- analysis coverage warnings.

Do not conflate correlation with causal advice. Use wording such as "in this recent sample" and link to evidence.

### Moment 11 — One puzzle from the user's game

When a high-confidence missed-shot scenario exists, offer one personal puzzle:

- heading: "You had a tactical chance here."
- context: opponent, date, opening, and move number as appropriate;
- primary: "Find the move";
- secondary: "Later".

The scenario-training feature remains the execution surface. Onboarding only chooses an eligible ready destination supplied by the server or feature contract.

If no suitable scenario exists, omit the module. Do not substitute an unrelated generic puzzle merely to preserve the layout.

### Moment 12 — Optional Repertoire Builder bridge

Offer a Builder entry only when:

- the Builder integration is production-ready;
- enough indexed/profile evidence exists for a meaningful anchor;
- the user is no longer waiting on a required onboarding action;
- the destination can receive an explicit, inspectable context.

Suggested framing:

- "Turn this weak branch into a plan"
- "Start a repertoire for your most common White positions"
- "Build a response to the opening that costs you most often"

The handoff may provide defaults or an anchor, but the user must remain in control. Onboarding must not choose moves, create courses, or apply repertoire changes.

### Moment 13 — Completion and Home re-entry

Core onboarding completion is a quiet transition, not an ending screen that implies all work is done.

Recommended completion state:

- "Your recent games are ready to explore."
- show one best available action;
- explain that deeper analysis continues;
- offer optional account/history expansion;
- move the durable progress summary to Home.

Home after core readiness should show:

- one compact preparation card while analysis continues;
- one current best action;
- newly ready insights only when meaningful;
- a route back to full progress and recovery controls.

## 6. Multi-account strategy

### 6.1 Preserve one-account first value

The first accepted preparation recipe uses one selected account. This is the correct default because it:

- minimizes decisions;
- reduces duplicate or conflicting identities;
- creates an understandable progress denominator;
- gives the fastest chance of a useful result;
- matches the existing locked lifecycle contract.

### 6.2 Offer additional accounts at the right time

Additional accounts should be offered in one of three moments:

1. after the first account is accepted but before recipe review, as a quiet "add later" note, not a second required form;
2. after the first meaningful indexed reveal;
3. on completion/Home as an expansion action.

Suggested microcopy:

> Most players have another account somewhere. Add it after this first look, and we'll combine the evidence carefully.

### 6.3 Expansion behavior

Each additional account should create an explicit expansion recipe/run. The UI may show several account rows when expansion work overlaps, but it must preserve:

- account-specific provider progress;
- account-specific failures and retries;
- an understandable aggregate preparation summary;
- duplicate-safe game handling;
- selected/default profile context;
- clear inclusion in combined insights.

The exact multi-account ordering and fairness policy remain ONB-003 decisions.

### 6.4 Aggregation and identity questions

Before combined multi-account insights ship, implementation must define:

- how the same real-world game imported from two providers is deduplicated or excluded from aggregates;
- whether accounts can represent different people;
- which account is the default progress identity;
- how rating bands and provider differences affect profile evidence;
- how account removal changes derived results;
- how evidence labels disclose mixed-source samples.

## 7. Truthful progress that still feels active

### 7.1 Never fabricate movement

The request for numbers that "move faster" should be interpreted as a request for more frequent truthful feedback, not artificial percentages.

The interface can feel alive by showing multiple real progress dimensions:

- provider windows checked;
- archives checked;
- games seen;
- games imported;
- eligible games selected;
- games indexed;
- openings named;
- games analysed;
- insights newly ready;
- failures isolated;
- most recent completed item or stage.

A user is more reassured by a truthful event stream than by a smooth but fictional bar.

### 7.2 Progress hierarchy

Show progress in three layers:

1. **Product stage** — importing, preparing openings, analysing, ready with background continuation.
2. **Focused exact facts** — the two or three counts relevant to the current stage.
3. **Technical detail** — link to the global job panel or advanced progress view.

### 7.3 Percentage rules

A percentage is permitted only when:

- the denominator is fixed and persisted;
- completed and terminal-failure outcomes are defined;
- newly arriving data cannot silently expand the denominator;
- the label explains what the percentage represents.

Examples:

- indexed 35 of 50 selected games;
- 2 of 3 fixed provider months checked;
- analysed 12 of 35 requested indexed successes.

Do not combine import, indexing, and analysis into one arbitrary weighted percentage.

### 7.4 ETA rules

No ETA, "almost done", or completion promise is shown until ONB-007 approves an evidence-based policy. Even after approval, ETA should be secondary to exact counts and use a confidence/range model appropriate to provider and engine variability.

### 7.5 Stalled and failed work

A lack of count movement is not automatically failure. The projection should distinguish:

- active but indeterminate provider request;
- queued work;
- worker running;
- paused;
- retry scheduled;
- provider throttled;
- stale claim or suspected stall;
- terminal partial failure;
- user action required.

Only show a recovery action supplied by the server contract.

## 8. Evidence and insight architecture

### 8.1 Readiness ladder

Insight modules should declare the minimum evidence they consume:

| Evidence level | Available examples | Not yet safe |
| --- | --- | --- |
| Account accepted | provider identity, account summary | game claims |
| Import-only | activity, W/D/L, color/speed mix, recent games | opening conclusions, engine claims |
| Indexed | opening frequency, opening family distribution, named coverage, branch exposure | tactical and evaluation conclusions |
| Partially analysed | bounded analysed findings with partial warnings | complete-profile language |
| Analysed threshold met | canonical performance conclusions, tactical motifs, puzzle candidates | claims beyond selected scope |
| Expanded history/accounts | broader trends with mixed-source disclosure | silent comparison to first-run sample |

### 8.2 Shared insight module contract

A reusable insight item should contain at least:

- stable insight type;
- plain-language summary;
- evidence state;
- sample size and scope;
- primary metric and optional comparison;
- account/provider/color/speed/date context;
- deterministic destination or evidence action;
- generated-at and evidence-version identifiers;
- warning/reason when unavailable or partial.

Onboarding may choose a small ordered subset for presentation, but the server or canonical feature service must own eligibility and evidence truth.

### 8.3 Reuse beyond onboarding

The same insight items should be usable in:

- Player Chess Profile;
- Home recommendations;
- account progress pages;
- opening analysis;
- post-import notifications;
- future mobile onboarding;
- Builder launch context.

Onboarding is the first storyteller, not the permanent owner.

### 8.4 Ranking principles

Rank insights for first reveal by:

1. evidence sufficiency;
2. personal recognizability;
3. actionability;
4. novelty relative to already shown items;
5. diversity of type;
6. stability as more evidence arrives.

Avoid selecting three negative cards or three versions of the same frequency fact.

## 9. Competitor synthesis

### 9.1 Chessbook — closest category competitor

Chessbook is the closest direct competitor because it combines custom repertoire building, spaced repetition, gap detection, online-game mistake review, model games, and support for both Lichess and Chess.com. Its public positioning emphasizes speed, modernity, coverage, and focusing on moves the player is likely to encounter.

Applicable lessons:

- connect online games directly to repertoire work;
- make gaps and coverage understandable;
- reduce irrelevant theory;
- preserve a tight build/train/review loop.

Do not copy:

- a feature-dense repertoire-first surface before the user's own evidence is prepared;
- confidence or coverage claims without explicit evidence context;
- any UI pattern that obscures the distinction between imported results and a chosen repertoire.

Source: [Chessbook Google Play listing](https://play.google.com/store/apps/details?id=com.chessbook.android), reviewed 2026-07-30.

### 9.2 OpeningFit — closest first-payoff pattern

OpeningFit publicly presents a username-first flow and promises three practical decisions: best fit, biggest issue, and next action. It explicitly labels small samples and recommends a recent rapid/blitz mix.

Applicable lessons:

- one public username can be enough to start;
- the first report should answer a few high-value questions rather than expose a dashboard;
- show one keep, one repair, and one next action;
- evidence labels increase trust;
- let users preview the report structure before importing.

Source: [OpeningFit](https://www.openingfit.com/), reviewed 2026-07-30.

### 9.3 OpenBook — lightweight interaction benchmark

OpenBook explicitly targets a simple and intuitive repertoire builder/trainer, offers a no-account trial, and reviews recent Lichess or Chess.com games in the browser.

Applicable lessons:

- a lightweight product can expose powerful chess data without a management-dashboard feel;
- progressive trust can start with a trial or narrow first task;
- build and practice modes should remain conceptually distinct;
- user ownership and exportability are strong trust signals.

Source: [OpenBook](https://openbookchess.com/), reviewed 2026-07-30.

### 9.4 OpeningTree — source-selection pattern

OpeningTree uses a visible sequence for rules, source, player details, color/filters, and analysis.

Applicable lesson:

- provider/source choice can be a dedicated focused decision rather than a dropdown inside a dense settings form.

Caution:

- the full source/filter wizard is more operational than the desired first-run experience. Most scope should stay in the accepted default recipe.

Source: [OpeningTree](https://www.openingtree.com/), reviewed 2026-07-30.

### 9.5 Product differentiation

The opportunity is not merely another repertoire trainer. The differentiating loop is:

```text
real recent games
  → progressively prepared evidence
  → explainable personal opening profile
  → one personal tactical or opening action
  → human-controlled repertoire construction
  → training and future outcome feedback
```

The onboarding should demonstrate that loop in miniature.

## 10. ChatGPT Sites, Codex, and Figma workflow

### 10.1 Product identification

The relevant OpenAI feature is **ChatGPT Sites**, currently a public beta for creating, previewing, refining, hosting, and sharing interactive websites and lightweight apps from ChatGPT Work or Codex.

The phrase "Cloudy Design" does not identify a verified product in the researched sources. The likely intended workflow is ChatGPT Sites and/or the Codex-to-Figma integration.

### 10.2 Current availability caveat

As of 2026-07-30, official OpenAI documentation says Sites availability depends on plan, region, rollout, and workspace settings; the launch FAQ states that Sites is not available in the EEA, Switzerland, or the United Kingdom at launch. Denmark is in the EEA, so the practical workflow needs a fallback until availability reaches the account.

Sources:

- [Creating and managing ChatGPT Sites](https://help.openai.com/en/articles/20001339)
- [ChatGPT Sites developer guide](https://learn.chatgpt.com/docs/sites)

### 10.3 Recommended role: executable design reference

Use Sites to create an interactive, high-fidelity state prototype. Do not make it the production frontend or connect it to production chess data.

The prototype should answer:

- Does the sequence feel light?
- Is the next action obvious?
- Does progress remain understandable?
- Do partial and failure states preserve trust?
- Are reveal moments engaging without becoming a dashboard?
- Does the experience work at narrow widths and with reduced motion?

The Angular application remains the production implementation because it already owns authentication, routes, typed contracts, state, design tokens, and feature integration.

### 10.4 Prototype input package

Before prompting Sites or Figma Make, prepare a small reviewed package:

1. this experience blueprint;
2. the locked lifecycle and progress decisions;
3. screenshots of current transformed shared primitives and profile cards;
4. a state matrix with synthetic fixtures;
5. explicit desktop, tablet, and narrow-width constraints;
6. accessibility and reduced-motion requirements;
7. prohibited patterns;
8. expected prototype outputs.

Do not provide:

- real user PGNs or account data;
- API keys, cookies, Clerk tokens, or environment files;
- production database access;
- private provider credentials;
- the entire repository when a narrow prototype package suffices.

### 10.5 Recommended prototype fixtures

Create typed synthetic fixtures for at least:

- new user/no account;
- valid Lichess account;
- valid Chess.com account;
- invalid or unavailable account;
- recipe review;
- import indeterminate with games arriving;
- fixed-window import progress;
- partial import failure;
- indexing progress;
- first indexed insight ready;
- partial analysis;
- first tactical scenario ready;
- no suitable tactic;
- skipped guidance with background work active;
- core ready with analysis continuing;
- additional account expansion;
- returning session/device;
- paused, retryable, and terminal attention states.

### 10.6 Sites workflow

When Sites is available:

1. Start in ChatGPT Work on web or Work/Codex in the desktop app.
2. Mention `@Sites` or explicitly request a website prototype.
3. Attach the narrow prototype package and synthetic fixtures.
4. Ask for an interactive prototype, not a production deployment.
5. Review the private preview.
6. Iterate on one design question at a time.
7. Save a version without deploying; every deployment URL is a production deployment.
8. Review responsive, keyboard, focus, reduced-motion, loading, partial, and failure states.
9. Keep access owner-only or narrowly shared.
10. Record the accepted version and the decisions it demonstrates.
11. Export or inspect local source only as a reference; review all generated source and migrations.
12. Translate the accepted interaction model into Angular under ONB-010 and VT-302 constraints.

Sites can link a compatible local source project to managed hosting and associate saved versions with Git commits. That is useful for traceability, but compatibility with the Angular workspace and its background services must not be assumed. Sites documentation explicitly notes that some frameworks, private networks, databases, background services, and hosting patterns are unsupported.

### 10.7 Prompt template

```text
@Sites Build a private interactive prototype for the onboarding flow of a chess
opening-improvement application.

Audience:
- adult online chess players who use Lichess and/or Chess.com;
- many are not technical and should not see queue, worker, cursor, or indexing jargon.

Primary outcome:
- connect one public chess account;
- accept a recent three-month blitz/rapid preparation recipe;
- see truthful progressive import, opening preparation, and analysis feedback;
- receive an early evidence-backed opening insight;
- optionally solve one tactical opportunity from a personal game;
- later add another account or enter a human-controlled repertoire builder.

Interaction rules:
- one dominant action per focused surface;
- dedicated route-like flow, not a chain of blocking modals;
- no onboarding tables;
- no more than three insight cards at once;
- advanced settings collapsed;
- user can leave while work continues and resume later;
- progress uses only fixture-backed exact counts or indeterminate state;
- never fabricate percentages or ETA;
- distinguish core-ready from deeper analysis still running;
- use warm restrained copy and limited motion;
- support reduced motion, keyboard focus, screen-reader labels, 200% zoom,
  desktop, tablet, and narrow phone widths.

Technical constraints:
- use only the attached synthetic fixture data;
- no production APIs, authentication secrets, real usernames, PGNs, or personal data;
- treat lifecycle state as server-owned fixture input;
- make every state directly selectable for review;
- keep the prototype removable and independent from production architecture.

Deliver:
- interactive state prototype;
- state selector for review only;
- component inventory;
- interaction notes;
- responsive behavior notes;
- motion and reduced-motion notes;
- accessibility checklist;
- copy deck;
- a list of assumptions and unresolved product questions.
```

### 10.8 Codex-to-Figma workflow

OpenAI and Figma announced a round-trip integration through the Figma MCP Server: Codex can turn UI from code into editable Figma designs, and can consume Figma Design, Figma Make, or FigJam context to implement changes back in code.

This is the better collaboration path when the goal is editable design craft rather than hosted Site behavior:

1. build or extract the narrow prototype UI;
2. send it to Figma as editable layers;
3. refine hierarchy, spacing, typography, responsive variants, and states in Figma;
4. annotate interaction and accessibility behavior;
5. bring only accepted Figma context back to Codex;
6. implement against existing Angular primitives and tokens;
7. compare production output to the accepted prototype, not to generated source structure.

Source: [OpenAI Codex and Figma launch seamless code-to-design experience](https://openai.com/index/figma-partnership/), 2026-02-26.

### 10.9 Fallback while Sites is unavailable in EEA

Use one of these paths:

- Figma Make/Design + Codex/Figma MCP for an editable prototype;
- a repository-local static prototype under an explicitly non-production prototype directory;
- Storybook-style or fixture-driven Angular components on a dedicated prototype branch;
- screenshots and interaction specs generated from synthetic states.

The same state matrix and review gates apply.

### 10.10 Required handoff artifacts

A prototype is accepted only when it produces:

- approved journey/state map;
- exact component inventory;
- content/copy deck;
- responsive rules;
- motion and reduced-motion rules;
- focus and keyboard behavior;
- empty, partial, error, recovery, and returning states;
- token mapping to the repository design system;
- behavior-to-server-contract map;
- list of generated assumptions that production must reject or resolve;
- screenshots or saved version identifier;
- implementation checklist for ONB-010/VT-302.

Generated framework choices, storage, authentication, and routing are not accepted handoff artifacts.

## 11. API and projection implications

The UI should consume one onboarding projection that can express:

- user disposition;
- current preparation run and accepted recipe;
- selected account and provider;
- import stage and exact counters;
- indexing stage and exact counters;
- analysis stage and exact counters;
- core readiness and deeper-work continuation;
- feature-specific readiness;
- newly ready reveal modules;
- deterministic allowed actions;
- deterministic destinations;
- warnings and attention reasons;
- latest meaningful milestone;
- optional expansion recommendations.

The projection should not embed large game ID arrays or raw technical job graphs. Technical child jobs remain available separately.

A possible presentation-oriented shape, subject to ONB-003/008/009 naming decisions:

```ts
interface OnboardingExperienceProjection {
  disposition: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  presentation: 'NEW' | 'CONNECT_ACCOUNT' | 'REVIEW_RECIPE' | 'ACTIVE' | 'ATTENTION' | 'CORE_READY';
  run: PreparationRunSummary | null;
  account: AccountSummary | null;
  stages: {
    import: StageProgress;
    index: StageProgress;
    analysis: StageProgress;
  };
  readiness: readonly FeatureReadiness[];
  reveals: readonly InsightReveal[];
  primaryAction: AllowedAction | null;
  secondaryActions: readonly AllowedAction[];
  latestMilestone: MilestoneSummary | null;
}
```

This is a UX requirement example, not a finalized API contract.

## 12. Failure and recovery experience

### 12.1 Account connection failure

Keep the entered provider and username. Explain whether the problem is spelling, visibility, provider availability, ownership, or an unknown error. Offer one deterministic retry or correction action.

### 12.2 No recent eligible games

Do not silently complete. Present a focused choice supplied by the lifecycle contract:

- try another account;
- expand the date range;
- include another supported speed later;
- finish/skip explicitly where allowed.

### 12.3 Partial provider import

Show imported facts that are safe, identify that coverage is incomplete, and provide retry/pause/cancel actions only when server-allowed. Do not present incomplete coverage as the whole three-month sample.

### 12.4 All indexing failed

Do not show opening conclusions. Explain that games arrived but opening preparation failed, and expose deterministic retry/support/finish behavior.

### 12.5 Partial indexing or analysis

Ready modules may appear with partial coverage labels. Failed games remain visible in progress and evidence warnings. The UI should avoid making the whole experience look failed when useful evidence exists.

### 12.6 Long-running analysis

Core readiness may complete. Home retains a compact background card. The user receives new insight or tactic prompts only when a meaningful readiness transition occurs.

### 12.7 Leave and return

On return from any route/session/device, derive the appropriate focused surface from the server projection. Do not replay welcome or reveal animation merely because local state was lost.

## 13. Privacy and security

- Public chess usernames are still personal identifiers and must be handled under product privacy rules.
- Clearly explain that public provider games will be imported and processed.
- Do not expose another user's connected account or preparation state.
- Preserve server authorization for every account, run, insight, game, and scenario destination.
- Generated prototypes use synthetic data only.
- ChatGPT Sites should remain private during review.
- Do not place secrets in Sites prompts, attachments, code, or `.openai/hosting.json`.
- Sites does not support data or inference residency at launch; this reinforces the synthetic-data-only rule for this prototype.
- Public prototype publishing requires explicit review and is unnecessary for the initial design process.
- Analytics events must not include PGN, move lists, provider tokens, or sensitive free-text.

## 14. Performance and first-value budgets

ONB-007 owns measured budgets. This blueprint defines the milestones that should be measured:

- time from account acceptance to durable run creation;
- time to first imported game;
- time to first visible recent-games result;
- time to first indexed game;
- time to minimum indexed insight threshold;
- time to first analysed game;
- time to first analysed insight;
- time to first personal tactical scenario;
- time to core readiness;
- time to accepted recipe completion;
- time to expansion completion.

Product targets should prioritize the first meaningful indexed reveal, not full analysis.

## 15. Product analytics

Measure the funnel without turning onboarding into a growth trap:

- welcome viewed;
- provider selected;
- account validation success/failure reason;
- account accepted;
- recipe viewed/adjusted/accepted;
- durable run started;
- user left while work active;
- user returned;
- first imported value viewed;
- first indexed reveal viewed;
- evidence inspected;
- tactical scenario offered/started/completed;
- second account offered/accepted;
- core readiness reached/viewed;
- Builder entry offered/used;
- skip, pause, cancel, retry, and recovery outcomes;
- time-to-value milestone distributions.

Use these metrics to find friction and stalled states, not to pressure users into completing every optional action.

## 16. Accessibility and responsive requirements

VT-302 owns final validation, but ONB-010 must build accessible behavior from the start.

Required behavior:

- semantic headings and landmarks;
- keyboard-operable source choices, disclosures, actions, and insight evidence;
- visible focus;
- status announcements that do not repeat on every poll;
- no color-only readiness or failure meaning;
- progress semantics with labels and exact values;
- reduced-motion equivalent;
- no timed auto-advance;
- 200% zoom without action loss;
- narrow-phone layout with one focused column;
- touch targets appropriate for compact devices;
- plain-language errors associated with fields/actions;
- focus restoration after dialogs and route-local state transitions;
- reveal content available without animation.

## 17. Delivery slices

### Slice A — Functional calm skeleton

- Home Start/Resume and `/onboarding` route;
- provider and username connection handoff;
- default recipe review;
- durable start/skip/leave/return;
- exact stage/count progress;
- partial/failure/recovery states;
- core-ready transition.

This is ONB-010's minimum release.

### Slice B — First indexed reveal

- shared insight item/readiness contract;
- at most three indexed evidence cards;
- evidence inspection route;
- Home newly-ready action.

### Slice C — Analysed reveal and personal tactic

- analysed insight threshold and selection;
- keep/repair/next-action presentation;
- one eligible personal missed-shot scenario handoff;
- absence behavior when no tactic exists.

### Slice D — Multi-account expansion

- add another account after first value;
- expansion recipe and account-level progress;
- mixed-source evidence disclosure;
- duplicate and identity rules.

### Slice E — Repertoire Builder bridge

- deterministic evidence anchor;
- optional Builder destination;
- no automatic move/course decisions;
- outcome feedback later through the Builder program.

### Slice F — Prototype and final craft

- fixture-driven Sites/Figma/static prototype;
- VT-302 responsive/accessibility/motion review;
- final token and component integration;
- browser validation against the state matrix.

## 18. Rejected alternatives

### 18.1 Giant onboarding dashboard

Rejected because it reproduces the current overload and asks the user to understand the whole data lifecycle at once.

### 18.2 Blocking modal train

Rejected because it traps navigation, weakens re-entry, and encourages browser-owned progression. Small confirmations may use dialogs; the durable experience should be route-based.

### 18.3 Add every account before starting

Rejected as a default because it delays first value and conflicts with the locked one-account first run. Additional accounts are explicit expansion.

### 18.4 Wait for full analysis before showing value

Rejected because indexing and import already unlock useful evidence, and engine analysis may be the slowest stage.

### 18.5 Fake or time-smoothed progress

Rejected because it damages trust and conflicts with exact persisted progress decisions.

### 18.6 Duplicate Player Chess Profile logic in Angular

Rejected because it creates inconsistent conclusions and a second recommendation engine.

### 18.7 Automatically create a repertoire during onboarding

Rejected because repertoire choices are human-controlled and owned by the Builder program.

### 18.8 Adopt ChatGPT Sites output as production architecture

Rejected because the runtime/framework may not match the Angular modular monolith, some background/service patterns are unsupported, and generated assumptions require review.

### 18.9 Introduce a separate onboarding visual identity

Rejected because the experience should demonstrate the transformed product system at its best, not compete with it.

## 19. Decision summary

The recommended product contract is:

1. route-based, resumable, non-blocking onboarding;
2. one selected account and one dominant decision at a time;
3. Lichess-first suggestion only as a truthful speed optimization;
4. recent three-month blitz/rapid recipe accepted explicitly;
5. durable background work with exact granular milestones;
6. import-only value, then indexed reveal, then analysed reveal;
7. no more than three reveal cards;
8. canonical evidence and readiness reused across product surfaces;
9. one optional puzzle from the user's own game when available;
10. additional accounts after first value;
11. optional evidence-anchored Builder entry;
12. Sites/Figma as prototype and design-handoff tools, Angular as production;
13. synthetic data and private review for generated prototypes;
14. final visual/accessibility polish coordinated with VT-302.

## 20. Remaining delegated questions

ONB-003:

- exact analysis fast-lane selection and ordering;
- multi-account expansion ordering and fairness;
- import-to-index pipeline cadence;
- wave and queue topology;
- parent pause/cancel/retry reconciliation.

ONB-007:

- truthful provider and stage performance budgets;
- whether Lichess-first speed copy is defensible;
- wave size;
- ETA policy;
- stalled-work thresholds.

ONB-008/009:

- exact projection, readiness, allowed-action, milestone, and reveal payload names;
- idempotent command and recovery behavior.

ONB-010:

- exact transformed primitives and component decomposition;
- polling/event cadence;
- compact Home versus full route composition;
- first implementation slice.

VT-302:

- final visual density, typography, responsive, accessibility, and motion acceptance.

Player Chess Profile:

- canonical insight-selection API suitable for small onboarding reveals;
- minimum evidence thresholds and evidence versioning.

Repertoire Builder:

- exact evidence anchor and destination contract;
- when the Builder is ready to receive onboarding traffic.

Product/privacy:

- combined-account identity and duplicate-game semantics;
- event taxonomy and retention;
- consent/copy requirements for public provider data.
