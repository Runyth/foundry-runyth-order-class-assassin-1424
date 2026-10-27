# Public API 1.0.0

Access:

```javascript
const assassin1424 = game.modules.get("runyth-order-class-assassin-1424")?.api;
```

| Method | Result | Errors |
|---|---|---|
| `apiVersion` | Exact string `1.0.0` | None |
| `isReady()` | Boolean | None |
| `whenReady()` | Promise resolving to the frozen API facade | Remains pending and a permanent notification is shown if provider registration fails |
| `hasAssassin1424Subclass(actor)` | Boolean | Returns false for absent or invalid input |
| `hasAssassinSubclass(actor)` | Compatibility alias | Returns false for absent or invalid input |
| `getActorState(actor)` | Frozen state summary | `TypeError` when Actor is absent |
| `syncActor(actor, { dryRun })` | Additive synchronization report | Rejects on permission or document failures |
| `auditActor(actor)` | Rules Core audit report or provider-local issues | `TypeError` when Actor is absent |
| `activateDisappearingAct(actorOrToken, options)` | Activation result and movement allowance | Rejects for ineligible Actor, no use, failed Hide resolution, or document error |
| `activateSeizeTheMoment(actorOrToken, options)` | Activation result and turn state | Rejects outside the Actor's active Combat turn or when unavailable |
| `openManager(options)` | ApplicationV2 manager | Rejects before manager initialization |

`getActorState()` retains `pendingAssassinStrikes: 0` as a deprecated read-only compatibility field. Version 1.0.5 creates no Assassin Strike pending state and exposes no custom strike activation API.

The old module lookup `game.modules.get("runyth-assassin")` cannot be retained because Foundry package IDs address module records. Use the current module ID.
