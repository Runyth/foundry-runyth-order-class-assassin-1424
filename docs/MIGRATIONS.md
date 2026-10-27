# Migrations

Migrations are registered through Runyth Order and never run automatically during world startup.

## `rename-assassin-1424-identity`

| Property | Value |
|---|---|
| Introduced | `1.0.3` |
| Scope | Documents |
| Backup required | Yes |
| Purpose | Move provider-managed data from `runyth-assassin` to `runyth-order-class-assassin-1424` |

It covers world Actors, embedded Items and Active Effects, unlinked synthetic token Actors, world Items, provider flags, subclass identifiers, compendium UUIDs, effect origins, and provider-owned effect change keys.

## `move-source-metadata-to-runyth-order`

| Property | Value |
|---|---|
| Introduced | `1.0.5` |
| Scope | Documents |
| Backup required | Yes |
| Purpose | Move source provenance from `flags.runyth-rules-core.source` to `flags.runyth-order.source` |

The migration:

- preserves the source descriptor fields;
- rewrites legacy provider and pack identity when encountered;
- advances provider-managed content metadata to the canonical content version;
- removes only the retired Core source namespace after the replacement value is prepared;
- does not delete or overwrite player-owned equivalent Items.

## Execution

1. Back up the world.
2. Enable Runyth Order and this module.
3. Open the Rules Hub migration interface as GM.
4. Preview or review the migration description.
5. Run the applicable migration once.
6. Audit representative Actors.

Both migrations are idempotent. Running them again should report no material document changes after the world is current.
