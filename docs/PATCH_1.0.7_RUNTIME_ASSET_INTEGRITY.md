# v1.0.7 runtime asset integrity record

## Reported failure

Foundry requested `modules/runyth-order-class-assassin-1424/src/main.mjs` during startup and received HTTP 404. Compendia could still index, but module code did not initialize, so the provider did not register.

## Root cause addressed

The runtime package strategy and manifest path were allowed to diverge across releases/installations. Static checks asserted a chosen bundle path, but the packaging pipeline did not treat every `module.json` runtime path as an archive-level invariant.

## Correction

Version 1.0.7 restores `src/main.mjs` as the canonical manifest path and emits the deterministic single-file browser bundle directly to that path in the runtime tree. It does not restore the editable transitive source graph.

A shared runtime-asset validator now inventories and verifies:

- `module.json`;
- every `esmodules` entry;
- every `scripts` entry;
- every stylesheet;
- every language file;
- every compendium path;
- module-local template/resource references found in the generated JavaScript;
- local stylesheet `url(...)` dependencies;
- explicit project runtime requirements from `runtime-assets.json`.

Validation runs against both the built runtime tree and the completed install ZIP using exact module-relative paths. A missing asset aborts the release.

## Compatibility

No public API, canonical content, feature mechanics, provider ID, flag schema, or migration changes are introduced. Canonical content remains version `1.0.5`.
