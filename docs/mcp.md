# MCP access

The API exposes a read-only MCP Streamable HTTP endpoint at `POST /mcp` for querying chess data that is already stored in the application.

MCP tool handlers run inside `apps/api` and call backend application/query services directly. They do not call the REST API over HTTP.

## Configuration

- `MCP_ENABLED=true` enables the endpoint. Any other value leaves `/mcp` disabled.
- `MCP_BEARER_TOKEN` optionally requires `Authorization: Bearer <token>`.

When MCP is enabled without a bearer token, the API allows unauthenticated local/development access and logs a warning. A public connector or app deployment should use proper authentication; OAuth is not implemented in this task.

## Read-only tools

- `search_imported_games`
- `get_imported_game`
- `get_imported_game_pgn`
- `get_imported_game_facets`
- `get_imported_game_analysis`
- `get_opening_analysis`

These tools query imported games, stored analysis, and opening data. They do not import games, synchronize external accounts, or implement Lichess/Chess.com authentication.

Write or heavy operations are deferred, including:

- `index_imported_game_plies`
- `start_game_analysis`
