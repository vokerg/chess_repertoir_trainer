# MCP access

The API exposes a read-only MCP Streamable HTTP endpoint at `POST /mcp`. The current HTTP transport supports board-image URL generation; imported-game and analysis tools are registered but require application-user identity, which the HTTP transport does not yet provide.

MCP tool handlers run inside `apps/api` and call backend application/query services directly. They do not call the REST API over HTTP.

## Configuration

- `MCP_ENABLED=true` enables the endpoint. Any other value leaves `/mcp` disabled.
- `MCP_AUTH_MODE=token` requires `Authorization: Bearer <token>` and a configured `MCP_BEARER_TOKEN`. This is the default mode.
- `MCP_AUTH_MODE=none` explicitly allows unauthenticated access and should only be used for trusted local development.
- `MCP_BEARER_TOKEN` contains the required token when `MCP_AUTH_MODE=token`.

Invalid or incomplete token configuration fails closed. No-auth mode logs a warning. A public connector or app deployment should use proper authentication; OAuth is not implemented.

**Transport authentication is not application-user authentication.** `MCP_BEARER_TOKEN` authenticates access to `/mcp` but does not identify an `AppUser`. The HTTP route currently creates its MCP server without a user ID, so all imported-game, game-analysis, and opening-analysis tools return a structured `UNAUTHORIZED` error even with a valid bearer token. Do not pass a caller-supplied user ID or treat a shared MCP token as authority to read a user's games. User-data tools require an explicit, verified user-identity binding before they can be exposed through HTTP. In-memory service tests may supply a test user ID directly; they do not establish HTTP access.

## Read-only tools

Available over the HTTP transport today:

- `get_board_image_url`

Registered but unavailable for user-data access over HTTP until a verified application-user binding exists:

- `search_imported_games`
- `get_imported_game`
- `get_imported_game_pgn`
- `get_imported_game_facets`
- `get_imported_game_analysis`
- `get_opening_analysis`
- `summarize_imported_games`

The user-scoped tools are implemented against imported games, stored analysis, and opening data and can be exercised with a known user ID through the in-memory server in tests. `search_imported_games` returns a compact MCP-owned projection with identity, provider/date, players, result, speed/time control, opening, index/analysis status, and useful accuracy values. It does not reuse the browser DTO or return tag arrays and analysis-run metadata. `get_imported_game` preserves `includePlies`; included plies contain compact position-analysis scalars without stored multipv lines. Game-analysis responses expose one `moves` collection; critical moves are identified by classification instead of being duplicated in a second collection. Rich position-analysis lines remain available through the dedicated position-analysis flow rather than being repeated in game detail. The tools do not import games, synchronize external accounts, or implement Lichess/Chess.com authentication.

Write or heavy operations are deferred, including:

- `index_imported_game_plies`
- `start_game_analysis`
