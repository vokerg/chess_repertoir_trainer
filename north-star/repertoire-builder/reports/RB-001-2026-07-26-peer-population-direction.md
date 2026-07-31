# RB-001 peer-population direction revision

Date: 2026-07-26

Status: planning reconciliation; later delivered by RB-001.

Task: RB-001

GitHub issue: #89

Branch: `north-star/rb-001-peer-presets-replan`

## Decision

Replace arbitrary speed combinations and weighted generalized populations with compact fixed product presets, one mixed Lichess Explorer response and rating targets aligned directly with supported Explorer groups.

Accepted speed presets:

- `ALL`;
- `BLITZ_AND_SLOWER`;
- `BLITZ`;
- `BULLET`.

The population contract must preserve requested/effective filters, benchmark-profile version, source period, cache provenance and explicit fallback behavior. It must not invent continuous precision, hidden weighting or a generic confidence score.

## Outcome

This direction was implemented through PR #84 and remains the population vocabulary used by later profile, target and candidate consumers.
