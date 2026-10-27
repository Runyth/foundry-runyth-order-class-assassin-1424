# v1.0.6 runtime ES-module failure record

## Reported symptom

The v1.0.5 runtime failed during startup because browser requests for internal modules including `src/api.mjs` and `src/automation/disappearing-act.mjs` returned `net::ERR_FAILED`. Compendium packs could still index, but provider initialization never completed and Runyth Order consequently observed zero registered Assassin 1424 providers.

## Root packaging weakness

The install archive contained the internal files, but the manifest entry `src/main.mjs` still depended on the browser fetching the full transitive editable module graph. That made provider startup dependent on every secondary module request succeeding through the hosting/proxy layer.

## v1.0.6 correction

The editable source remains modular, but build tooling emits one deterministic `runtime/main.mjs` browser entry containing the complete local dependency graph. `module.json` points only to this generated file, and the install ZIP no longer contains `src/`.

Automated release gates verify that the generated bundle includes the previously failing modules, contains no static import/export declarations, evaluates as a single module under Foundry-shaped stubs, and is reproducible from a clean source extraction.
