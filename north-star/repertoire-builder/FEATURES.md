# Repertoire Builder Feature Catalog

Last updated: 2026-07-29

Planning maturity values:

- **Agreed** — purpose and role are stable enough to plan delivery.
- **Outlined** — major behavior is described; important design work remains.
- **Placeholder** — acknowledged dependency or concept with intentionally incomplete planning.
- **Open** — optional or exploratory; no delivery commitment.

Delivery classes:

- **Standalone** — general product improvement with independent user value.
- **Dual-use** — standalone value and direct north-star dependency.
- **North-star** — primarily useful inside the repertoire builder.
- **Research** — discovery that may or may not become implementation.

| Feature | Class | Maturity | Value now | North-star role |
| --- | --- | --- | --- | --- |
| Rated Lichess population explorer | Dual-use | Runtime foundation merged | Improves opening analysis and practical research | Supplies target-population moves and results |
| Compact speed/rating population presets | Dual-use | Implemented and merged | Replaces raw filter matrices with useful defaults | Defines the population being optimized |
| Lichess-benchmark rating bands | Dual-use | Implemented and merged | Makes peer groups match provider query buckets | Shared peer-level vocabulary |
| Factual peer-band resolver | Dual-use | Implemented and merged | Enables My peers immediately | Supplies automatic population target defaults |
| Durable multi-account player level | Dual-use | Implemented through the shared resolver | One inspectable level across accounts | Reuses factual peer evidence without a second formula |
| Named opening classification | Dual-use | Implemented and merged | Enables opening browsing and taxonomy | Supplies intrinsic side-aware opening character |
| Player Chess Profile calculation | Dual-use | Implemented for review | Standalone identity and performance insight | Advises repertoire target and candidate fit |
| Player Chess Profile experience | Standalone | Implemented for review | Recalculable profile page with evidence | Entry point into builder |
| Repertoire target contract | North-star | Implemented and merged | Limited direct value | Captures preset population, persona, risk and coverage intent |
| Candidate evidence aggregation | North-star | Implemented and merged | Supports one-position analysis decisions | Combines separated evidence at one decision point |
| Explainable candidate ranking | North-star | Implemented and merged | Supports deterministic recommendations | Orders candidates without hiding source evidence |
| Visual move-choice experience | North-star | Accepted and implemented | Reusable analysis pattern | Core human decision surface |
| Builder session and branch queue | North-star | Implemented and merged | Storage-neutral state foundation | Supports resume semantics, deferral, staleness and multi-branch coverage |
| Interactive builder MVP | North-star | Implemented and merged | First production builder slice | Alternates user choice and opponent coverage in a bounded routed workbench |
| Course reintegration and preview | Dual-use | Ready for implementation | Safer course edits | Materializes accepted builder trees through mandatory preview/apply |
| Existing-course adaptation | Dual-use | Outlined | Improves current course review | Reuses builder for gaps, endings and weak choices |
| Repertoire personas and profile override | Dual-use | Agreed concept | Supports multiple purposeful courses | Prevents profile defaults becoming constraints |
| Traps knowledge foundation | Research | Discovery complete; bounded pilot claimed | Possible future opening resource | Enables evidence-backed traps persona |
| LLM explanation/orchestration | Research | Open | Possible narrative value elsewhere | Optional explanation or conversational layer |
| Outcome feedback and builder evaluation | Dual-use | Placeholder | Better improvement measurement | Validates whether recommendations work later |

## Feature relationships

### Evidence foundation

The shared Opening Explorer remains the only rated Lichess population implementation. RB-001 adds compact presets, benchmark bands and a factual peer resolver on top of it; it does not create a second extractor or weighted aggregation subsystem.

Rating normalization remains a shared versioned domain. The active Lichess-benchmark profile preserves historical version metadata and provides Chess.com mappings through the same contracts/services.

RB-002 is delivered through the same factual multi-account resolver. Opening classification remains independent.

### Chess Profile

The profile consumes opening classification and factual player-level context for its strongest conclusions. It may display or consume the resolved peer band, but it must not silently recalculate or mutate factual level evidence.

The integrated builder displays RB-007 profile fit as advisory evidence. It does not derive setup defaults from RB-004/RB-005 and does not prevent a user from choosing against profile evidence.

### Repertoire target

The target captures intent for one build. It uses one RB-001 speed preset and one rating target, may snapshot factual peer evidence, and permits an explicit override. It does not expose arbitrary speed weights in the MVP.

The integrated builder creates schema-valid targets in the feature boundary. Peer targets retain `PEER_RESOLUTION` provenance; explicit rating groups remain manual authoritative choices.

### Candidate recommendation

Evidence aggregation and ranking remain separate. Aggregation gathers comparable source facts. Ranking applies target-dependent policy and produces stable reasons and warnings.

The builder consumes the existing authenticated candidate endpoint rather than adding a UI-specific recommendation engine. Manual board moves use `includeMoveUci` and remain subject to the same evidence/eligibility response.

### Visual choice

The accepted production direction is a routed, board-first workbench launched from a focused setup dialog. Candidate switching updates one readable board and focused evidence; opponent responses use a queue rather than a dense matrix.

Squash-merged PR #184 implements that direction with one primary board, explicit target/profile separation, opponent-response selection, queue controls and bounded structural preview.

### Builder state

RB-009 implements the queue, accepted choices, deferred and ignored responses, staleness, transposition references, decision history and bounded preview as a pure serializable `chess-domain` snapshot.

RB-010 composes that snapshot through a page-scoped Angular store. It adds no second reducer or global builder state. The accepted first MVP is route-local: refresh starts over, and reopening setup explicitly replaces the current draft. Durable resume requires a separate demonstrated need.

### Existing courses

Course review, endings, gaps and performance findings should enter the same builder decision loop rather than create separate recommendation engines.

RB-010 displays RB-007 course evidence and a structural draft preview but performs no write. RB-011 is now ready and owns mandatory preview, explicit transactional apply, conflict handling, reuse and result reporting.

### Repertoire personas

A measured profile may propose a default persona. The user can create alternatives such as solid, sharp, dubious or low-theory. Persona is a target choice, not a permanent label.

RB-010 uses four transparent local presets over explicit RB-006 objective dimensions. Profile-derived defaults remain RB-013 work.

### Traps

The critical-path MVP does not depend on traps. RB-017 remains the only approved bounded data/validator pilot after RB-014 discovery.

### LLM

No core stage depends on an LLM. A later discovery task may identify safe narrative or orchestration roles after deterministic evidence and UX are understood.
