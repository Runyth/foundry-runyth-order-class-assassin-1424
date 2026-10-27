// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { incomingHp, hpValue, performHide, resolveActorOrToken } from "../src/automation/disappearing-act.mjs";
import { applyDynamicClimb, cloneRollConfig, DYNAMIC_CLIMB_KEY, parseSkillHook } from "../src/automation/rooftop-pursuit.mjs";
import { deleteMovementZero, SteadyAimAutomation } from "../src/automation/steady-aim.mjs";

const root = resolve(import.meta.dirname, "..");

test("damage detection recognizes one HP reduction update", () => {
  const actor = { system: { attributes: { hp: { value: 20 } } } };
  assert.equal(hpValue(actor), 20);
  assert.equal(incomingHp({ "system.attributes.hp.value": 12 }), 12);
  assert.equal(incomingHp({ system: { attributes: { hp: { value: 11 } } } }), 11);
});

test("Roving Aim Actor update filtering preserves unrelated restrictions", () => {
  const update = {
    "system.attributes.movement.walk": 0,
    "system.attributes.movement.fly": 0,
    "system.attributes.hp.value": 0,
  };
  assert.equal(deleteMovementZero(update), true);
  assert.equal(update["system.attributes.movement.walk"], undefined);
  assert.equal(update["system.attributes.movement.fly"], 0);
  assert.equal(update["system.attributes.hp.value"], 0);
});

test("Roving Aim preserves an explicitly unrelated Active Effect speed restriction", () => {
  const previousFromUuidSync = globalThis.fromUuidSync;
  globalThis.fromUuidSync = () => ({ system: { identifier: "unrelated-speed-restriction" } });
  try {
    const actor = {
      documentName: "Actor",
      uuid: "Actor.a",
      items: [{ system: { identifier: "infiltration-expertise" } }],
    };
    const automation = new SteadyAimAutomation();
    automation.markers.set(actor.uuid, Date.now() + 5000);
    const data = {
      origin: "Actor.a.Item.unrelated",
      changes: [{ key: "system.attributes.movement.walk", mode: 5, value: "0" }],
    };

    automation.filterEffect({ parent: actor, origin: data.origin }, data);

    assert.equal(data.changes.length, 1);
  } finally {
    globalThis.fromUuidSync = previousFromUuidSync;
  }
});

test("Roving Aim removes only Steady Aim's own speed-zero effect", () => {
  const previousFromUuidSync = globalThis.fromUuidSync;
  globalThis.fromUuidSync = () => ({ system: { identifier: "steady-aim" } });
  try {
    const actor = {
      documentName: "Actor",
      uuid: "Actor.a",
      items: [{ system: { identifier: "infiltration-expertise" } }],
    };
    const automation = new SteadyAimAutomation();
    const data = {
      origin: "Actor.a.Item.steadyAim",
      changes: [
        { key: "system.attributes.movement.walk", mode: 5, value: "0" },
        { key: "system.attributes.movement.fly", mode: 5, value: "0" },
      ],
    };

    automation.filterEffect({ parent: actor, origin: data.origin }, data);

    assert.deepEqual(data.changes, [{ key: "system.attributes.movement.fly", mode: 5, value: "0" }]);
  } finally {
    globalThis.fromUuidSync = previousFromUuidSync;
  }
});

test("synthetic token Actor resolution uses the token Actor", async () => {
  const actor = { documentName: "Actor", uuid: "Actor.synthetic" };
  const token = { document: { documentName: "Token", uuid: "Scene.s.Token.t" }, actor };
  assert.deepEqual(await resolveActorOrToken(token), { actor, token });
});

test("Hide adapter uses the D&D 5e 5.3.3 rollSkill configuration signature", async () => {
  const calls = [];
  const actor = { rollSkill: async (...args) => { calls.push(args); return ["roll"]; } };
  assert.deepEqual(await performHide(actor, { event: "event", dialog: { configure: false }, message: { rollMode: "gmroll" } }), ["roll"]);
  assert.deepEqual(calls, [[
    { skill: "ste", event: "event" },
    { configure: false },
    { rollMode: "gmroll" },
  ]]);
  const source = await readFile(resolve(root, "src/automation/disappearing-act.mjs"), "utf8");
  assert.doesNotMatch(source, /\.hidden\s*=/u);
  assert.doesNotMatch(source, /statuses:\s*\[\s*["']invisible/u);
  assert.doesNotMatch(source, /rollSkill\(["']ste["']/u);
});

test("Rooftop Pursuit parses the D&D 5e preRollSkill payload and preserves roll options", () => {
  const actor = { documentName: "Actor", uuid: "Actor.a" };
  const config = { subject: actor, skill: "acr", advantage: false, disadvantage: true, hookNames: ["skill"], rolls: [{ parts: ["@mod"] }] };
  const dialog = { configure: true };
  const message = { rollMode: "publicroll" };
  assert.deepEqual(parseSkillHook([config, dialog, message]), { actor, skillId: "acr", config, dialog, message });
  const copy = cloneRollConfig(config);
  assert.equal(copy.subject, undefined);
  assert.equal(copy.hookNames, undefined);
  assert.equal(copy.skill, "acr");
  assert.equal(copy.disadvantage, true);
  assert.notEqual(copy.rolls, config.rolls);
  assert.notEqual(copy.rolls[0], config.rolls[0]);
});

test("dynamic climbing speed uses the public custom Active Effect accumulator", () => {
  const actor = {
    system: { attributes: { movement: { walk: 45, climb: 10 } } },
    items: [{ system: { identifier: "shadow-in-the-night" } }],
  };
  const changes = {};
  assert.equal(applyDynamicClimb(actor, { key: DYNAMIC_CLIMB_KEY }, changes), true);
  assert.equal(changes["system.attributes.movement.climb"], 45);
  actor.system.attributes.movement.walk = 20;
  assert.equal(applyDynamicClimb(actor, { key: DYNAMIC_CLIMB_KEY }, changes), true);
  assert.equal(changes["system.attributes.movement.climb"], 20);
});

test("Seize implementation records four-part turn identity and rejects third use", async () => {
  const source = await readFile(resolve(root, "src/automation/seize-the-moment.mjs"), "utf8");
  for (const key of ["actorUuid", "combatUuid", "round", "turn"]) assert.match(source, new RegExp(key, "u"));
  assert.match(source, /state\.sneakAttackUses >= 2/u);
  assert.match(source, /return false/u);
});

test("no source modifies or duplicates official Sneak Attack Item", async () => {
  const source = await readFile(resolve(root, "src/automation/seize-the-moment.mjs"), "utf8");
  assert.doesNotMatch(source, /createEmbeddedDocuments\("Item"/u);
  assert.doesNotMatch(source, /sneak.?attack.*\.update/iu);
});


test("damage prompt originates from the single initiating update client", async () => {
  const source = await readFile(resolve(root, "src/automation/disappearing-act.mjs"), "utf8");
  assert.doesNotMatch(source, /currentUserIsAuthority/u);
  assert.match(source, /options\.runythOrderAssassin1424DamageKey = key/u);
  assert.match(source, /pendingPrompts\.has\(key\)/u);
});

test("only supported rest completion hook is registered", async () => {
  const source = await readFile(resolve(root, "src/automation/seize-the-moment.mjs"), "utf8");
  assert.match(source, /dnd5e\.restCompleted/u);
  assert.doesNotMatch(source, /dnd5e\.shortRest/u);
  assert.doesNotMatch(source, /dnd5e\.longRest/u);
  assert.match(source, /deleteToken/u);
});
