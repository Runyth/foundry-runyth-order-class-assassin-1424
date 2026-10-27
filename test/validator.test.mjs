// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";
import { validateActorPure } from "../src/core/validator.mjs";

function item(identifier, { type = "feat", managed = false, effects = [] } = {}) {
  return {
    id: identifier,
    uuid: `Actor.a.Item.${identifier}`,
    name: identifier,
    type,
    system: { identifier, levels: identifier === "rogue" ? 17 : undefined },
    effects,
    flags: managed ? {
      "runyth-order-class-assassin-1424": { managed: true, schemaVersion: 2, entryId: identifier, contentVersion: "1.0.5" },
      "runyth-order": { source: { schemaVersion: 1, providerId: "runyth-order-class-assassin-1424", packId: "runyth-order-class-assassin-1424.features", entryId: identifier, sourceUuid: null, contentVersion: "1.0.5", checksum: "a".repeat(64), importedAt: "2026-07-27T00:00:00.000Z" } },
    } : {},
  };
}

function actor() {
  return {
    id: "a",
    uuid: "Actor.a",
    classes: { rogue: { system: { levels: 17 } } },
    system: { traits: { toolProf: { value: ["disg", "pois"] } } },
    items: [
      item("runyth-order-class-assassin-1424", { type: "subclass" }),
      item("assassinate", { managed: true, effects: [{ changes: [{ key: "system.attributes.init.roll.mode", mode: 2, value: "1" }] }] }),
      item("assassins-tools", { managed: true }),
      item("infiltration-expertise", { managed: true }),
      item("shadow-in-the-night", { managed: true }),
      item("disappearing-act", { managed: true }),
      item("seize-the-moment", { managed: true }),
      item("disguise-kit", { type: "tool" }),
      item("poisoners-kit", { type: "tool" }),
      item("sneak-attack"),
    ],
    flags: {},
  };
}

test("complete level 17 Assassin passes provider validator", () => {
  assert.deepEqual(validateActorPure(actor(), { systemVersion: "5.3.3" }), []);
});

test("validator detects missing grants, tools, proficiencies, and Sneak Attack", () => {
  const target = actor();
  target.items = target.items.filter((entry) => !["infiltration-expertise", "disguise-kit", "sneak-attack"].includes(entry.system.identifier));
  target.system.traits.toolProf.value = ["pois"];
  const codes = validateActorPure(target, { systemVersion: "5.3.3" }).map((entry) => entry.code);
  assert.ok(codes.includes("MISSING_LEVEL_FEATURE"));
  assert.ok(codes.includes("MISSING_DISGUISE_KIT"));
  assert.ok(codes.includes("MISSING_TOOL_PROFICIENCY"));
  assert.ok(codes.includes("SNEAK_ATTACK_INTEGRATION_MISSING"));
});

test("validator detects duplicate managed content and unsupported system", () => {
  const target = actor();
  target.items.push(item("assassinate", { managed: true, effects: [{ changes: [{ key: "system.attributes.init.roll.mode", mode: 2, value: "1" }] }] }));
  const codes = validateActorPure(target, { systemVersion: "5.4.0" }).map((entry) => entry.code);
  assert.ok(codes.includes("DUPLICATE_PROVIDER_MANAGED_FEATURE"));
  assert.ok(codes.includes("UNSUPPORTED_DND5E_VERSION"));
});


test("validator detects duplicate provider-managed equipment", () => {
  const target = actor();
  target.items = target.items.filter((entry) => entry.system.identifier !== "disguise-kit");
  target.items.push(item("disguise-kit", { type: "tool", managed: true }));
  target.items.push(item("disguise-kit", { type: "tool", managed: true }));
  const codes = validateActorPure(target, { systemVersion: "5.3.3" }).map((entry) => entry.code);
  assert.ok(codes.includes("DUPLICATE_PROVIDER_MANAGED_EQUIPMENT"));
});

test("validator detects shaped but expired persistent turn state", () => {
  const target = actor();
  target.flags["runyth-order-class-assassin-1424"] = {
    seizeTheMoment: {
      actorUuid: target.uuid,
      combatUuid: "Combat.old",
      round: 1,
      turn: 0,
      sneakAttackUses: 1,
      active: true,
    },
  };
  const codes = validateActorPure(target, { systemVersion: "5.3.3", combat: null }).map((entry) => entry.code);
  assert.ok(codes.includes("STALE_PERSISTENT_TURN_STATE"));
});

test("validator is pure and does not mutate Actor data", () => {
  const target = actor();
  const before = JSON.stringify(target);
  validateActorPure(target, { systemVersion: "5.3.3" });
  assert.equal(JSON.stringify(target), before);
});
