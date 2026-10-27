# Pre-release live-test findings

## Test basis

A pre-release live session exercised the module version from before the Runyth Order identity rename in a Foundry VTT world with D&D 5e and Midi-QOL. The supplied console log records both the custom attack problem and the later subclass-selection failure context.

## Reported Assassin Strike behavior

The normal **Attack** followed by **Damage** worked. Selecting the separate **Assassin Strike** action allowed an attack roll, but the subsequent damage did not complete through the expected chat workflow.

The relevant module and Midi-QOL messages included:

```text
Assassin Strike requires exactly one targeted creature. The attack proceeds normally.
Obsidian Order Cultist is not explicitly Surprised. Damage remains normal.
You must roll the attack before rolling the damage
```

The stack shows the separate module action invoking an attack outside the activity chain expected by Midi-QOL's damage configuration. Version 1.0.4 therefore removed that separate action instead of maintaining a parallel attack workflow.

## Resolution

Use the normal weapon attack. When the GM confirms that the struck target is explicitly Surprised and the attack hits, select **Critical Hit** in the normal D&D 5e damage dialog.

This retains the homebrew rule and the system's standard attack/damage association.

## Reported subclass-selection behavior

After the old module identity was removed, the renamed release was installed, and the Actor was reset, **Assassin 1424** did not appear in the Rogue subclass picker.

Version 1.0.4 hardened every public discovery condition used by the D&D 5e picker:

- explicit subclass pack metadata in `module.json`;
- `type: subclass`;
- `system.classIdentifier: rogue`;
- unique subclass identifier;
- player-visible pack ownership;
- GM-managed D&D 5e browser-source enablement;
- explicit index-field preparation and startup validation.

## Scope of the log

The log also contains unrelated errors from other modules, remote media, and assets. They are not treated as Assassin 1424 defects unless the stack or message identifies this module.
