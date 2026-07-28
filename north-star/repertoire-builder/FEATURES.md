# Repertoire Builder Feature Catalog

Last updated: 2026-07-26

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
| Compact speed/rating population presets | Dual-use | Agreed; RB-001 detailed | Replaces raw filter matrices with useful defaults | Defines the population being optimized |
| Lichess-benchmark rating bands | Dual-use | Agreed; calibration implementation pending | Makes peer groups match provider query buckets | Shared peer-level vocabulary |
| Temporary peer-band resolver | Dual-use | Outlined; formula threshold open | Enables My peers immediately | Supplies automatic population target defaults |
| Durable multi-account player level | Dual-use | Outlined; blocked on RB-001 | One inspectable level across accounts | Stores/reuses factual peer evidence |
| Named opening classification | Dual-use | Placeholder by agreement | Enables opening browsing and taxonomy | Supplies intrinsic side-aware opening character |
| Player Chess Profile calculation | Dual-use | Outlined | Standalone identity and performance insight | Advises repertoire target and candidate fit |
| Player Chess Profile experience | Standalone | Outlined | Recalculable profile page with evidence | Entry point into builder |
| Repertoire target contract | North-star | Outlined | Limited direct value | Captures preset population, persona, risk and coverage intent |
| Candidate evidence aggregation | North-star | Outlined | Could support opening analysis | Combines separated evidence at one decision point |
| Explainable candidate ranking | North-star | Outlined | Could support general recommendations | Orders candidates without hiding source evidence |
| Visual move-choice experience | North-star | Placeholder pending prototypes | Possible reusable analysis pattern | Core human decision surface |
| Builder session and branch queue | North-star | Placeholder | None until builder | Supports resume, deferral and multi-branch coverage |
| Interactive builder MVP | North-star | Outlined | Primary north-star delivery | Alternates user choice and opponent coverage |
| Course reintegration and preview | Dual-use | Existing pattern, new integration outlined | Safer course edits | Materializes accepted builder tree |
| Existing-course adaptation | Dual-use | Outlined | Improves current course review | Reuses builder for gaps, endings and weak choices |
| Repertoire personas and profile override | Dual-use | Agreed concept | Supports multiple purposeful courses | Prevents profile defaults becoming constraints |
| Traps knowledge foundation | Research | Open and intentionally vague | Possible future opening resource | Enables evidence-backed traps persona |
| LLM explanation/orchestration | Research | Open | Possible narrative value elsewhere | Optional explanation or conversational layer |
| Outcome feedback and builder evaluation | Dual-use | Placeholder | Better improvement measurement | Validates whether recommendations work later |

## Feature relationships

### Evidence foundation

The shared Opening Explorer remains the only rated Lichess population implementation. RB-001 adds compact presets, benchmark bands and a temporary peer resolver on top of it; it does not create a second extractor or weighted aggregation subsystem.

Rating normalization remains a shared versioned domain. The new Lichess-benchmark profile must preserve historical version metadata and provide Chess.com mappings through the same contracts/services.

RB-002 then turns the temporary peer evidence into a durable multi-account result. Opening classification remains independent.

### Chess Profile

The profile requires opening classification and durable player-level context for its strongest conclusions. It may display or consume the resolved peer band, but it must not silently recalculate or mutate factual level evidence.

### Repertoire target

The target captures intent for one build. It uses one RB-001 speed preset and one rating target, may reference factual RB-002 evidence, and permits an explicit override. It does not expose arbitrary speed weights in the MVP.

### Candidate recommendation

Evidence aggregation and ranking remain separate. Aggregation gathers comparable source facts. Ranking applies target-dependent policy and produces reasons.

### Visual choice

The final move-choice interaction requires visual position comparison, but exact production architecture remains open. Prototype work should use the revised preset direction rather than current raw filter controls.

### Builder state

The builder needs a queue of unresolved branches, accepted choices, deferred responses and previewable output. Persistence remains intentionally undecided before workflow discovery.

### Existing courses

Course review, endings, gaps and performance findings become entry points into the same builder decision loop. They should not create separate recommendation engines.

### Repertoire personas

A measured profile may propose a default persona. The user can create alternatives such as solid, sharp, dubious or low-theory. Persona is a target choice, not a permanent label.

### Traps

Traps require independent definition and data research. The north-star MVP does not depend on them.

### LLM

No core stage depends on an LLM. A later discovery task may identify safe narrative or orchestration roles after deterministic evidence and UX are understood.
