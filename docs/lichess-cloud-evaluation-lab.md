# Lichess Cloud Evaluation lab

The authenticated **Lab → Lichess cloud evaluation** experiment accepts a FEN and looks up
the public Lichess Cloud Evaluation API via the API backend:

- UI: \`/lab/cloud-evaluation\`
- Backend: \`GET /api/lab/cloud-evaluation?fen=...\`
- Upstream: \`GET https://lichess.org/api/cloud-eval?fen=...&multiPv=3\`

A single request fetches a cached evaluation only. A cache miss is returned as HTTP 200
with \`positionAnalysis: null\`. The backend never starts Stockfish and never persists
a position or analysis. Upstream failures return HTTP 502, rate limiting returns 503.
Outbound requests are serialized per backend process with a 60-second cooldown after 429.

## Shared cache mapping

A hit returns \`{ source: "LICHESS_CLOUD", depth, knodes, positionAnalysis }\`.
\`positionAnalysis\` contains the same fields used by the existing
\`PositionAnalysisCache\` and \`StorePositionAnalysisInput\` boundaries:

- \`fen\`, \`normalizedFen\`, \`bestMoveUci\`, \`bestScoreCpWhite\`, \`bestMateWhite\`;
- \`lines\` with \`multipv\`, \`depth\`, \`moveUci\`, \`scoreCpWhite\` or \`mateWhite\`, \`pvUci\`;
- \`persistenceMode: "rich"\` for potential later use by the existing store method.

No \`id\` or \`positionId\` is supplied: these only exist for persisted rows.
Lichess evaluations are already White-centric; **do not reverse the sign**.
UCI_Chess960 castling is converted to ordinary UCI, and every returned PV is
replayed with chess.js before inclusion. Invalid PVs are dropped, and a response
with no usable PVs fails rather than inserting invalid cache evidence.

## Explicit non-goals

No Prisma changes, automatic cache seeding, imported-game analysis changes,
engine fallback, scheduled bulk requests, changes to opening analysis, or
production activation outside the optional Lab page.

Lichess API documentation:
https://lichess.org/api#tag/Analysis/operation/apiCloudEval
