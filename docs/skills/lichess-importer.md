# Skill: Lichess importer

Use this skill when changing Lichess sync/import behavior.

## Goal

Keep provider-specific import code separate from normalized games storage and from repertoire/training features.

## Target ownership

```text
apps/api/src/modules/importers/lichess/
  lichess.client.ts          HTTP calls and response status handling
  lichess.ndjson.ts          streaming NDJSON parsing
  lichess.mapper.ts          Lichess payload -> normalized imported game data
  lichess-import.service.ts  sync orchestration and import-run workflow
  lichess-import.routes.ts   HTTP endpoint for triggering sync
```

Normalized imported game persistence belongs to:

```text
apps/api/src/modules/games/
```

## Responsibilities

### Client

The client owns:

- URL construction for Lichess API calls.
- Request headers.
- HTTP response status handling.
- Provider-level errors.

The client should not write to Prisma.

### NDJSON reader

The NDJSON reader owns:

- Stream reading.
- Buffering partial lines.
- JSON parsing per complete line.

It should not know about users, accounts, Prisma, or import runs.

### Mapper

The mapper owns:

- Lichess game payload normalization.
- PGN header fallbacks.
- Username/color/result mapping.
- Time-control parsing.
- Compacting raw provider payloads.

It should output normalized data that the games module can persist.

### Sync service

The sync service owns:

- Finding the active linked account.
- Opening and completing import runs.
- Counting seen/imported/updated/failed games.
- Calling client, reader, mapper, and games persistence boundary.
- Updating sync cursor state.

## Rules

- Lichess importer may depend on games module boundaries.
- Lichess importer must not depend on courses or training internals.
- Lichess-specific types should stay in the Lichess importer module.
- Generic imported game persistence belongs to games, not Lichess.
- Failed individual games should increment failure counts without necessarily failing the whole run.
- Failed provider/API calls should fail the run and persist the error.

## Refactor sequence

When splitting the existing importer, do it in behavior-preserving steps:

1. Extract Lichess types.
2. Extract NDJSON reader with no logic changes.
3. Extract mapper with no persistence changes.
4. Extract client URL/fetch behavior.
5. Move persistence behind games repository/service boundary.
6. Move route to `modules/importers/lichess`.
7. Keep the HTTP endpoint contract unchanged.

## Review checklist

- Is provider-specific code isolated under `importers/lichess`?
- Is normalized game persistence owned by `games`?
- Did importer code avoid courses/training imports?
- Are streaming parse mechanics testable without network or database?
- Are mapping functions testable with sample Lichess payloads?
- Does sync cursor behavior remain unchanged?
- Are import-run statuses updated on both success and failure?
