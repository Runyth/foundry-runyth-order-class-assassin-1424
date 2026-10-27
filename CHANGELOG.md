# Changelog

## 1.0.7 — 2026-08-18

- Fixed the install/runtime manifest mismatch reported as an HTTP 404 for `modules/runyth-order-class-assassin-1424/src/main.mjs`.
- Restored `src/main.mjs` as the canonical Foundry `esmodules` path and now writes the deterministic single-file browser bundle to that exact install location.
- The install ZIP contains exactly one generated file under `src/`: `src/main.mjs`; all other editable source modules remain source-release only.
- Added `runtime-assets.json` plus shared runtime-asset integrity tooling that inventories manifest-declared ES modules, scripts, styles, language files, compendium files, module-local template references, CSS assets, and explicitly required runtime assets.
- Build and packaging now fail before release if any required runtime asset is missing from the built module tree.
- Packaging and release verification now inspect the finished install ZIP and fail if any required runtime asset is absent at the exact case-sensitive module-relative path.
- Added regression tests for exact manifest runtime paths, missing template/CSS assets, and archive-level runtime-asset validation.
- Preserved the single-file runtime strategy from 1.0.6, so no secondary editable ES-module fetches are reintroduced.
- Preserved canonical content version `1.0.5`; this patch changes packaging and runtime integrity only and requires no new content migration.
- Licensed the module as `AGPL-3.0-or-later`.
- Corrected public content citations to Runyth. Canonical content hashes were regenerated; feature behaviour is unchanged.
- Pointed the public repository, manifest, and download URLs at `foundry-runyth-order-class-assassin-1424`.

## 1.0.6 — 2026-08-12

- Fixed startup failures where browser requests for secondary runtime modules such as `src/api.mjs` and `src/automation/disappearing-act.mjs` could fail with `net::ERR_FAILED`, preventing provider registration.
- Replaced the browser-facing editable ES-module graph with one deterministic generated `runtime/main.mjs` bundle.
- Kept the complete modular `src/` tree in the source ZIP for maintainability while excluding it from the install ZIP.
- Updated `module.json` so Foundry loads only `runtime/main.mjs`.
- Added a dependency-free deterministic browser bundler that resolves the complete local module graph, isolates module scopes, and rejects unsupported, escaped, or circular imports.
- Added regression tests proving the generated runtime contains the formerly failing modules internally, has no static secondary imports, and evaluates as a single browser entry.
- Strengthened release verification so install archives must contain `runtime/main.mjs`, must not contain the editable `src/` tree, and must remain byte-identical after clean-source rebuilds.
- Preserved canonical content version `1.0.5`; this is a runtime/package-only patch and requires no new content migration.

## 1.0.5 — 2026-08-03

- Updated the required foundation-module ID from the retired development identity `runyth-rules-core` to the accepted Runyth Order identity `runyth-order`.
- Updated runtime API resolution to `game.modules.get("runyth-order")?.api` and the readiness hook to `runyth-order.apiReady` while retaining public API version `1.0.0`.
- Updated the Foundry dependency range to Runyth Order minimum `1.0.3`, verified `1.0.4`.
- Moved canonical managed-source metadata from `flags.runyth-rules-core.source` to `flags.runyth-order.source`.
- Added a backup-requiring, idempotent migration that moves legacy Core source flags to the Runyth Order namespace without deleting or overwriting player-owned content.
- Retained read compatibility for legacy source metadata until the migration is run.
- Replaced the provisional custom LevelDB pack writer with deterministic NeDB source packs on fresh `character-options-v2.db`, `features-v2.db`, and `equipment-v2.db` paths.
- Added exact pack round-trip validation and non-empty count gates for 1 subclass Item, 6 feature Items, and 2 equipment Items.
- Used fresh pack paths so empty pack directories created by version 1.0.4 cannot shadow the corrected data after upgrade.
- Updated validation, tests, manifests, documentation, troubleshooting, migration guidance, and three-ZIP release evidence for the accepted Runyth Order API contract.

## 1.0.4 — 2026-08-03

- Incorporated pre-release live Foundry and Midi-QOL test evidence from the supplied console log.
- Removed the separate Assassin Strike chat-card button, custom attack invocation, pending critical state, damage interception, and provider capability.
- Preserved the complete Assassin Strike rule while switching play to the normal weapon attack and the standard D&D 5e **Critical Hit** damage option after GM confirmation of an explicitly Surprised target.
- Added regression gates proving no custom Assassin Strike runtime files, actions, or damage hooks remain.
- Fixed fresh-install subclass discovery by declaring subclass pack content explicitly, preserving player-visible ownership, enabling the canonical pack as a D&D 5e Compendium Browser source for the GM, requesting the exact subclass filter index fields, and verifying `system.classIdentifier: rogue` during startup.
- Added a permanent localized diagnostic when the subclass pack is indexed but unavailable.
- Added deterministic D&D 5e `_stats` metadata to canonical source documents and expanded subclass schema validation.
- Advanced canonical content to 1.0.4 so managed Assassinate copies with obsolete workflow guidance can be detected safely.
- Added pre-release live-test documentation, updated the manual test matrix, and documented unrelated third-party console noise separately.
- Added a deterministic third release ZIP containing documentation, prompts, declarations, manifests, reports, JSON evidence, checksums, and validation logs.
- Added no new migration; the 1.0.3 identity migration remained registered and idempotent.

## 1.0.3 — 2026-08-02

- Renamed the module display title to **Runyth Order: Class Assassin 1424** and the subclass display name to **Assassin 1424**.
- Renamed the canonical module ID, provider ID, subclass identifier, flag namespace, compendium UUID namespace, repository paths, CSS namespace, localization namespace, package name, and release filenames to `runyth-order-class-assassin-1424`.
- Added a backup-requiring, idempotent Rules Core document migration from the former `runyth-assassin` identity. It covers world Actors, embedded Items and Active Effects, unlinked synthetic token Actors, world Items, source metadata, provider flags, subclass identifiers, compendium UUIDs, effect origins, and provider-owned effect change keys.
- Added legacy recognition before migration so synchronization and audits do not duplicate or abandon existing managed content.
- Added the Runyth Order complementary-module naming contract: `Runyth Order: <Category> <Content Name>`.
- Added canonical naming metadata to the Foundry manifest and provider descriptor.
- Kept the Rules Core API requirement at exactly `1.0.0` while allowing compatible Rules Core module patch releases in the Foundry dependency manifest.
- Added a standalone prompt requesting the Runyth Rules Core patch release, display rename to **Runyth Order**, and non-blocking naming-contract diagnostics for complementary providers.
- Updated documentation, TypeScript declarations, tests, validation, CI branch naming, packaging, and release verification for the new identity.
- Expanded the automated suite to 82 tests, including legacy-identity migration and current-identity idempotency coverage.

## 1.0.2 — 2026-08-02

- Fixed provider registration ordering so the canonical catalog is available synchronously during Foundry’s `init` lifecycle instead of being fetched by an asynchronous hook listener.
- Added verified, idempotent provider registration that confirms Runyth Rules Core retained `runyth-assassin` before enabling runtime hooks.
- Made module readiness fail closed: the module no longer prints `Ready` or resolves its public readiness promise when provider registration failed or was lost.
- Added a fallback listener for the documented `runyth-order.apiReady` hook without making normal dependency-ordered initialization asynchronous.
- Added deterministic generated runtime catalog tooling and validation so `packs/catalog.json` remains the single editable source of truth.
- Added regression coverage for synchronous lifecycle registration, Core retention verification, duplicate-registration avoidance, and catalog parity.
- Added no provider migration because canonical content and the provider flag schema remained unchanged at content version `1.0.0`.

## 1.0.1 — 2026-08-02

- Corrected Runyth Rules Core pack-version registration so code-only module patches do not falsely mark unchanged canonical content as stale. Canonical content remained version `1.0.0`; provider runtime version was `1.0.1`.
- Updated Assassin Strike chat integration to D&D 5e 5.3.3’s post-system `dnd5e.renderChatMessage` hook and hardened hit detection for natural 1, natural 20, explicit critical success, and explicit critical failure.
- Prevented Assassin Strike and Disappearing Act temporary state from being cleared by unrelated Combat document updates; cleanup now follows actual turn identity changes.
- Expanded damage detection to include temporary Hit Point loss and malformed-update rejection.
- Added keyed activation locks and safer UUID resolution to prevent duplicate use consumption, stale-document errors, and simultaneous prompt races.
- Made Disappearing Act and Seize the Moment activation transactional, including rollback when effect, use, or state persistence fails.
- Reworked prompts around modal Foundry V13 `DialogV2.confirm` behavior with safe close handling and one-dialog guards.
- Scoped Actor-sheet controls to recognized sheet-content anchors only, preventing controls from appearing in generic pop-up headers or unrelated windows.
- Hardened manager lifecycle behavior so completed operations cannot reopen a window that the user closed; added actor-aware sheet launching, debounced position persistence, and safe socket/controller teardown.
- Improved localized button wrapping, padding, overflow handling, busy states, result announcements, sticky footer usability, and narrow-window behavior.
- Made the existing per-client automation-boundary warning setting control chat guidance as documented.
- Added regression coverage for all patch changes; the automated suite contained 74 passing tests.
- Added no provider migration because the flag schema and canonical content were unchanged.

## 1.0.0 — 2026-07-27

- Added **The Assassin** Rogue subclass and level-based ItemGrant Advancement.
- Added Assassinate, Assassin’s Tools, Infiltration Expertise, Shadow in the Night, Disappearing Act, Rooftop Pursuit automation, and Seize the Moment.
- Added idempotent Actor synchronization, pure Actor validation, Runyth Rules Core provider registration, and a narrow public API.
- Added English and German localization, deterministic packaging, CI, release verification, and live-test documentation.
