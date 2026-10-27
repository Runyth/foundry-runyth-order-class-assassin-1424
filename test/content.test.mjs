// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { canonicalContentHash, embeddedEffectHash } from "../tools/lib/content-hash.mjs";

const root = resolve(import.meta.dirname, "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));

const manifest = await readJson("module.json");
const catalog = await readJson("packs/catalog.json");
const subclass = await readJson("packs/_source/character-options/assassin-1424.json");
const featureFiles = [
  "assassinate",
  "assassins-tools",
  "infiltration-expertise",
  "shadow-in-the-night",
  "disappearing-act",
  "seize-the-moment",
];
const features = Object.fromEntries(await Promise.all(featureFiles.map(async (id) => [id, await readJson(`packs/_source/features/${id}.json`)])));

test("manifest pins Foundry and D&D 5e exactly while allowing compatible Rules Core patches", () => {
  assert.deepEqual(manifest.compatibility, { minimum: "13.351", verified: "13.351", maximum: "13.351" });
  assert.deepEqual(manifest.relationships.systems[0].compatibility, { minimum: "5.3.3", verified: "5.3.3", maximum: "5.3.3" });
  assert.deepEqual(manifest.relationships.requires[0].compatibility, { minimum: "1.0.3", verified: "1.0.4" });
  assert.equal(manifest.relationships.requires.length, 1);
});

test("canonical packs and entries use stable unique UUIDs", () => {
  assert.deepEqual(catalog.packs.map((pack) => pack.id), ["character-options", "features", "equipment"]);
  const entries = catalog.packs.flatMap((pack) => pack.entries);
  assert.equal(entries.length, 9);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 9);
  assert.equal(new Set(entries.map((entry) => entry.uuid)).size, 9);
  assert.ok(entries.every((entry) => entry.uuid.startsWith("Compendium.runyth-order-class-assassin-1424.")));
});

test("subclass identity does not collide with official Assassin content", () => {
  assert.equal(subclass.name, "Assassin 1424");
  assert.equal(subclass.system.identifier, "runyth-order-class-assassin-1424");
  assert.notEqual(subclass.system.identifier, "assassin");
  assert.equal(subclass.system.classIdentifier, "rogue");
});

test("character-options pack is declared as player-visible subclass content", () => {
  const pack = manifest.packs.find((entry) => entry.name === "character-options");
  assert.ok(pack);
  assert.deepEqual(pack.flags?.dnd5e?.types, ["subclass"]);
  assert.equal(pack.ownership?.PLAYER, "OBSERVER");
  assert.equal(pack.ownership?.ASSISTANT, "OWNER");
  assert.equal(subclass.type, "subclass");
  assert.deepEqual(subclass._stats, {
    duplicateSource: null,
    coreVersion: "13.351",
    systemId: "dnd5e",
    systemVersion: "5.3.3",
    createdTime: 0,
    modifiedTime: 0,
    lastModifiedBy: "runythbuilder0000",
    exportSource: null,
  });
});

test("ItemGrant Advancement grants stable module compendium UUIDs at each threshold", () => {
  const grants = subclass.system.advancement.filter((advancement) => advancement.type === "ItemGrant");
  assert.deepEqual(grants.map((grant) => grant.level), [3, 3, 9, 13, 17]);
  const granted = grants.flatMap((grant) => grant.configuration.items.map((item) => item.uuid));
  const featureUuids = new Set(catalog.packs.find((pack) => pack.id === "features").entries.map((entry) => entry.uuid));
  assert.ok(granted.every((uuid) => featureUuids.has(uuid)));
  assert.ok(grants.every((grant) => grant.configuration.optional === false));
});

test("Assassinate preserves supplied English rules and permanent initiative effect", () => {
  const item = features.assassinate;
  assert.match(item.system.description.value, /permanent advantage on Initiative rolls/u);
  assert.match(item.system.description.value, /surprised creature is a critical hit/u);
  const change = item.effects.flatMap((effect) => effect.changes).find((entry) => entry.key === "system.attributes.init.roll.mode");
  assert.equal(change.mode, 2);
  assert.equal(change.value, "1");
});

test("Masterful Mimicry remains narrative and Roving Aim uses stable identity metadata", () => {
  const item = features["infiltration-expertise"];
  assert.match(item.system.description.value, /spent at least 1 hour studying them/u);
  assert.deepEqual(item.system.activities, {});
  assert.equal(item.flags["runyth-order-class-assassin-1424"].automation.steadyAimIdentifier, "steady-aim");
});


test("Shadow in the Night owns a high-priority custom effect for derived climbing speed", () => {
  const item = features["shadow-in-the-night"];
  const effect = item.effects.find((entry) => entry.flags?.["runyth-order-class-assassin-1424"]?.role === "dynamic-climb");
  assert.ok(effect);
  assert.equal(effect.transfer, true);
  assert.deepEqual(effect.changes, [{
    key: "flags.runyth-order-class-assassin-1424.dynamicClimb",
    mode: 0,
    value: "walk",
    priority: 100000,
  }]);
});

test("limited-use features recover on short and long rest", () => {
  for (const id of ["disappearing-act", "seize-the-moment"]) {
    const periods = features[id].system.uses.recovery.map((entry) => entry.period).sort();
    assert.equal(features[id].system.uses.max, "1");
    assert.deepEqual(periods, ["lr", "sr"]);
  }
});

test("every canonical document carries normalized source metadata", async () => {
  for (const pack of catalog.packs) {
    for (const entry of pack.entries) {
      const fileName = entry.id === "assassin-1424" ? "assassin-1424" : entry.identifier;
      const document = await readJson(`packs/_source/${pack.id}/${fileName}.json`);
      const source = document.flags["runyth-order"].source;
      assert.equal(source.schemaVersion, 1);
      assert.equal(source.providerId, "runyth-order-class-assassin-1424");
      assert.equal(source.packId, `runyth-order-class-assassin-1424.${pack.id}`);
      assert.equal(source.contentVersion, catalog.version);
      assert.match(source.checksum, /^[a-f0-9]{64}$/u);
      assert.equal(source.checksum, canonicalContentHash(document));
      assert.equal(document.flags["runyth-order-class-assassin-1424"].contentHash, source.checksum);
      for (const effect of document.effects ?? []) {
        if (!effect.flags?.["runyth-order-class-assassin-1424"]?.managed) continue;
        const effectSource = effect.flags?.["runyth-order"]?.source;
        assert.equal(effectSource?.providerId, "runyth-order-class-assassin-1424");
        assert.equal(effectSource?.packId, `runyth-order-class-assassin-1424.${pack.id}`);
        assert.match(effectSource?.entryId ?? "", /^[a-z0-9-]+\.[a-z0-9-]+$/u);
        assert.equal(effectSource?.checksum, embeddedEffectHash(effect));
      }
    }
  }
});

test("English and German localization keys have exact parity", async () => {
  const en = await readJson("lang/en.json");
  const de = await readJson("lang/de.json");
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
});
