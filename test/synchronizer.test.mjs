// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { syncActor } from "../src/core/synchronizer.mjs";

const root = resolve(import.meta.dirname, "..");
const sources = {};
for (const [pack, names] of Object.entries({
  features: ["assassinate", "assassins-tools", "infiltration-expertise", "shadow-in-the-night", "disappearing-act", "seize-the-moment"],
  equipment: ["disguise-kit", "poisoners-kit"],
})) {
  for (const name of names) {
    const document = JSON.parse(await readFile(resolve(root, `packs/_source/${pack}/${name}.json`), "utf8"));
    sources[document.flags["runyth-order"].source.sourceUuid] = document;
  }
}

function makeActor({ level = 17, playerDisguiseKit = false } = {}) {
  const actor = {
    id: "actor",
    uuid: "Actor.actor",
    classes: { rogue: { system: { levels: level } } },
    system: { traits: { toolProf: { value: [] } } },
    items: [{ id: "sub", uuid: "Actor.actor.Item.sub", name: "Assassin 1424", type: "subclass", system: { identifier: "runyth-order-class-assassin-1424" }, flags: {} }],
    async createEmbeddedDocuments(_type, documents) {
      const created = documents.map((document, index) => ({ ...structuredClone(document), _id: `new${this.items.length + index}`, id: `new${this.items.length + index}`, uuid: `Actor.actor.Item.new${this.items.length + index}` }));
      this.items.push(...created);
      return created;
    },
    async update(changes) {
      if (changes["system.traits.toolProf.value"]) this.system.traits.toolProf.value = changes["system.traits.toolProf.value"];
      return this;
    },
  };
  if (playerDisguiseKit) actor.items.push({ id: "player", uuid: "Actor.actor.Item.player", name: "My Disguise Kit", type: "tool", system: { identifier: "disguise-kit" }, flags: {} });
  return actor;
}

const resolver = async (uuid) => ({ ...structuredClone(sources[uuid]), toObject() { return structuredClone(sources[uuid]); } });

test("synchronization adds all missing level grants, kits, and proficiencies", async () => {
  const actor = makeActor();
  const report = await syncActor(actor, { resolver, core: null });
  assert.equal(report.changed, true);
  assert.equal(actor.items.filter((item) => item.type === "feat").length, 6);
  assert.ok(actor.items.some((item) => item.system.identifier === "disguise-kit"));
  assert.ok(actor.items.some((item) => item.system.identifier === "poisoners-kit"));
  assert.deepEqual(actor.system.traits.toolProf.value, ["disg", "pois"]);
});

test("synchronization is idempotent", async () => {
  const actor = makeActor();
  await syncActor(actor, { resolver, core: null });
  const itemCount = actor.items.length;
  const second = await syncActor(actor, { resolver, core: null });
  assert.equal(actor.items.length, itemCount);
  assert.equal(second.actions.filter((action) => action.type === "create-item").length, 0);
});

test("dry-run reports changes without mutating Actor", async () => {
  const actor = makeActor();
  const before = JSON.stringify({ items: actor.items, proficiencies: actor.system.traits.toolProf.value });
  const report = await syncActor(actor, { dryRun: true, resolver, core: null });
  assert.equal(report.changed, true);
  assert.equal(JSON.stringify({ items: actor.items, proficiencies: actor.system.traits.toolProf.value }), before);
});

test("player-owned equivalent kit is preserved", async () => {
  const actor = makeActor({ playerDisguiseKit: true });
  await syncActor(actor, { resolver, core: null });
  assert.equal(actor.items.filter((item) => item.system.identifier === "disguise-kit").length, 1);
  assert.equal(actor.items.find((item) => item.system.identifier === "disguise-kit").id, "player");
});
