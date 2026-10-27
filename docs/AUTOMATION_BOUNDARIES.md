# Automation boundaries

## Fully represented by the module

- Initiative Advantage is added through the D&D 5e roll-mode data path without clearing Disadvantage.
- Tool grants and proficiencies are additive and idempotent.
- Roving Aim filters only the speed-to-zero change associated with stable `steady-aim` activity identity.
- Climbing Speed follows effective walking Speed through a provider-owned transferred custom Active Effect and Foundry V13's public Active Effect preparation.
- Disappearing Act use recovery, owner routing, one-prompt gating, Hide resolution, and temporary movement allowance are tracked.
- Rooftop Pursuit adds Advantage through the normal Acrobatics roll configuration.
- Seize the Moment is scoped to Actor UUID, Combat UUID, round, and turn and rejects a third Sneak Attack.

## Assassinate critical-hit workflow

Version 1.0.4 and later intentionally contain no separate Assassin Strike attack button and no custom attack-to-damage interception.

The correct table workflow is:

1. roll the weapon attack normally;
2. the GM determines whether the target is explicitly Surprised;
3. after a hit, select **Critical Hit** in the standard D&D 5e damage dialog.

This preserves the written rule while retaining the native D&D 5e and Midi-QOL usage-card chain. The module does not infer Surprise from hidden state, initiative order, first round, or whether a target has acted.

## Visible manual boundaries

Foundry core has no universal public API for suppressing every third-party Opportunity Attack workflow or enforcing an additional action as Attack-only. The module therefore creates explicit temporary effects and localized chat guidance. It does not claim stronger enforcement.
