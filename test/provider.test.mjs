// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { providerDescriptor } from "../src/core/provider.mjs";

const catalog = JSON.parse(await readFile(resolve(import.meta.dirname, "../packs/catalog.json"), "utf8"));
const provider = providerDescriptor(catalog);

test("provider registration identity and compatibility are exact", () => {
  assert.equal(provider.id, "runyth-order-class-assassin-1424");
  assert.equal(provider.moduleId, "runyth-order-class-assassin-1424");
  assert.equal(provider.title, "Runyth Order: Class Assassin 1424");
  assert.equal(provider.version, "1.0.8");
  assert.equal(provider.metadata.namingSchemeVersion, "1.1");
  assert.equal(provider.metadata.orderName, "Runyth Order");
  assert.equal(provider.metadata.moduleKind, "Class");
  assert.equal(provider.metadata.contentName, "Assassin 1424");
  assert.equal(provider.metadata.canonicalTitle, "Runyth Order: Class Assassin 1424");
  assert.ok(provider.packs.every((pack) => pack.version === "1.0.5"));
  assert.deepEqual(provider.coreApi, { minimum: "1.0.0", verified: "1.0.0", maximum: "1.0.0" });
  assert.deepEqual(provider.systems[0], { id: "dnd5e", minimum: "5.3.3", verified: "5.3.3", maximum: "5.3.3" });
});

test("provider declares requested capabilities and the identity migration", () => {
  for (const capability of [
    "content.subclasses",
    "content.features",
    "content.equipment",
    "automation.activities",
    "automation.advancement",
    "automation.effects",
    "automation.rests",
    "automation.resources",
    "integration.dnd5e",
    "validation.actor",
    "validation.content",
    "migration.documents",
    "runyth-order-class-assassin-1424.disappearing-act",
    "runyth-order-class-assassin-1424.rooftop-pursuit",
    "runyth-order-class-assassin-1424.seize-the-moment",
  ]) assert.ok(provider.capabilities.includes(capability));
  assert.equal(provider.capabilities.includes("runyth-order-class-assassin-1424.assassin-strike"), false);
  assert.equal(provider.metadata.assassinStrikeWorkflow, "native-critical-damage-dialog");
  assert.equal(provider.metadata.subclassDiscovery, "dnd5e-compendium-browser");
  assert.equal(provider.migrations.length, 2);
  assert.deepEqual(provider.migrations.map((migration) => migration.id), [
    "rename-assassin-1424-identity",
    "move-source-metadata-to-runyth-order",
  ]);
  assert.ok(provider.migrations.every((migration) => migration.requiresBackup));
  assert.equal(provider.validators.length, 1);
});

test("provider packs register all canonical stable entries", () => {
  assert.equal(provider.packs.length, 3);
  assert.equal(provider.packs.reduce((count, pack) => count + pack.entries.length, 0), 9);
  assert.ok(provider.packs.every((pack) => pack.compendia.length === 1));
});
