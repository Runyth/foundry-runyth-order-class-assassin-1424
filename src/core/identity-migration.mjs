// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  CONTENT_VERSION,
  CORE_ID,
  ENTRY_IDS,
  FLAG_SCHEMA_VERSION,
  IDENTIFIERS,
  LEGACY_CORE_ID,
  LEGACY_IDENTITY,
  MODULE_ID,
  MODULE_TITLE,
} from "../constants.mjs";
import { asArray, deepClone, getProperty } from "../util/objects.mjs";

const CORE_SOURCE_PATH = `flags.${CORE_ID}.source`;
const LEGACY_CORE_SOURCE_PATH = `flags.${LEGACY_CORE_ID}.source`;

export function rewriteLegacyUuid(value) {
  return typeof value === "string"
    ? value.replaceAll(`Compendium.${LEGACY_IDENTITY.moduleId}.`, `Compendium.${MODULE_ID}.`)
    : value;
}

export function rewriteLegacySource(source) {
  if (!source || typeof source !== "object") return source;
  const rewritten = deepClone(source);
  if (rewritten.providerId === LEGACY_IDENTITY.providerId) rewritten.providerId = MODULE_ID;
  if (typeof rewritten.packId === "string" && rewritten.packId.startsWith(`${LEGACY_IDENTITY.providerId}.`)) {
    rewritten.packId = `${MODULE_ID}.${rewritten.packId.slice(LEGACY_IDENTITY.providerId.length + 1)}`;
  }
  if (rewritten.entryId === LEGACY_IDENTITY.subclassEntryId) rewritten.entryId = ENTRY_IDS.subclass;
  rewritten.sourceUuid = rewriteLegacyUuid(rewritten.sourceUuid);
  if (rewritten.providerId === MODULE_ID) rewritten.contentVersion = CONTENT_VERSION;
  return rewritten;
}

export function buildLegacyIdentityUpdate(document) {
  if (!document) return null;
  const update = {};
  const currentFlags = getProperty(document, `flags.${MODULE_ID}`);
  const legacyFlags = getProperty(document, `flags.${LEGACY_IDENTITY.moduleId}`);
  if (legacyFlags) {
    const migratedFlags = {
      ...deepClone(legacyFlags),
      ...deepClone(currentFlags ?? {}),
      schemaVersion: FLAG_SCHEMA_VERSION,
    };
    if (migratedFlags.entryId === LEGACY_IDENTITY.subclassEntryId) migratedFlags.entryId = ENTRY_IDS.subclass;
    if (migratedFlags.contentVersion) migratedFlags.contentVersion = CONTENT_VERSION;
    update[`flags.${MODULE_ID}`] = migratedFlags;
    update[`flags.-=${LEGACY_IDENTITY.moduleId}`] = null;
  }

  const currentSource = getProperty(document, CORE_SOURCE_PATH);
  const legacyCoreSource = getProperty(document, LEGACY_CORE_SOURCE_PATH);
  const source = currentSource ?? legacyCoreSource;
  const rewrittenSource = rewriteLegacySource(source);
  if (rewrittenSource && JSON.stringify(currentSource) !== JSON.stringify(rewrittenSource)) {
    update[CORE_SOURCE_PATH] = rewrittenSource;
  }
  if (legacyCoreSource) update[`flags.-=${LEGACY_CORE_ID}`] = null;

  if (document?.system?.identifier === LEGACY_IDENTITY.subclassIdentifier) {
    update["system.identifier"] = IDENTIFIERS.subclass;
  }
  if (document?.name === "The Assassin") update.name = "Assassin 1424";
  if (typeof document?.origin === "string") {
    const origin = rewriteLegacyUuid(document.origin);
    if (origin !== document.origin) update.origin = origin;
  }

  const changes = asArray(document?.changes);
  if (changes.some((change) => typeof change?.key === "string" && change.key.includes(`flags.${LEGACY_IDENTITY.moduleId}.`))) {
    update.changes = changes.map((change) => ({
      ...deepClone(change),
      key: typeof change?.key === "string"
        ? change.key.replaceAll(`flags.${LEGACY_IDENTITY.moduleId}.`, `flags.${MODULE_ID}.`)
        : change?.key,
    }));
  }

  return Object.keys(update).length ? update : null;
}

async function updateDocument(document, update, options) {
  if (!update) return false;
  if (typeof document?.update !== "function") {
    throw new Error(`Cannot migrate document ${document?.uuid ?? document?.id ?? "unknown"}: update() is unavailable.`);
  }
  await document.update(update, options);
  return true;
}

async function migrateEffects(owner, counters, options) {
  for (const effect of asArray(owner?.effects)) {
    if (await updateDocument(effect, buildLegacyIdentityUpdate(effect), options)) counters.effects += 1;
  }
}

async function migrateItem(item, counters, options) {
  if (await updateDocument(item, buildLegacyIdentityUpdate(item), options)) counters.items += 1;
  await migrateEffects(item, counters, options);
}

async function migrateActor(actor, counters, options) {
  if (!actor) return;
  if (await updateDocument(actor, buildLegacyIdentityUpdate(actor), options)) counters.actors += 1;
  for (const item of asArray(actor.items)) await migrateItem(item, counters, options);
  await migrateEffects(actor, counters, options);
}

function uniqueActors(game) {
  const actors = new Map();
  for (const actor of asArray(game?.actors)) {
    const key = actor?.uuid ?? actor?.id;
    if (key) actors.set(key, actor);
  }
  for (const scene of asArray(game?.scenes)) {
    for (const token of asArray(scene?.tokens)) {
      if (token?.actorLink) continue;
      const actor = token?.actor;
      const key = actor?.uuid ?? `${scene?.uuid ?? scene?.id}.${token?.id ?? "token"}`;
      if (actor && key) actors.set(key, actor);
    }
  }
  return [...actors.values()];
}

async function runDocumentMigration({ game, logger }, label, optionKey) {
  const counters = { actors: 0, items: 0, effects: 0, worldItems: 0 };
  const options = { render: false, [optionKey]: true };
  for (const actor of uniqueActors(game)) await migrateActor(actor, counters, options);
  for (const item of asArray(game?.items)) {
    const before = counters.items;
    await migrateItem(item, counters, options);
    if (counters.items > before) counters.worldItems += 1;
  }
  logger?.info?.(`${MODULE_TITLE} ${label} completed.`, counters);
  return { updated: counters.actors + counters.items + counters.effects, ...counters };
}

export function runLegacyIdentityMigration(context) {
  return runDocumentMigration(context, "identity migration", "runythOrderIdentityMigration");
}

export function runCoreIdentityMigration(context) {
  return runDocumentMigration(context, "foundation namespace migration", "runythOrderCoreNamespaceMigration");
}

export function legacyIdentityMigration() {
  return {
    id: "rename-assassin-1424-identity",
    title: "Rename provider identity to Assassin 1424",
    description: `Migrates provider-managed world data from ${LEGACY_IDENTITY.title} (${LEGACY_IDENTITY.moduleId}) to ${MODULE_TITLE} (${MODULE_ID}).`,
    version: "1.0.3",
    scope: "documents",
    requiresBackup: true,
    run: runLegacyIdentityMigration,
  };
}

export function coreIdentityMigration() {
  return {
    id: "move-source-metadata-to-runyth-order",
    title: "Move source metadata to Runyth Order",
    description: `Moves provider-managed source metadata from flags.${LEGACY_CORE_ID}.source to flags.${CORE_ID}.source without changing player-owned content.`,
    version: "1.0.5",
    scope: "documents",
    requiresBackup: true,
    run: runCoreIdentityMigration,
  };
}
