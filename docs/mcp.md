# MCP access

The API exposes a read-only MCP Streamable HTTP endpoint at `POST /mcp` for querying chess data that is already stored in the application.

MCP tool handlers run inside `apps/api` and call backend application/query services directly. They do not call the REST API over HTTP.

## Configuration

- `MCP_ENABLED=true` enables the endpoint. Any other value leaves `/mcp` disabled.
- `MCP_AUTH_MODE=token` requires `Authorization: Bearer <token>` and a configured `MCP_BEARER_TOKEN`. This is the default mode.
- `MCP_AUTH_MODE=none` explicitly allows unauthenticated access and should only be used for trusted local development.
- `MCP_BEARER_TOKEN` contains the required token when `MCP_AUTH_MODE=token`.

Invalid or incomplete token configuration fails closed. No-auth mode logs a warning. A public connector or app deployment should use proper authentication; OAuth is not implemented in this task.

## Read-only tools

- `search_imported_games`
- `get_imported_game`
- `get_imported_game_pgn`
- `get_imported_game_facets`
- `get_imported_game_analysis`
- `get_opening_analysis`
- `summarize_imported_games`
- `get_board_image_url`

These tools query imported games, stored analysis, and opening data. `search_imported_games` returns a compact MCP-owned projection with identity, provider/date, players, result, speed/time control, opening, index/analysis status, and useful accuracy values. It does not reuse the browser DTO or return tag arrays and analysis-run metadata. `get_imported_game` preserves `includePlies`; included plies contain compact position-analysis scalars without stored multipv lines. Game-analysis responses expose one `moves` collection; critical moves are identified by classification instead of being duplicated in a second collection. Rich position-analysis lines remain available through the dedicated position-analysis flow rather than being repeated in game detail. The tools do not import games, synchronize external accounts, or implement Lichess/Chess.com authentication.

Write or heavy operations are deferred, including:

- `index_imported_game_plies`
- `start_game_analysis`
