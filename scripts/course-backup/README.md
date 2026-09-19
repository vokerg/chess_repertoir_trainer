# Course backups

Run from the repository root:

```powershell
npm run backup:courses
```

By default, the script exports every course in the database. To limit the backup to one user:

```powershell
npm run backup:courses -- --user-id 1
```

Backups are written to `backups/courses/<timestamp>/`. Each directory contains a
`manifest.json` and one JSON file per course. Course files contain chapters, lines,
and nested move trees. The format intentionally excludes database IDs, timestamps,
derived chess fields, and training history. Move order and parent-child relationships
are represented directly by each move's position and `children` array.

Use `--output-root <path>` to store the timestamped backup directory elsewhere.
