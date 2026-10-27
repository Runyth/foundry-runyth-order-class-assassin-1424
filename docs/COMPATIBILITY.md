# Compatibility

## Version 1.0.7 manifest/runtime asset integrity correction

A later installed package was observed requesting `modules/runyth-order-class-assassin-1424/src/main.mjs` and receiving HTTP 404. Version 1.0.7 removes ambiguity between the source layout, built layout, and Foundry manifest by making `src/main.mjs` the canonical `esmodules` path and writing the deterministic single-file browser bundle to that exact install path.

The release pipeline now derives a runtime asset inventory from `module.json`, `runtime-assets.json`, module-local template references, and stylesheet `url(...)` references. Build, package, and release verification fail closed if an ES module, script, style, language file, compendium file, template, or other required local runtime asset is absent from the built tree or finished ZIP.

Only the generated `src/main.mjs` is shipped under `src/`; editable secondary modules remain source-release only. This preserves the no-secondary-fetch behavior introduced in 1.0.6 while matching the path Foundry actually loads. Canonical content remains version `1.0.5`.

## Version 1.0.6 runtime ES-module correction

The v1.0.5 install archive contained the editable runtime files, but Foundry still had to resolve and fetch every transitive `src/*.mjs` import in the browser. A reported startup environment returned `net::ERR_FAILED` for secondary modules including `src/api.mjs` and `src/automation/disappearing-act.mjs`, which prevented `src/main.mjs` from evaluating fully and therefore prevented provider registration.

Version 1.0.6 keeps the modular source architecture for development but compiles the complete local runtime graph into one deterministic browser entry: `runtime/main.mjs`. The Foundry manifest exposes only that file under `esmodules`. No runtime code uses dynamic import or requires a secondary `src/*.mjs` HTTP request.

This packaging change does not alter the public module API, provider contract, canonical content, flags, or migrations. Canonical content remains version `1.0.5`.

## Supported matrix

| Component | Contract |
|---|---|
| Foundry VTT | exactly `13.351` |
| D&D 5e | exactly `5.3.3` |
| Runyth Order module ID | `runyth-order` |
| Runyth Order module version | minimum `1.0.3`; verified `1.0.4` |
| Runyth Order API | `1.0.0` exactly |
| Runyth Order API lookup | `game.modules.get("runyth-order")?.api` |
| Managed-source namespace | `flags.runyth-order.source` |

Midi-QOL, DAE, libWrapper, and other automation modules are optional. They are not declared as dependencies.

## Version 1.0.5 API correction

Version 1.0.4 still resolved the retired development identity `runyth-rules-core`. The accepted foundation module instead uses technical ID `runyth-order`. This caused provider registration to fail even though public API version `1.0.0` was present.

Version 1.0.5 corrects:

- the Foundry required-module relationship;
- runtime module API lookup;
- the API-ready hook prefix;
- source-tag reads and writes;
- documentation and validation fixtures.

## Compendium compatibility

The 1.0.4 installation could expose all three packs with zero indexed Items. Version 1.0.5 packages deterministic NeDB source files on fresh `*-v2.db` paths and rejects empty packs during the build.

Expected counts:

| Pack | Items |
|---|---:|
| Character Options | 1 |
| Features | 6 |
| Equipment | 2 |

A complete removal of the old module directory before extracting 1.0.5 remains the safest upgrade procedure.

## Persistent compatibility

Two explicit migrations are registered:

1. `rename-assassin-1424-identity` for pre-rename `runyth-assassin` data;
2. `move-source-metadata-to-runyth-order` for `flags.runyth-rules-core.source` data.

Both are GM-only, backup-requiring, idempotent document migrations. Legacy source flags remain readable before migration so synchronization and audits do not abandon managed data.
