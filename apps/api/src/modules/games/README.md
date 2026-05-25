# Games module

Owns local user account links, imported games, and import run history.

For this refactor pass, the module boundary is introduced before moving all existing service implementations. The public HTTP behavior remains unchanged.

Rules:

- Games may know about external chess providers.
- Games must not know about course authoring internals.
- Importers write normalized game records through this boundary.
