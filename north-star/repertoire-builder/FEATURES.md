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
| Speed/rating population explorer integration | Dual-use | Outlined; parallel implementation exists | Improves opening analysis and practical research | Supplies target-population moves and results |
| Combinable speed targets and controlled weighting | Dual-use | Agreed concept, formula open | More accurate population analysis | Defines the environment being optimized |
| Cross-provider rating normalization | Dual-use | Implementation exists in open PR at foundation creation | Comparable player-strength views | Shared normalized grade model |
| Multi-account player level resolution | Dual-use | Outlined, formula open | One inspectable level across accounts | Resolves own-level and stronger-level target bands |
| Named opening classification | Dual-use | Placeholder by agreement | Enables opening browsing and taxonomy | Supplies intrinsic side-aware opening character |
| Player Chess Profile calculation | Dual-use | Outlined | Standalone identity and performance insight | Advises repertoire target and candidate fit |
| Player Chess Profile experience | Standalone | Outlined | Recalculable profile page with evidence | Entry point into builder |
| Repertoire target contract | North-star | Outlined | Limited direct value | Captures speed set, rating target, persona, risk, and coverage intent |
| Candidate evidence aggregation | North-star | Outlined | Could support opening analysis | Combines separated evidence at one decision point |
| Explainable candidate ranking | North-star | Outlined | Could support general recommendations | Orders candidates without hiding source evidence |
| Visual move-choice experience | North-star | Placeholder pending prototypes | Possible reusable analysis pattern | Core human decision surface |
| Builder session and branch queue | North-star | Placeholder | None until builder | Supports resume, deferral, and multi-branch coverage |
| Interactive builder MVP | North-star | Outlined | Primary north-star delivery | Alternates user choice and opponent coverage |
| Course reintegration and preview | Dual-use | Existing pattern, new integration outlined | Safer course edits | Materializes accepted builder tree |
| Existing-course adaptation | Dual-use | Outlined | Improves current course review | Reuses builder for gaps, endings, and weak choices |
| Repertoire personas and profile override | Dual-use | Agreed concept | Supports multiple purposeful courses | Prevents player profile from becoming a constraint |
| Traps knowledge foundation | Research | Open and intentionally vague | Possible future opening resource | Enables evidence-backed traps persona |
| LLM explanation/orchestration | Research | Open | Possible narrative value elsewhere | Optional explanation or conversational layer |
| Outcome feedback and builder evaluation | Dual-use | Placeholder | Better improvement measurement | Validates whether recommendations work in later games |

## Feature relationships

### Evidence foundation

Population evidence, rating normalization, player-level resolution, and opening classification are independent reusable capabilities. They should not be implemented as private builder-only utilities.

### Chess Profile

The profile requires opening classification and player-level context for its strongest conclusions, but a narrower version may ship earlier if it clearly labels missing dimensions. Its calculation and UI are separate tasks so the data model can be tested before visual conclusions are polished.

### Repertoire target

The target captures intent for one build. It must support arbitrary speed combinations and profile override. It should reference normalized grades and opening-profile identifiers rather than copying their logic.

### Candidate recommendation

Evidence aggregation and ranking are separate. Aggregation gathers comparable source facts. Ranking applies target-dependent policy and produces reasons. This separation is required for explainability and future experimentation.

### Visual choice

The final move-choice interaction is known to require visual position comparison, but not yet known well enough for production architecture. Prototype work should use realistic candidate evidence before locking component and endpoint shapes.

### Builder state

The builder needs a queue of unresolved branches, accepted choices, deferred responses, and previewable output. Whether this requires database persistence is intentionally not decided before workflow discovery.

### Existing courses

Course review, endings, gaps, and performance findings become entry points into the same builder decision loop. They should not create separate recommendation engines.

### Repertoire personas

A measured player profile may propose a default persona. The user can create alternatives such as solid, sharp, dubious, or low-theory. Persona is a target choice, not a permanent label attached to the user.

### Traps

Traps require independent definition and data research. The builder may later consume a verified traps source, but the north-star MVP does not depend on it.

### LLM

No core stage depends on an LLM. A later discovery task may identify safe, useful narrative or orchestration roles after deterministic evidence and UX are understood.
