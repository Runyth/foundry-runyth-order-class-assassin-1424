# Runyth Order: Class Assassin 1424

A production-oriented complementary provider for the **Runyth Order** ecosystem, implementing the user-supplied **Assassin 1424** Rogue subclass for **Foundry VTT 13.351** and **D&D 5e 5.3.3**.

The foundation dependency is the Foundry module `runyth-order`, exposing public API `1.0.0`. Midi-QOL, Dynamic Active Effects, libWrapper, and similar automation modules are optional and never required.

## Identity

| Identity | Value |
|---|---|
| Display title | `Runyth Order: Class Assassin 1424` |
| Module ID | `runyth-order-class-assassin-1424` |
| Provider ID | `runyth-order-class-assassin-1424` |
| Subclass identifier | `runyth-order-class-assassin-1424` |
| Release version | `1.0.7` |
| Canonical content version | `1.0.5` |

See [Runyth Order naming scheme](docs/RUNYTH_ORDER_NAMING.md).

## Compatibility

| Component | Supported version |
|---|---:|
| Foundry VTT | exactly `13.351` |
| D&D 5e | exactly `5.3.3` |
| Runyth Order module | minimum `1.0.3`; verified `1.0.4` |
| Runyth Order public API | exactly `1.0.0` |

The required API lookup is:

```javascript
const core = game.modules.get("runyth-order")?.api;
```

## Canonical packs

| Pack | Expected Items |
|---|---:|
| `runyth-order-class-assassin-1424.character-options` | 1 |
| `runyth-order-class-assassin-1424.features` | 6 |
| `runyth-order-class-assassin-1424.equipment` | 2 |

The Character Options pack declares D&D 5e subclass content explicitly. During startup, the module verifies the indexed subclass fields and, for the GM, keeps this pack enabled as a D&D 5e Compendium Browser source.

Version 1.0.5 moved the runtime packs to fresh `*-v2.db` paths. Version 1.0.7 packages the complete browser runtime as one generated `src/main.mjs` ES module at the exact path declared by `module.json`, while keeping every other editable `src/*.mjs` file out of the install ZIP.

## Play workflow

- Add **Assassin 1424** through the normal Rogue subclass and Advancement workflow.
- **Assassinate** permanently grants Initiative Advantage.
- Roll weapon attacks normally. When the GM confirms that the struck target is explicitly Surprised, select **Critical Hit** in the normal D&D 5e damage dialog.
- The separate **Assassin Strike** chat-card button was removed in version 1.0.4 because it created an independent activity chain that did not interoperate reliably with Midi-QOL damage cards.
- Damage can prompt the selected controller to use **Disappearing Act**.
- Acrobatics checks can prompt for the urban chase/escape circumstance.
- **Seize the Moment** prompts at the beginning of the Actor’s turn and remains manually available from the Actor-sheet controls.
- The small Assassin 1424 manager provides dry-run synchronization, repair, audit, and manual activation.

## Upgrade to 1.0.7

1. Back up the world.
2. Disable **Runyth Order: Class Assassin 1424**.
3. Remove the existing `Data/modules/runyth-order-class-assassin-1424/` directory completely.
4. Extract the 1.0.7 installation ZIP into `Data/modules/`.
5. Enable **Runyth Order** and then **Runyth Order: Class Assassin 1424**.
6. Confirm `module.json` declares only `src/main.mjs`, that `Data/modules/runyth-order-class-assassin-1424/src/main.mjs` exists, and that no secondary `src/*.mjs` request is made.
7. Confirm the three compendia contain 1, 6, and 2 Items respectively.
8. Open the Rules Hub and run **Move source metadata to Runyth Order** when legacy managed documents still use `flags.runyth-rules-core.source`.
9. Run **Rename provider identity to Assassin 1424** only when data from the pre-rename `runyth-assassin` module remains.
10. Audit representative Actors.

Do not enable the legacy and current Assassin module identities simultaneously.

## Build and verification

```text
npm ci --ignore-scripts
npm run catalog:check
npm test
npm run build
npm run package
npm run release:verify
```

Unchanged source produces byte-identical archives. Release verification rebuilds from a clean source extraction and compares all reproducible ZIP outputs byte for byte.

## Release artifacts

Each release produces exactly three primary ZIP archives:

1. installable runtime ZIP;
2. complete reproducible source ZIP;
3. documentation and release-evidence ZIP.

See [Release artifacts](docs/RELEASE_ARTIFACTS.md).

## Documentation

- [Pre-release live-test findings](docs/LIVE_TEST_FINDINGS.md)
- [Runyth Order naming scheme](docs/RUNYTH_ORDER_NAMING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Public API](docs/API.md)
- [Content model](docs/CONTENT_MODEL.md)
- [Flags and data model](docs/DATA_MODEL_AND_FLAGS.md)
- [Migrations](docs/MIGRATIONS.md)
- [Compatibility](docs/COMPATIBILITY.md)
- [Manual live tests](docs/MANUAL_LIVE_TESTS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Historical Runyth Order naming prompt](prompts/runyth-order-core-naming-patch-prompt.md)

## Installation

When the release is published, paste this manifest URL into Foundry's **Add-on Modules → Install Module** dialog:

```text
https://github.com/Runyth/foundry-runyth-order-class-assassin-1424/releases/latest/download/module.json
```

## Licence

Copyright © 2026 Runyth

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
