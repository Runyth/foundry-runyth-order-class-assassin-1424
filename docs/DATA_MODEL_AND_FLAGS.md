# Data model and flags

## Runyth Order source metadata

Every provider-managed canonical or world document uses:

```text
flags.runyth-order.source
```

The normalized descriptor contains:

```text
schemaVersion: 1
providerId: runyth-order-class-assassin-1424
packId: runyth-order-class-assassin-1424.<pack>
entryId: <stable entry ID>
sourceUuid: <stable compendium UUID or null>
contentVersion: 1.0.5
checksum: <SHA-256 or null>
importedAt: <ISO timestamp>
```

Runtime source tagging uses Runyth Order’s `normalizeSource`, `readSource`, and `tagDocument` APIs.

## Provider-local flags

Provider-managed state uses:

```text
flags.runyth-order-class-assassin-1424
```

| Field | Meaning |
|---|---|
| `schemaVersion` | Provider flag schema, currently `2` |
| `managed` | Document is managed by this provider |
| `entryId` | Stable provider entry ID |
| `contentVersion` | Canonical content version `1.0.5` |
| `automation` | Declarative automation metadata |
| `contentHash` | Deterministic canonical content hash |
| `provenance` | Runyth content citation |

Temporary turn and reaction state is stored only where required and is cleared through documented termination hooks. The public API does not expose mutable internal maps.

## Legacy reads

Before migration, the module recognizes:

- `flags.runyth-rules-core.source`;
- `flags.runyth-assassin`;
- source descriptors whose provider or pack ID begins with `runyth-assassin`.

Legacy reads are compatibility behavior, not the canonical write path. New and repaired managed data uses the current Runyth Order namespaces.

## Migration policy

Persistent namespace changes require explicit, GM-only, backup-requiring migrations. Version 1.0.5 therefore adds `move-source-metadata-to-runyth-order`; the earlier `rename-assassin-1424-identity` migration remains available for pre-rename data.
