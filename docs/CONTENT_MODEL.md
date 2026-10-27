# Canonical content model

## Advancement

| Rogue level | ItemGrant content |
|---:|---|
| 3 | Assassinate |
| 3 | Assassin’s Tools |
| 9 | Infiltration Expertise |
| 13 | Shadow in the Night; Disappearing Act |
| 17 | Seize the Moment |

## Identities

| Kind | Identifier |
|---|---|
| Module/provider/subclass | `runyth-order-class-assassin-1424` |
| Subclass provider entry | `assassin-1424` |
| Features | `assassinate`, `assassins-tools`, `infiltration-expertise`, `shadow-in-the-night`, `disappearing-act`, `seize-the-moment` |
| Equipment | `disguise-kit`, `poisoners-kit` |
| Upstream integration | `steady-aim`, `sneak-attack` |

The subclass Item has `type: subclass`, `system.classIdentifier: rogue`, and deterministic D&D 5e `_stats` metadata. The Character Options pack advertises subclass content in its manifest.

Visible names are not used as the sole integration key. Legacy identifier `runyth-assassin` is recognized only for migration compatibility.

## Assassinate

The canonical Item contains the complete written Assassin Strike rule, but automation metadata declares `native-critical-damage-dialog`. No separate attack activity, button, pending critical flag, or damage interception is canonical content in 1.0.5.

## Tool proficiency model

D&D 5e 5.3.3 stores Actor tool proficiencies in `system.traits.toolProf.value`. The module adds `disg` and `pois` idempotently. Equivalent player-owned kit Items are preserved.
