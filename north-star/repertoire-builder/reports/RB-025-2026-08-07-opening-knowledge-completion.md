# RB-025 implementation report — Generated opening knowledge completion

Date: 2026-08-07

Task: `RB-025`

Issue: `#290`

Parent review PR: `#302`

Completion PR: `#304`

Branch: `rb-025/issue-290-knowledge-100`

## Objective

Complete strategic opening knowledge for every entry in the pinned generated opening book while preserving the existing ordered family/subfamily/line inheritance model.

The target is explicit:

- generated entries `AVAILABLE`: 3,733 / 3,733;
- unique opening names `AVAILABLE`: 3,167 / 3,167;
- White summary plus at least one plan: 3,733 / 3,733;
- Black summary plus at least one plan: 3,733 / 3,733.

This target applies to the pinned generated opening book. Unknown opening names outside that book remain `UNAVAILABLE`; there is no generic catch-all knowledge fallback.

## Starting point

PR #302 raised the reviewed runtime corpus from 25 to 41 rules and produced the following generated-book result:

- 2,024 `AVAILABLE` entries;
- 248 `PARTIAL` entries;
- 1,461 `UNAVAILABLE` entries;
- 1,671 `AVAILABLE` unique names;
- 175 `PARTIAL` unique names;
- 1,321 `UNAVAILABLE` unique names;
- 2,272 side-useful entries for White and Black independently.

The post-#302 deterministic priority audit grouped the remaining gaps into 119 root families.

Four families were already side-useful but globally partial because the longer descriptive field was missing:

- Nimzo-Indian Defense;
- Queen's Indian Defense;
- Slav Defense;
- Catalan Opening.

The other 115 root families lacked complete strategic knowledge.

## Implementation

The completion corpus adds one explicit source-controlled record per remaining root family rather than one record per generated opening row.

For the 115 previously unavailable families, each record supplies:

- concise project-original orientation;
- longer project-original description;
- independent White strategic summary;
- independent Black strategic summary;
- one stable strategic-priority plan per side;
- explicit condition and caveat that the guidance depends on the actual pawn structure and is not a forced move recommendation;
- confidence and provenance.

For Nimzo-Indian, Queen's Indian, Slav and Catalan, the completion record adds only the missing descriptive layer. Their existing side-specific plans and summaries remain authoritative.

The completion rules are evaluated before the established base and expansion registries. Existing more-specific knowledge therefore continues to override broad completion guidance for lines such as the Najdorf, French Exchange, London, Benko, Ruy Lopez Berlin/Marshall, Italian Two Knights, Dutch Leningrad, Semi-Slav Botvinnik and other already reviewed exceptions.

Selectors are anchored to an explicit root family and accept normal colon or comma suffixes. No selector matches arbitrary unknown opening names.

## Editorial approach

The pinned `lichess-org/chess-openings` dataset is used for opening identity and fixture validation. Runtime wording is project-original.

Major classical families receive higher-confidence strategic orientation where their defining plans are stable and widely established. Rare, historical or deliberately offbeat families use restrained `LOW` confidence wording focused on robust strategic consequences such as development, central space, king safety and the need to justify unusual move-order tempi.

The completion layer deliberately does not manufacture precise move sequences for obscure lines. Detailed tactical or structural exceptions should continue to be introduced as narrower later rules when evidence justifies them.

## Hard regression gate

`opening-knowledge-completion.test.mjs` iterates the complete pinned generated book and requires every one of the 3,733 entries to resolve with:

- status `AVAILABLE`;
- concise description;
- longer description;
- White strategic summary and at least one White plan;
- Black strategic summary and at least one Black plan.

The test also requires:

- exactly 3,167 unique opening names in the pinned book;
- every completion fixture to exist in the pinned book;
- every completion rule to match at least one generated entry;
- all full completion records to define both side summaries.

An invented opening outside the pinned dataset remains covered by the existing `UNAVAILABLE` regression test.

## Authority boundaries

This completion work does not change:

- opening classification or soundness judgments;
- candidate ranking, eligibility or target/profile fit;
- Builder reducers, queue or session authority;
- course preview/apply or course writes;
- shared candidate contract shape;
- Prisma schema or migrations;
- API routes, Angular stores or MCP tools;
- runtime network access or runtime LLM behavior.

Opening knowledge remains explanatory evidence only.

## Validation status

PR #304 owns exact-head validation. The completion is accepted only when the generated knowledge audit reports zero partial/unavailable entries and the full repository CI suite passes on the exact review head.
