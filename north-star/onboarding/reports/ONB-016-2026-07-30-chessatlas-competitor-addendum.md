# ONB-016 ChessAtlas Competitor Addendum

Date: 2026-07-30

Issue: [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224)

Pull request: [#225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Status: review addendum

This append-only note extends `ONB-016-2026-07-30-lightweight-onboarding-experience-blueprint.md` after an explicit request to research ChessAtlas. It does not change runtime scope or claim decisions owned by ONB-003, ONB-007, ONB-010, VT-302, Player Chess Profile, or Repertoire Builder.

## 1. Outcome

ChessAtlas materially changes the competitor ranking recorded in the initial ONB-016 report.

**ChessAtlas is the closest publicly documented end-to-end loop competitor**, because its central product loop is:

```text
build or fork a repertoire
  → link Lichess or Chess.com
  → import played games
  → detect the exact move where preparation was left
  → return that position to spaced-repetition training
  → strengthen recurring weak lines
```

Chessbook remains a broad direct category competitor. OpeningFit remains the strongest first-payoff/onboarding reference. OpenBook remains the lightweight interaction reference. OpeningTree remains the source-selection reference.

This note therefore supersedes only the earlier wording that called Chessbook the single closest direct competitor. It does not invalidate the lessons already recorded for Chessbook.

## 2. Product disambiguation

Two recently published products use nearly the same name:

1. **ChessAtlas / chessatlas.net**, operated by ANKT SERVICES in France, with the Android package `net.chessatlas.app`. This is the product relevant to ONB-016.
2. **Chess Atlas / thechessatlas.com**, published by Luhem Labs with Android package `com.thechessatlas.app`. It is an offline-oriented pocket workstation combining a repertoire book, Stockfish, master games, drills, and position watches. It is a separate product and was not used as the primary comparison here.

Any future competitor note must identify the domain or package rather than relying on the name alone.

## 3. Publicly documented ChessAtlas product loop

ChessAtlas publicly positions itself around the problem that prepared opening lines are forgotten and real-game mistakes do not automatically return to study.

Its documented loop is:

1. build a repertoire from scratch, import PGN, or fork a library course;
2. train it through FSRS-based spaced repetition;
3. link Lichess or Chess.com accounts;
4. import new games automatically;
5. detect the exact move where the player or opponent left the stored repertoire;
6. expose repertoire gaps, opponent novelties, trends, and deviation history;
7. add missing lines;
8. train the affected positions again.

The strongest product concept is not generic game analysis. It is the conversion of one exact real-game deviation into one exact trainable position.

## 4. Why ChessAtlas is especially relevant

### 4.1 It closes the play-to-study loop

The direct connection between played games and the review queue is the closest public analogue to the long-term Chess Repertoire Trainer direction:

```text
played evidence
  → exact repertoire/course gap
  → inspectable Builder anchor
  → accepted course change
  → training
  → future outcome feedback
```

The repository already has many of the required pieces:

- imported games;
- indexed positions and opening assignment;
- Course endings and Opponent gaps exact-source entry points;
- the evidence-ranked, human-controlled Repertoire Builder;
- course review and training;
- tactical scenarios from real games.

The remaining differentiation is to connect these pieces without creating a second recommendation or course-write engine.

### 4.2 It makes the next action concrete

“Your repertoire coverage is weak” is abstract. “You left your preparation here on move 9; add or train this position” is concrete.

The ONB-016 insight contract should therefore support a future exact-anchor item such as:

```text
REPERTOIRE_DEVIATION
- imported game id
- source account/provider
- exact ply/position anchor
- user or opponent deviation
- existing course/repertoire context
- observed move
- occurrence count
- evidence scope
- deterministic inspect destination
- deterministic Builder or training destination when allowed
```

This is not a requirement for first-run onboarding. It becomes available only when a user has an applicable course/repertoire and the exact source relationship is authoritative.

### 4.3 It treats improvement as continuous

ChessAtlas describes automatic account sync and a recurring cycle rather than a one-time import project. The relevant lesson is that onboarding should establish a durable product habit:

```text
play
  → sync
  → receive one meaningful new finding
  → inspect or train it
  → return to play
```

The first-run route should demonstrate this loop once. Home and post-sync surfaces should own its recurring form afterward.

## 5. The most important differentiation opportunity

ChessAtlas deviation detection is repertoire-relative. Its own import guide notes that when no repertoire exists, every move may effectively appear as a deviation and recommends building a repertoire first.

Chess Repertoire Trainer can produce meaningful personal value **before a repertoire exists**:

- recent activity and performance facts after import;
- named openings and recurring positions after indexing;
- evidence-backed Player Chess Profile findings;
- personal tactical scenarios after analysis;
- only then an optional, evidence-anchored Builder entry.

Recommended differentiation:

```text
ChessAtlas
existing repertoire → real-game deviation → drill

Chess Repertoire Trainer
real games → personal evidence/profile/tactics → human-controlled repertoire decision → training
```

This supports the current one-account, recent-first onboarding direction and argues against forcing repertoire creation before the first useful reveal.

## 6. Applicable product lessons

### 6.1 Adopt: one exact gap can be more engaging than three abstract metrics

When an authoritative repertoire relationship exists, prefer a concrete exact-position action over a generic dashboard card.

Possible presentation:

- “You left your course here in 4 recent games.”
- show opening, move number, observed response, and evidence count;
- primary: “Inspect the gap”;
- secondary: “Later”.

The destination must remain the existing exact-source review/Builder flow, not an onboarding-owned editor.

### 6.2 Adopt: public-account connection copy

ChessAtlas clearly states that Lichess can be connected with a public username and no password, and that only public game data is used.

ONB-010 should use similarly direct trust copy:

- which public data is read;
- that provider passwords are not requested;
- what preparation will be performed;
- that the account can be disconnected;
- where deletion and lifecycle controls live.

### 6.3 Adopt: build, train, review as one understandable loop

The public ChessAtlas flow is easy to explain because it uses three product verbs. Chess Repertoire Trainer should also keep its value narrative compact, even though its backend stages are more sophisticated.

Recommended user-facing loop:

```text
Understand your games → build a plan → train what matters
```

Import, indexing, engine work, tagging, detection, profile calculation, and Builder evidence remain implementation details beneath those verbs.

### 6.4 Adopt carefully: time-to-first-review aspiration

ChessAtlas markets “2 minutes to first review” in its comparison material. That is a strong product promise, but it is first-party marketing and not independently verified here.

Chess Repertoire Trainer should turn this into a benchmark question, not copy the claim:

- time to first imported game;
- time to first named opening;
- time to first indexed insight;
- time to first analysed insight;
- time to first personal tactic;
- time to first exact course/repertoire gap.

ONB-007 remains the owner of measured budgets and any public timing language.

### 6.5 Adopt: mobile and short-session continuity

ChessAtlas offers web, iOS, and Android clients and frames review as a recurring short activity. The future mobile client should consume the same server-owned readiness, insight, exact-anchor, and training contracts rather than recreating onboarding or deviation logic locally.

### 6.6 Adopt: multilingual product readiness as a later concern

ChessAtlas publicly supports six languages. This is not a current onboarding dependency, but it reinforces two implementation rules:

- do not embed product sentences in backend status enums;
- keep status/action codes stable and localize presentation copy in clients.

## 7. Patterns not to copy

### 7.1 Do not require repertoire-first onboarding

Repertoire-first setup would delay the strongest existing product assets: Player Chess Profile, personal opening evidence, and own-game tactics.

The Builder remains an optional continuation after enough evidence exists.

### 7.2 Do not collapse durable processing into one synchronous ingest operation

A ChessAtlas guide describes classification and deviation computation during ingest and also advises splitting large PGN imports when bulk import times out.

Chess Repertoire Trainer should preserve its approved durable architecture:

- account-level resumable import;
- bounded persistence;
- indexing as a distinct observable stage;
- analysis as a distinct observable stage;
- partial value before the full tail;
- retry without losing proven coverage.

The UX may feel like one flow, but the runtime must not become one fragile request.

### 7.3 Do not auto-mutate the training queue or repertoire without an explicit contract

ChessAtlas publicly describes deviations returning to training automatically. In this repository, course and Builder state have stronger human-control and ownership boundaries.

A future exact deviation may:

- appear as an insight;
- link to Course review;
- launch Builder at an exact source anchor;
- create training only after the established course/scenario command accepts it.

It must not silently add course moves or choose repertoire responses.

### 7.4 Do not hide evidence quality behind “pinpoint” marketing

Exact move matching can be deterministic while the recommended response, importance, recurrence, and learning priority remain evidence-dependent.

Every finding should distinguish:

- exact observed event;
- inferred gap or interpretation;
- sample and recurrence;
- recommended action;
- confidence/evidence state.

### 7.5 Do not copy entitlement ambiguity

ChessAtlas public pages are not fully consistent about free-tier game import and deviation access:

- the landing page and import article describe game import as a core/free capability;
- the pricing page lists game import, analysis, and deviation detection under Premium while also allowing two linked accounts on Free;
- some comparison pages describe deviation detection as included on the free tier, while other copy labels it Premium.

This may reflect an active beta or changing packaging, but it creates avoidable uncertainty.

Chess Repertoire Trainer should expose one authoritative server-provided entitlement/capability state and keep landing, onboarding, Settings, and execution behavior consistent.

## 8. Multi-account implications

ChessAtlas's free plan publicly allows two linked accounts and Premium allows unlimited accounts. Public material does not establish how combined identity, duplicate games, rating contexts, or mixed-provider evidence are handled.

This supports, rather than weakens, the ONB-016 recommendation:

- first run uses one account;
- additional accounts are explicit expansions;
- each account keeps exact provider progress and failure state;
- mixed evidence discloses its source scope;
- same-game duplication and account identity remain explicit decisions;
- “unlimited linked accounts” is not equivalent to trustworthy combined analysis.

## 9. Maturity and evidence caveats

The evaluated ChessAtlas product is recent:

- its Android listing was updated on 2026-06-07;
- the listing showed 50+ downloads at review time;
- most detailed product evidence comes from ChessAtlas's own landing, feature, pricing, comparison, and blog pages;
- no broad independent review base was identified in this research.

Therefore:

- product capabilities and messaging are relevant competitor evidence;
- reliability, actual onboarding conversion, retention, import performance, and user satisfaction are not established;
- first-party timing, accuracy, and algorithm-comparison claims must not be treated as independently verified benchmarks.

## 10. Revised competitor map

| Product | Strongest relevance to this program |
| --- | --- |
| ChessAtlas | closest end-to-end real-game → exact repertoire deviation → retraining loop |
| Chessbook | broad repertoire building, gap detection, training, and online-game review competitor |
| OpeningFit | best public-username and compact first-payoff reference |
| OpenBook | lightweight interaction and ownership reference |
| OpeningTree | focused source/provider selection reference |

## 11. Direct implications for ONB-010

ONB-010 should retain its current blueprint and add the following review criterion:

- when no repertoire/course exists, first payoff comes from imported/indexed/profile/tactical evidence;
- when an applicable repertoire/course exists, one exact recurring deviation or course gap may outrank a generic insight card;
- the exact gap is a deterministic destination supplied by canonical feature logic;
- onboarding never writes course or training state directly;
- ongoing post-game deviation notifications belong to Home or a later recurring workflow, not the first-run route;
- entitlement and privacy copy are explicit and consistent.

## 12. Direct implications for Repertoire Builder and Course review

No new Builder architecture is required.

The accepted exact-source pattern from Course endings and Opponent gaps is the correct boundary:

1. inspect the authoritative finding;
2. open Builder at the exact source anchor;
3. preserve observed move and evidence context;
4. let the user choose coverage and candidate moves;
5. preview the course change;
6. apply through the existing course transaction;
7. train through existing course/training flows.

A future “real-game repertoire deviation” source can reuse this architecture if a separately approved task establishes its exact semantics.

## 13. Queue impact

- ONB-003 remains the next deterministic critical-path task.
- ONB-007 owns measurable first-value budgets and any timing promise.
- ONB-008 should permit a bounded exact-anchor insight reference without embedding unbounded move/game payloads.
- ONB-010 consumes the revised competitor ranking and conditional exact-gap presentation rule.
- VT-302 retains final visual and accessibility ownership.
- Repertoire Builder retains all repertoire decisions and writes.
- No new implementation issue is allocated by this addendum because the identified behavior fits existing owners and future evidence-driven task allocation.

## 14. Sources reviewed

First-party ChessAtlas sources reviewed on 2026-07-30:

- [ChessAtlas landing page](https://chessatlas.net/)
- [About ChessAtlas](https://chessatlas.net/about)
- [Game Import](https://chessatlas.net/features/game-import)
- [Deviation Finder](https://chessatlas.net/features/deviation-finder)
- [Repertoire Builder](https://chessatlas.net/features/repertoire-builder)
- [Pricing](https://chessatlas.net/pricing)
- [How to import games from Lichess and Chess.com](https://chessatlas.net/blog/how-to-import-your-games-from-lichess-and-chesscom-into-chessatlas)
- [ChessAtlas vs Chessbook](https://chessatlas.net/features/vs-chessbook)
- [ChessAtlas Android listing](https://play.google.com/store/apps/details?id=net.chessatlas.app)

Disambiguation source:

- [Chess Atlas by Luhem Labs Android listing](https://play.google.com/store/apps/details?id=com.thechessatlas.app)

Competitor-authored comparisons and performance claims were treated as product positioning, not independent verification.

## 15. Validation

Performed:

- current first-party product, feature, pricing, import, comparison, and store material reviewed;
- product-name ambiguity resolved;
- initial ONB-016 competitor ranking reassessed;
- recommendations reconciled with the one-account first run, evidence ladder, durable import/preparation architecture, Player Chess Profile, tactical training, Course review, and Repertoire Builder ownership boundaries;
- entitlement-copy inconsistency and product-maturity caveats recorded.

Skipped:

- authenticated product walkthrough;
- account creation or import against ChessAtlas;
- real user-data submission;
- subscription purchase;
- mobile installation;
- independent performance verification;
- build, test, lint, architecture, migration, provider, and browser checks, because this addendum changes documentation only.

## 16. Final recommendation

Use ChessAtlas as the principal competitor reference for the **closed improvement loop**, but do not imitate its repertoire-first dependency.

The strongest product direction remains:

```text
connect one account
  → reveal useful personal evidence before a repertoire exists
  → offer one personal action
  → optionally build or repair a repertoire through an exact, human-controlled anchor
  → train
  → bring future real-game evidence back into the loop
```

That broader evidence-first loop is the clearest strategic distinction available to Chess Repertoire Trainer.