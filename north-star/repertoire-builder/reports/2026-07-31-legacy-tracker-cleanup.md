# Legacy external-tracker cleanup

Date: 2026-07-31

Status: review package

GitHub issue: #175

Branch: `north-star/issue-175-remove-legacy-tracker`

## Result

GitHub Issues is now the only execution/coordination system named in active Repertoire Builder repository documentation.

The cleanup:

- deletes the obsolete setup report for the retired tracker;
- removes the migration note from `GITHUB_ISSUES.md`;
- names GitHub Issues in the historical changelog entry;
- rewrites the affected RB-001/RB-002 history using immutable RB IDs, GitHub issues, branches, pull requests, commits and CI evidence only;
- removes retired claim/completion identifiers from the RB-001 task file.

## Files

- `CHANGELOG.md`;
- `north-star/repertoire-builder/GITHUB_ISSUES.md`;
- four RB-001/RB-002 reports;
- `tasks/RB-001-population-evidence.md`;
- deleted obsolete setup report.

## Validation

Repository search for the retired tracker name and its old identifier prefix must return no current files after integration. Complete repository CI must pass on the final pull-request head.

No product code, API, schema, database, runtime behavior, queue order or task priority changes.
