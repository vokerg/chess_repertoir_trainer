# Chessground mobile licensing decision

## Status

`UNRESOLVED`

This file records engineering facts and the intended distribution model. Final interpretation must be reviewed by someone qualified to assess software licensing before external mobile distribution.

## Dependency inventory

| Component | Version | Intended use | License/status |
|---|---:|---|---|
| `@lichess-org/chessground` | `10.1.0` | DOM board rendering and interaction | GPL-3.0-or-later according to upstream package/README |
| Chessground base CSS | package version | Board layout and interaction styles | Distributed as part of Chessground package |
| Chessground Cburnett CSS/assets | package version | Offline chess piece rendering | Distributed as part of Chessground package; provenance/notice must be confirmed |
| `chess.js` | `1.0.0` | Board-legal move generation in the DOM component | BSD-2-Clause according to upstream package metadata; reconfirm at install |
| Expo/React Native | installed SDK versions | Native runtime and DOM host | Review generated dependency notices before release |

## Upstream Chessground statement

Chessground describes itself as GPL-3.0-or-later and states that a combined work using it must be distributed under the GPL with source made available to users. Preserve the exact upstream license text in the final distribution process and do not replace it with this summary.

## Project decisions required

- [ ] GPL distribution of the mobile combined work is acceptable.
- [ ] The repository or source archive provided to users is identified.
- [ ] Complete corresponding source includes mobile wrapper code and build instructions.
- [ ] Signing credentials, service secrets, and environment-specific configuration are separable from distributable source.
- [ ] In-app attribution/third-party notices are defined.
- [ ] App Store and Play Store source-availability wording is defined.
- [ ] Cburnett asset provenance and notice requirements are confirmed.
- [ ] The project-wide/root license treatment is decided.
- [ ] Qualified licensing review is complete.

## Intended source-distribution approach

TODO: Record the repository URL or source archive process that will be offered to users of each released binary, including how source for the exact released version is retained.

## Decision outcome

Choose one:

- `ACCEPTED`
- `ACCEPTED WITH REQUIRED ACTIONS`
- `REJECTED`
- `UNRESOLVED`

Decision:

Reviewer:

Date:

Required release actions:
