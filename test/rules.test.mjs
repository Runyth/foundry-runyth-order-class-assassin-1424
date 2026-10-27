// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";
import { selectControllingUser } from "../src/rules/controllers.mjs";
import { hasAssassinSubclass, isSteadyAim } from "../src/rules/identity.mjs";
import { halfCurrentSpeed, removeSteadyAimSpeedZero, synchronizeDerivedClimb } from "../src/rules/speeds.mjs";
import { missingToolProficiencies, requiredToolProficiencies } from "../src/rules/tools.mjs";
import { sameTurn, TurnStateStore } from "../src/rules/turn-state.mjs";
import { remainingUses } from "../src/rules/uses.mjs";

const identity = { actorUuid: "Actor.a", combatUuid: "Combat.c", round: 1, turn: 0 };

test("tool proficiencies are idempotent and preserve existing values", () => {
  assert.deepEqual(requiredToolProficiencies(["thief", "disg"]), ["disg", "pois", "thief"]);
  assert.deepEqual(missingToolProficiencies(new Set(["disg", "pois"])), []);
  assert.deepEqual(missingToolProficiencies([]), ["disg", "pois"]);
});

test("Steady Aim filtering removes only its walking-speed-zero changes", () => {
  const changes = [
    { key: "system.attributes.movement.walk", value: "0" },
    { key: "system.attributes.movement.fly", value: "0" },
    { key: "system.attributes.ac.value", value: "-2" },
  ];
  assert.deepEqual(removeSteadyAimSpeedZero(changes), changes.slice(1));
  assert.equal(isSteadyAim({ system: { identifier: "steady-aim" }, name: "Renamed" }), true);
  assert.equal(isSteadyAim({ name: "Steady Aim" }), false);
});

test("climbing speed follows walking increases and decreases without an update API", () => {
  const actor = { system: { attributes: { movement: { walk: 45, climb: 10 } } } };
  assert.equal(synchronizeDerivedClimb(actor), true);
  assert.equal(actor.system.attributes.movement.climb, 45);
  actor.system.attributes.movement.walk = 20;
  assert.equal(synchronizeDerivedClimb(actor), true);
  assert.equal(actor.system.attributes.movement.climb, 20);
});

test("Disappearing Act allowance uses half current effective walking Speed", () => {
  assert.equal(halfCurrentSpeed({ system: { attributes: { movement: { walk: 35 } } } }), 17.5);
});

test("controller selection prefers owner and falls back to active GM", () => {
  const actor = { testUserPermission: (user) => user.id === "owner" };
  const users = [{ id: "owner", active: true, isGM: false }, { id: "gm", active: true, isGM: true }];
  assert.equal(selectControllingUser({ actor, users }), "owner");
  assert.equal(selectControllingUser({ actor: { testUserPermission: () => false }, users }), "gm");
});

test("Seize state allows exactly two Sneak Attacks on the same turn", () => {
  const store = new TurnStateStore();
  store.activate(identity);
  assert.deepEqual(store.recordSneakAttack(identity), { allowed: true, count: 1, empowered: true });
  assert.deepEqual(store.recordSneakAttack(identity), { allowed: true, count: 2, empowered: true });
  assert.deepEqual(store.recordSneakAttack(identity), { allowed: false, count: 2, empowered: true });
});

test("turn state clears and never crosses Actor or Combat identity", () => {
  const store = new TurnStateStore();
  store.activate(identity);
  assert.equal(sameTurn(store.get(identity.actorUuid), { ...identity, turn: 1 }), false);
  assert.equal(store.clearCombat(identity.combatUuid), 1);
  assert.equal(store.get(identity.actorUuid), null);
});

test("limited-use calculation uses max minus spent", () => {
  assert.equal(remainingUses({ system: { uses: { max: "1", spent: 0 } } }), 1);
  assert.equal(remainingUses({ system: { uses: { max: "1", spent: 1 } } }), 0);
});

test("assassin subclass detection uses stable identifier", () => {
  const actor = { items: [{ type: "subclass", name: "Renamed", system: { identifier: "runyth-order-class-assassin-1424" } }] };
  assert.equal(hasAssassinSubclass(actor), true);
});
