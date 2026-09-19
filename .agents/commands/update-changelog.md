# Update changelog

## Trigger

Run this procedure only for the exact repository command:

```text
update changelog
```

The root [`AGENTS.md`](../../AGENTS.md) is the command router. Do not treat similar wording as an alias.

## Goal

Reconcile [`CHANGELOG.md`](../../CHANGELOG.md) with committed repository history. The changelog uses one development snapshot per calendar day with meaningful committed work. The newest recorded day is intentionally revisitable because an earlier run may have happened before that day was complete.

## Procedure

1. Read the changelog header and newest entry. Record its date `D` and snapshot version.
2. Treat the entry for `D` as incomplete. Rebuild its bullets from repository history rather than only appending to it.
3. Inspect commits reachable from the current `HEAD` whose committer date is `D` or later. Prefer first-parent history so squash-merged pull requests are represented once:

   ```bash
   git log --first-parent --format='%H%x09%cI%x09%s' --reverse
   ```

4. For ambiguous, generic, or duplicate-looking subjects, inspect the commit and its changed files before classifying it:

   ```bash
   git show --stat --summary <commit>
   git show --format=fuller --no-ext-diff <commit> -- <relevant-path>
   ```

   When available, inspect the associated pull request, issue, tests, and canonical documentation. A subject line alone is not sufficient evidence for a detailed changelog claim.

5. Group meaningful work by the calendar-date prefix of the recorded committer timestamp (`%cI`). Create at most one changelog heading for each date.
6. Include feature delivery, user-visible behavior changes, material architecture or operational changes, significant bug fixes, and planning/research changes that alter accepted product or execution boundaries.
7. Exclude merge-only commits, metadata-only closure duplicates, formatting-only edits, typo fixes, accidental-file cleanup, CI-only churn, and repeated reconciliation commits whose implementation is already represented for that day.
8. Consolidate related commits into concise English feature-level bullets. State whether work is implemented, a bounded prototype, research, or planning; never present planned behavior as current runtime.
9. Keep dates in descending order. Reuse the existing snapshot version for date `D`; assign each later populated day the next `0.0.x` patch number in chronological order. Do not renumber older entries.
10. Do not include uncommitted working-tree changes. The next invocation will revisit the newest day again.

## Validation

Before finalizing:

- verify that dates and snapshot headings are unique;
- verify descending date order and monotonic snapshot numbering;
- compare every commit from `D` onward against an included bullet or an explicit exclusion category;
- run `git diff --check`;
- report the date range reviewed, meaningful commits represented, exclusions, and checks run.

This command updates `CHANGELOG.md` only unless the changelog convention or this procedure itself is intentionally being changed. It does not bump package versions, create releases, merge branches, or rewrite Git history.
