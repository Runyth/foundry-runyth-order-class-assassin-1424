# Architecture

## Runtime lifecycle

1. During Foundry `init`, the module:
   - registers settings;
   - exposes its frozen public API;
   - resolves Runyth Order through `game.modules.get("runyth-order")?.api`;
   - registers the provider synchronously when the API is already available;
   - otherwise waits for `runyth-order.apiReady`;
   - enables automation hooks only after registration is verified.
2. During `ready`, the module:
   - verifies provider retention;
   - validates D&D 5e 5.3.3;
   - prepares and checks subclass discovery;
   - initializes turn-scoped automation;
   - resolves the public readiness promise.
3. During shutdown, transient UI, socket, controller, timer, and automation state is cleared.

Initialization is fail-closed. The module does not print a successful ready message when Runyth Order registration is unavailable or rejected.


## Runtime distribution

Editable implementation remains split across `src/` modules. During `npm run build`, `tools/lib/browser-bundle.mjs` resolves that local import graph and emits one deterministic bundled `src/main.mjs` file at the exact path declared by the Foundry manifest. The install ZIP contains only that generated file under `src/`; the remaining editable source modules exist only in the source ZIP.

This deliberately separates maintainable source structure from browser transport structure. Foundry loads one manifest-declared ES module, avoiding transitive browser requests for `src/api.mjs`, automation modules, and the rest of the internal graph. The source ZIP retains all original modules and the bundler so the runtime is fully reproducible.

## Service boundaries

- `src/core/provider-registration.mjs` owns the Runyth Order provider handshake.
- `src/core/source.mjs` owns canonical `flags.runyth-order.source` reads and legacy fallback reads.
- `src/core/identity-migration.mjs` owns both persistent compatibility migrations.
- `src/core/synchronizer.mjs` performs explicit additive Actor repairs.
- `src/core/validator.mjs` performs pure, non-mutating Actor audits.
- `src/integration/subclass-discovery.mjs` prepares the D&D 5e Compendium Browser source and verifies the Rogue subclass index fields.
- `src/automation` contains isolated supported-hook automation.
- `src/ui` contains ApplicationV2 UI and prompts.

## Assassinate boundary

Assassinate has no runtime attack automation from version 1.0.4 onward. The canonical Item grants Initiative Advantage and documents the normal attack plus native Critical Hit damage workflow. This avoids a second activity chain and does not intercept system or Midi-QOL damage cards.

## Canonical content and compendia

Editable JSON under `packs/_source` is authoritative. Deterministic tooling validates content hashes, generates the runtime catalog, converts each source Item to one NeDB JSON line, and validates exact round trips before packaging.

Version 1.0.5 uses fresh manifest paths:

- `packs/character-options-v2.db`;
- `packs/features-v2.db`;
- `packs/equipment-v2.db`.

The fresh paths prevent empty pack directories produced by the rejected 1.0.4 pack writer from masking corrected data. Foundry handles the supported on-install storage migration; module runtime code does not edit compendium storage.
