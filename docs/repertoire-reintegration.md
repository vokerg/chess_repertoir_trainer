# Repertoire reintegration

## Purpose

Free analysis is local-only until it is reintegrated. Reintegration merges a complete analysis move tree into an existing course line or creates a new line rooted at the analysis FEN.

## Core concepts

- **Normalized FEN:** position identity uses `normalizeFenForPosition`, which compares the first four FEN fields.
- **Analysis tree payload:** the client sends only the root FEN and recursive UCI moves. Local node ids, SAN, source, and `isUserMove` are not trusted or persisted.
- **Line anchor:** a concrete graft point at a line start or after an existing move node.
- **Course-level conflict:** a different correct trained-side move already exists from the same normalized position in the course.
- **Concrete parent merge:** reuse and insertion are determined under an exact `parentId`, not only by normalized position.

## Matching rules

The same-position rule is `normalizeFenForPosition`. Anchors are created from `line.startingFen` and every `node.fenAfter`; `node.fenBefore` alone is not an anchor. A repeated position may produce multiple selectable anchors.

## Conflict rules

A conflict is the same normalized position with the trained side to move and a different correct trained-side move in the same course. Checks are course-level by default, including when creating a new line. The planner also rejects incompatible trained-side choices inside the incoming analysis tree.

## Preview/apply contract

Preview is informational. Apply reloads course data and recomputes the plan inside a database transaction. The frontend never supplies trusted SAN or inserted-node FEN values; the backend derives them with `chess.js` and the existing move-node creation rules.

## Existing-line merge

At the selected anchor, an existing same-UCI child under the same concrete parent is reused. Missing children are created recursively. Any conflict blocks the entire merge.

## New-line merge

The new line uses the analysis root FEN as `startingFen`. The user explicitly selects `sideToTrain`, and the complete tree is imported after course-level conflict validation.

## Limitations

- No conflict override.
- No partial branch selection.
- No automatic side-to-train inference.
- No cross-course merge.
- No database uniqueness migration.
