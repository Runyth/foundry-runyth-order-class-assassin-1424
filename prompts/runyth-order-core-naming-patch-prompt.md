> **Historical artifact:** This prompt was created before the accepted Runyth Order technical identity was finalized. The current canonical foundation module ID is `runyth-order`, its API lookup is `game.modules.get("runyth-order")?.api`, and its managed-source namespace is `flags.runyth-order.source`. Do not reintroduce `runyth-rules-core` as a current dependency.

# Runyth Rules Core patch request: rename to Runyth Order and enforce complementary-module naming

Create and provide a complete production-quality patch release of the newest accepted **Runyth Rules Core** source baseline.

Do not stop at analysis, pseudocode, or a patch description. Implement, test, package, and validate the release completely, including both a ready-to-install module ZIP and a complete reproducible source ZIP for the same version, plus checksums and validation evidence.

## Primary rename

Rename the core module’s full user-facing display title to exactly:

```text
Runyth Order
```

This title must be used consistently wherever users see the package, including:

- `module.json` title;
- Foundry module installation and management UI;
- module settings headings and menus;
- Rules Hub windows and headings;
- notifications and console messages;
- English and German localization;
- README, architecture, provider guide, troubleshooting, migration, release, and API documentation;
- build and release reports.

Keep the established technical module ID `runyth-order`, API lookup path, source-metadata namespace, settings namespace, and public API compatibility stable unless the actual source proves a technical change is unavoidable. The expected result is a display-brand rename, not a breaking dependency-ID change. Existing complementary modules must continue to resolve:

```javascript
const core = game.modules.get("runyth-order")?.api;
```

Create the next appropriate patch version from the latest accepted source baseline. Do not reset or reconstruct from version 1.0.0 when a newer accepted release exists.

## Runyth Order complementary-module naming contract

Document and implement this canonical naming scheme:

```text
Runyth Order: <Category> <Content Name>
```

Example:

```text
Runyth Order: Class Assassin 1424
```

New complementary-module technical IDs should follow:

```text
runyth-order-<category-slug>-<content-name-slug>
```

The reference Assassin module uses:

```text
Module ID: runyth-order-class-assassin-1424
Provider ID: runyth-order-class-assassin-1424
Title: Runyth Order: Class Assassin 1424
```

Complementary modules should declare machine-readable naming metadata under their Foundry manifest’s `flags.runyth`, at minimum:

```json
{
  "orderName": "Runyth Order",
  "moduleKind": "Class",
  "contentName": "Assassin 1424",
  "canonicalTitle": "Runyth Order: Class Assassin 1424"
}
```

Providers should expose equivalent metadata in their provider descriptor. Add this contract to the provider schema and complementary-module guide without weakening existing provider validation.

## Naming warnings in Runyth Order

When a complementary provider registers, Runyth Order must inspect:

1. the provider descriptor title;
2. the active provider module’s `module.json` title;
3. the provider and manifest naming metadata when present.

Derive the expected title from explicit metadata rather than guessing where multiword names begin:

```text
<orderName>: <moduleKind> <contentName>
```

When the provider or active module does not follow the scheme, emit a concise, deduplicated console warning containing:

- provider ID;
- module ID;
- actual provider title;
- actual module title;
- expected canonical title;
- required pattern `Runyth Order: <Category> <Content Name>`.

Requirements:

- Warn at most once per provider per world load for the same mismatch.
- Do not reject an otherwise valid provider solely because of naming.
- Do not unregister providers or mutate provider/module data.
- Do not create repeated warnings on Rules Hub rerenders or diagnostics reruns.
- Make warnings available to diagnostics and the Rules Hub when appropriate, while retaining the console warning requested above.
- Do not warn about the core module itself.
- Preserve provider registration ordering and the provider count.
- Keep the warning localized where shown in UI; console output may use a stable English diagnostic sentence plus machine-readable details.
- Use stable issue or warning codes, such as `PROVIDER_NAMING_MISMATCH` and `MODULE_NAMING_MISMATCH`.

## Compatibility and migration boundaries

The core display rename must not invalidate:

- module dependency ID `runyth-order`;
- `game.modules.get("runyth-order")?.api`;
- `flags.runyth-order.source`;
- existing provider IDs;
- registered pack, validator, or migration IDs;
- completed migration records;
- stored settings.

Do not add a data migration merely for a display-title change. Add a migration only if a genuine persistent data transformation is required by the actual implementation.

## Documentation

Add a dedicated naming-contract document covering:

- core display name;
- complementary display-name format;
- recommended technical-ID format;
- manifest metadata fields;
- provider metadata fields;
- warning semantics;
- non-blocking behavior;
- ID stability after release;
- examples for class, species, rules, equipment, and setting providers.

Update all existing documentation to use **Runyth Order** as the user-facing core name while retaining the technical ID where code or migration compatibility requires it.

Use `master` as the default Git branch in documentation, links, workflow branch filters, examples, and repository initialization.

## Automated tests

Add meaningful tests covering at least:

- manifest title is exactly `Runyth Order`;
- module ID remains `runyth-order`;
- public API lookup remains unchanged;
- existing provider descriptors still register;
- conforming provider and module titles produce no warning;
- provider-title mismatch produces one warning;
- module-title mismatch produces one warning;
- both mismatches remain deduplicated;
- multiword category and content names use explicit metadata correctly;
- missing metadata follows a documented compatibility policy;
- naming warnings do not reject provider registration;
- naming warnings appear in diagnostics/Rules Hub where implemented;
- repeated diagnostics and Rules Hub renders do not repeat console warnings;
- the core module itself is excluded;
- English/German localization parity;
- no provider count regression;
- no migration is invented for the display-only rename;
- deterministic build and byte-identical repeated packaging;
- clean source extraction and complete rebuild.

## Required release artifacts

Provide:

1. version-matched ready-to-install Runyth Order module ZIP;
2. version-matched complete reproducible source ZIP;
3. SHA-256 checksum file;
4. human-readable build and validation report;
5. machine-readable build report;
6. complete validation log;
7. fresh-extraction validation log;
8. standalone versioned `module.json`;
9. concise inventory of API, settings, provider checks, diagnostics, migrations, and naming rules.

Do not claim a live Foundry browser test unless it was actually performed. Include an explicit manual test checklist for module management, settings, provider registration, Rules Hub display, console warning deduplication, German UI, and worlds containing legacy complementary providers.
