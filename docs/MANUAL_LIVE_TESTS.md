# Manual live-test checklist

Use a disposable world with:

- Foundry VTT 13.351;
- D&D 5e 5.3.3;
- Runyth Order module `runyth-order`, minimum 1.0.3 and preferably 1.0.4;
- Runyth Order: Class Assassin 1424 v1.0.7;
- one GM browser;
- one separate player browser.

## Clean installation and API

- [ ] Remove the complete prior Assassin module directory before extraction.
- [ ] Enable Runyth Order before the Assassin module.
- [ ] Confirm no missing-dependency message names `runyth-rules-core`.
- [ ] Confirm the provider registers under `runyth-order-class-assassin-1424`.
- [ ] Confirm the module reaches its ready message without an API compatibility error.
- [ ] Confirm Network/console shows no requests for `modules/runyth-order-class-assassin-1424/src/*.mjs`.
- [ ] Confirm the manifest-loaded JavaScript entry is `src/main.mjs` and that exact file exists in the installed module.
- [ ] Confirm `game.modules.get("runyth-order-class-assassin-1424")?.api.apiVersion` is `1.0.0` when inspected by a developer.

## Compendium integrity

- [ ] Character Options contains exactly 1 Item.
- [ ] Features contains exactly 6 Items.
- [ ] Equipment contains exactly 2 Items.
- [ ] The subclass Item is **Assassin 1424**, type `subclass`, class identifier `rogue`.
- [ ] No old empty `character-options`, `features`, or `equipment` pack shadows the `*-v2.db` paths.

## Advancement

Test Rogue Actors at levels 2, 3, 9, 13, 17, and 20.

- [ ] Open normal Rogue subclass Advancement.
- [ ] Confirm **Assassin 1424** appears.
- [ ] Select it and complete Advancement.
- [ ] Confirm level 3 grants Assassinate and Assassin’s Tools.
- [ ] Confirm level 9 grants Infiltration Expertise.
- [ ] Confirm level 13 grants Shadow in the Night and usable Disappearing Act.
- [ ] Confirm level 17 grants Seize the Moment.
- [ ] Level down and correct Advancement without duplicate managed Items.

## Assassinate

- [ ] Confirm Initiative rolls have Advantage.
- [ ] Confirm existing Disadvantage still cancels normally.
- [ ] Confirm no separate Assassin Strike button appears.
- [ ] Roll melee and ranged weapon attacks normally.
- [ ] On a hit against an explicitly Surprised target, choose **Critical Hit** in the native damage dialog.
- [ ] Confirm damage appears normally in core D&D 5e and with Midi-QOL enabled.
- [ ] Confirm non-surprised targets use normal damage.

## Remaining features

- [ ] Assassin’s Tools grants both kits and proficiencies once.
- [ ] Steady Aim retains its benefits without reducing this Actor’s Speed to zero.
- [ ] Unrelated speed restrictions remain.
- [ ] Rooftop Pursuit prompts only for eligible Acrobatics checks.
- [ ] Walking-Speed increases and decreases update effective climbing Speed.
- [ ] Damage creates only one Disappearing Act prompt per workflow.
- [ ] Yes consumes one use only after activation succeeds; No changes nothing.
- [ ] Short and long rests recover Disappearing Act and Seize the Moment.
- [ ] Seize the Moment appears only at the start of the eligible Actor’s turn.
- [ ] Exactly one additional Sneak Attack can be used during that turn.
- [ ] Turn change, Combat deletion, and reload clear temporary entitlement state.
- [ ] Linked and unlinked token Actors work.
- [ ] One controlling user receives prompts; GM fallback works.

## Migrations and audits

- [ ] In a cloned legacy world, run **Move source metadata to Runyth Order** after backup.
- [ ] Confirm `flags.runyth-rules-core.source` becomes `flags.runyth-order.source`.
- [ ] Run the same migration again and confirm no material changes.
- [ ] Where pre-rename data exists, run **Rename provider identity to Assassin 1424**.
- [ ] Run Rules Hub audit and diagnostics.
- [ ] Confirm no provider-managed duplicates or stale source metadata remain.

Record Foundry, D&D 5e, Runyth Order, Assassin module, Midi-QOL, and browser versions with any failure report.
