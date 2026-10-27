// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_VERSION, CORE_ID, LEGACY_CORE_ID, MODULE_ID } from "../src/constants.mjs";
import {
  buildLegacyIdentityUpdate,
  coreIdentityMigration,
  legacyIdentityMigration,
  rewriteLegacySource,
  runCoreIdentityMigration,
  runLegacyIdentityMigration,
} from "../src/core/identity-migration.mjs";

function legacySource(entryId = "the-assassin") {
  return {
    schemaVersion: 1,
    providerId: "runyth-assassin",
    packId: "runyth-assassin.character-options",
    entryId,
    sourceUuid: "Compendium.runyth-assassin.character-options.Item.a551a551a551a551",
    contentVersion: "1.0.0",
    checksum: "a".repeat(64),
    importedAt: "2026-07-27T00:00:00.000Z",
  };
}

function document(data) {
  return {
    ...data,
    updates: [],
    async update(change) {
      this.updates.push(change);
    },
  };
}

test("legacy source metadata rewrites to the Assassin 1424 namespace", () => {
  const source = rewriteLegacySource(legacySource());
  assert.equal(source.providerId, MODULE_ID);
  assert.equal(source.packId, `${MODULE_ID}.character-options`);
  assert.equal(source.entryId, "assassin-1424");
  assert.equal(source.sourceUuid, `Compendium.${MODULE_ID}.character-options.Item.a551a551a551a551`);
  assert.equal(source.contentVersion, CONTENT_VERSION);
});

test("legacy document update moves flags, subclass identifier, name, effect keys, and origin", () => {
  const update = buildLegacyIdentityUpdate({
    name: "The Assassin",
    system: { identifier: "runyth-assassin" },
    origin: "Compendium.runyth-assassin.features.Item.a554000000000013",
    changes: [{ key: "flags.runyth-assassin.dynamicClimb", mode: 0, value: "walk" }],
    flags: {
      "runyth-assassin": { schemaVersion: 1, managed: true, entryId: "the-assassin", contentVersion: "1.0.0" },
      [LEGACY_CORE_ID]: { source: legacySource() },
    },
  });
  assert.equal(update.name, "Assassin 1424");
  assert.equal(update["system.identifier"], MODULE_ID);
  assert.equal(update[`flags.${MODULE_ID}`].entryId, "assassin-1424");
  assert.equal(update[`flags.${MODULE_ID}`].schemaVersion, 2);
  assert.equal(update["flags.-=runyth-assassin"], null);
  assert.equal(update[`flags.${CORE_ID}.source`].providerId, MODULE_ID);
  assert.equal(update[`flags.-=${LEGACY_CORE_ID}`], null);
  assert.equal(update.origin, `Compendium.${MODULE_ID}.features.Item.a554000000000013`);
  assert.equal(update.changes[0].key, `flags.${MODULE_ID}.dynamicClimb`);
});


test("current Assassin 1424 identity requires no migration update", () => {
  const current = {
    name: "Assassin 1424",
    system: { identifier: MODULE_ID },
    origin: `Compendium.${MODULE_ID}.features.Item.a554000000000013`,
    changes: [{ key: `flags.${MODULE_ID}.dynamicClimb`, mode: 0, value: "walk" }],
    flags: {
      [MODULE_ID]: { schemaVersion: 2, managed: true, entryId: "assassin-1424", contentVersion: CONTENT_VERSION },
      [CORE_ID]: {
        source: {
          ...legacySource("assassin-1424"),
          providerId: MODULE_ID,
          packId: `${MODULE_ID}.character-options`,
          sourceUuid: `Compendium.${MODULE_ID}.character-options.Item.a551a551a551a551`,
          contentVersion: CONTENT_VERSION,
        },
      },
    },
  };
  assert.equal(buildLegacyIdentityUpdate(current), null);
});

test("registered identity migration is backup-requiring and idempotent", async () => {
  const effect = document({
    id: "effect",
    flags: { "runyth-assassin": { managed: true }, [LEGACY_CORE_ID]: { source: legacySource("assassinate.initiative-advantage") } },
    origin: "Compendium.runyth-assassin.features.Item.a551000000000003",
    changes: [],
  });
  const item = document({
    id: "item",
    system: { identifier: "runyth-assassin" },
    flags: { "runyth-assassin": { managed: true, entryId: "the-assassin" }, [LEGACY_CORE_ID]: { source: legacySource() } },
    effects: [effect],
  });
  const actor = document({ id: "actor", uuid: "Actor.actor", flags: { "runyth-assassin": { seizeTheMoment: { active: true } } }, items: [item], effects: [] });
  const worldItem = document({ id: "world-item", flags: { "runyth-assassin": { managed: true, entryId: "assassinate" }, [LEGACY_CORE_ID]: { source: legacySource("assassinate") } }, effects: [] });
  const game = { actors: [actor], scenes: [], items: [worldItem] };
  const report = await runLegacyIdentityMigration({ game, logger: { info() {} } });
  assert.deepEqual(report, { updated: 4, actors: 1, items: 2, effects: 1, worldItems: 1 });
  assert.equal(actor.updates.length, 1);
  assert.equal(item.updates.length, 1);
  assert.equal(effect.updates.length, 1);
  assert.equal(worldItem.updates.length, 1);

  const migration = legacyIdentityMigration();
  assert.equal(migration.id, "rename-assassin-1424-identity");
  assert.equal(migration.scope, "documents");
  assert.equal(migration.requiresBackup, true);
  assert.equal(migration.version, "1.0.3");
});


test("foundation namespace migration moves legacy Core source flags", async () => {
  const item = document({
    id: "core-source-item",
    flags: {
      [MODULE_ID]: { schemaVersion: 2, managed: true, entryId: "assassinate", contentVersion: CONTENT_VERSION },
      [LEGACY_CORE_ID]: {
        source: {
          ...legacySource("assassinate"),
          providerId: MODULE_ID,
          packId: `${MODULE_ID}.features`,
          sourceUuid: `Compendium.${MODULE_ID}.features.Item.a551000000000003`,
        },
      },
    },
    effects: [],
  });
  const report = await runCoreIdentityMigration({
    game: { actors: [], scenes: [], items: [item] },
    logger: { info() {} },
  });
  assert.equal(report.updated, 1);
  assert.equal(item.updates[0][`flags.${CORE_ID}.source`].contentVersion, CONTENT_VERSION);
  assert.equal(item.updates[0][`flags.-=${LEGACY_CORE_ID}`], null);
  const migration = coreIdentityMigration();
  assert.equal(migration.id, "move-source-metadata-to-runyth-order");
  assert.equal(migration.version, "1.0.5");
  assert.equal(migration.requiresBackup, true);
});
