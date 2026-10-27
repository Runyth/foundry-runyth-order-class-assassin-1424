# Troubleshooting

## API compatibility error

Observed error:

```text
Runyth Order: Class Assassin 1424 requires the Runyth Rules Core 1.0.0 provider registry API.
```

This indicates version 1.0.4 or an older build is installed. Those builds looked up the retired module ID `runyth-rules-core`.

Correct 1.0.7 requirements:

- foundation module ID: `runyth-order`;
- foundation public API: `1.0.0`;
- foundation module version: minimum `1.0.3`, verified `1.0.4`;
- provider module version: `1.0.7`.

Remove the old Assassin module directory completely, install 1.0.7, enable **Runyth Order**, and then enable this module.

Expected module messages include:

```text
Runyth Order: Class Assassin 1424 | API 1.0.0 initialized.
Runyth Order: Class Assassin 1424 | Provider runyth-order-class-assassin-1424 v1.0.7 registered.
Runyth Order: Class Assassin 1424 | Ready with provider runyth-order-class-assassin-1424 registered.
```

## `src/main.mjs` returns HTTP 404

This is the package-integrity defect fixed in version 1.0.7.

1. Remove the complete previous module directory instead of merging ZIP contents.
2. Install the v1.0.7 ZIP.
3. Confirm `module.json` contains exactly `src/main.mjs` under `esmodules`.
4. Confirm `Data/modules/runyth-order-class-assassin-1424/src/main.mjs` exists with matching case.
5. Reload the world and confirm that exact request returns successfully.
6. Confirm no secondary requests are made for `src/api.mjs`, `src/automation/disappearing-act.mjs`, or other editable modules.
7. Confirm the Assassin 1424 provider registers before Runyth Order reports its final provider count.

The release build itself now fails if the manifest points at a missing runtime file or if any declared/discovered runtime asset is absent from the final ZIP.

## Secondary `src/*.mjs` requests fail with `net::ERR_FAILED`

This is the defect fixed in version 1.0.6. The installable release no longer exposes the editable `src/` graph as browser runtime.

1. Remove the complete previous module directory.
2. Install the v1.0.7 ZIP.
3. Confirm `module.json` lists only `src/main.mjs` under `esmodules`.
4. Confirm `src/main.mjs` exists in the module directory.
5. Reload the world and verify there are no requests for `modules/runyth-order-class-assassin-1424/src/api.mjs` or other secondary `src/*.mjs` files.
6. Confirm the provider registers before Runyth Order reports its final provider count.

If `src/*.mjs` requests still appear, the browser or hosting layer is serving an older cached module manifest or an old module directory is still installed.

## Compendia contain zero Items

Version 1.0.4 could create empty pack storage. Version 1.0.5 uses fresh pack paths and rejects empty packs during packaging.

1. Shut down the world.
2. Remove `Data/modules/runyth-order-class-assassin-1424/` completely.
3. Extract the 1.0.7 installation ZIP.
4. Restart Foundry.
5. Confirm pack counts are 1, 6, and 2.

Do not merge the new ZIP into the old directory.

## Assassin 1424 is absent from the Rogue picker

1. Confirm the Character Options pack contains one Item named **Assassin 1424**.
2. Confirm the module setting exposing the subclass is enabled.
3. As GM, open D&D 5e Compendium Browser Sources and confirm the Character Options pack is enabled.
4. Reopen the Rogue Advancement flow.
5. Check the console for the localized subclass-unavailable diagnostic.

## There is no Assassin Strike button

This is correct from version 1.0.4 onward. Roll the weapon attack normally and use the standard **Critical Hit** damage option only after the GM confirms the struck target was explicitly Surprised.

## Existing managed Items still use old Core flags

Back up the world and run **Move source metadata to Runyth Order** through the Rules Hub. Before migration, the module can read the legacy flags, but new source tagging uses `flags.runyth-order.source`.

## Manager operation fails

Run an audit first and inspect the reported issue code. The manager does not silently overwrite user-modified Items. Use dry-run synchronization before applying repairs.

## Unrelated console errors

The supplied world log contains errors and deprecations attributed to other modules. Diagnose those against the package named in each stack trace. This module does not patch or suppress third-party failures.
