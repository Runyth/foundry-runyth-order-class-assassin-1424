# Runyth Order naming scheme

## Canonical display names

The shared ecosystem display name is **Runyth Order**.

The core module is displayed as:

```text
Runyth Order
```

Complementary providers are displayed as:

```text
Runyth Order: <Category> <Content Name>
```

This module therefore uses exactly:

```text
Runyth Order: Class Assassin 1424
```

The title is used consistently in `module.json`, Foundry module management, module settings, provider registration, diagnostics, documentation, and release reports.

## Canonical technical IDs

New complementary modules use:

```text
runyth-order-<category-slug>-<content-name-slug>
```

For this module:

| Identity | Canonical value |
|---|---|
| Module ID | `runyth-order-class-assassin-1424` |
| Provider ID | `runyth-order-class-assassin-1424` |
| Subclass identifier | `runyth-order-class-assassin-1424` |
| Provider flag namespace | `flags.runyth-order-class-assassin-1424` |
| Character-options pack | `runyth-order-class-assassin-1424.character-options` |
| Features pack | `runyth-order-class-assassin-1424.features` |
| Equipment pack | `runyth-order-class-assassin-1424.equipment` |

Provider-local entry IDs remain concise and permanent, such as `assassinate` and `disguise-kit`.

The core module keeps technical module ID `runyth-order` and public API version `1.0.0` for compatibility while changing its display title to **Runyth Order**.

## Machine-readable naming metadata

Complementary manifests should declare under `flags.runyth`:

```json
{
  "orderName": "Runyth Order",
  "moduleKind": "Class",
  "contentName": "Assassin 1424",
  "canonicalTitle": "Runyth Order: Class Assassin 1424"
}
```

Provider metadata should expose the same category, content name, canonical title, and naming-scheme version. This lets Rules Core validate the title without guessing where a multiword category or content name begins.

## Core warning policy

Runyth Order should inspect provider registration and the active provider module manifest. A mismatch should produce one deduplicated, non-blocking console warning per provider per world load. The warning should include:

- provider ID;
- active module ID;
- actual provider title;
- actual module title;
- expected canonical title;
- the required pattern.

A naming mismatch must not reject an otherwise valid provider, mutate provider data, or prevent a world from loading. It is a compatibility and ecosystem-consistency warning, not a security boundary.

## Stability policy

Technical IDs become persistent database keys after release. Do not rename them merely for cosmetic wording. When an explicit identity rename is required, provide:

- a backup-requiring, GM-only, idempotent Rules Core migration;
- legacy reads before migration;
- additive synchronization that recognizes legacy managed documents;
- diagnostics for remaining legacy identity data;
- upgrade instructions preventing duplicate old/new modules.

Version 1.0.3 performs that explicit transition from `runyth-assassin` / `Runyth: The Assassin` to the identities documented above.
