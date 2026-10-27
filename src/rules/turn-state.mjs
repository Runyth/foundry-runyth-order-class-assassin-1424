// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function turnIdentity(combat, actorUuid = null) {
  if (!combat) return null;
  const combatant = combat.combatant ?? combat.current?.combatant ?? null;
  const actor = combatant?.actor ?? null;
  return Object.freeze({
    actorUuid: actorUuid ?? actor?.uuid ?? combatant?.actorId ?? null,
    combatUuid: combat.uuid ?? combat.id ?? null,
    round: Number(combat.round ?? combat.current?.round ?? 0),
    turn: Number(combat.turn ?? combat.current?.turn ?? -1),
  });
}

export function sameTurn(left, right) {
  return Boolean(left && right
    && left.actorUuid === right.actorUuid
    && left.combatUuid === right.combatUuid
    && left.round === right.round
    && left.turn === right.turn);
}

export function isValidTurnState(state) {
  return Boolean(state
    && typeof state.actorUuid === "string"
    && typeof state.combatUuid === "string"
    && Number.isInteger(state.round)
    && Number.isInteger(state.turn)
    && state.turn >= 0);
}

export class TurnStateStore {
  #states = new Map();

  activate(identity, { sneakAttackUses = 0 } = {}) {
    if (!isValidTurnState(identity)) throw new TypeError("A complete combat turn identity is required.");
    const initialUses = Math.max(0, Math.min(2, Number(sneakAttackUses) || 0));
    const state = Object.freeze({ ...identity, sneakAttackUses: initialUses, active: true });
    this.#states.set(identity.actorUuid, state);
    return state;
  }

  get(actorUuid) {
    return this.#states.get(actorUuid) ?? null;
  }

  recordSneakAttack(identity) {
    const state = this.get(identity?.actorUuid);
    if (!sameTurn(state, identity)) return { allowed: true, count: 1, empowered: false };
    const next = state.sneakAttackUses + 1;
    if (next > 2) return { allowed: false, count: state.sneakAttackUses, empowered: true };
    const updated = Object.freeze({ ...state, sneakAttackUses: next });
    this.#states.set(identity.actorUuid, updated);
    return { allowed: true, count: next, empowered: true };
  }

  clearActor(actorUuid) {
    return this.#states.delete(actorUuid);
  }

  clearCombat(combatUuid) {
    let count = 0;
    for (const [actorUuid, state] of this.#states) {
      if (state.combatUuid === combatUuid) {
        this.#states.delete(actorUuid);
        count += 1;
      }
    }
    return count;
  }

  clearExcept(identity) {
    let count = 0;
    for (const [actorUuid, state] of this.#states) {
      if (!sameTurn(state, identity)) {
        this.#states.delete(actorUuid);
        count += 1;
      }
    }
    return count;
  }

  clear() {
    this.#states.clear();
  }

  snapshot() {
    return [...this.#states.values()].map((state) => ({ ...state }));
  }
}
