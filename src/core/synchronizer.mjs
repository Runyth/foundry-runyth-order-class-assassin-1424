// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID,
  CONTENT_VERSION,
  ENTRY_IDS,
  FEATURE_LEVELS,
  FEATURE_UUIDS,
  IDENTIFIERS,
  LEGACY_IDENTITY,
  MODULE_ID,
  TOOL_PROFICIENCIES,
  UUIDS,
} from "../constants.mjs";
import { findItems, hasAssassinSubclass, identifierOf, isProviderManaged, rogueLevel, usesLegacyProviderIdentity } from "../rules/identity.mjs";
import { requiredToolProficiencies } from "../rules/tools.mjs";
import { asArray, deepClone, getProperty } from "../util/objects.mjs";
import { providerFlagsOf, hasValidSource, normalizedSourceFor, tagManagedDocument } from "./source.mjs";
import { buildLegacyIdentityUpdate } from "./identity-migration.mjs";

function actorUuid(actor) {
  return actor?.uuid ?? actor?.id ?? null;
}

function reportBase(actor, dryRun) {
  return {
    schemaVersion: 1,
    actorUuid: actorUuid(actor),
    dryRun,
    changed: false,
    actions: [],
    warnings: [],
    conflicts: [],
  };
}

async function canonicalData(uuid, resolver) {
  const document = await resolver(uuid);
  if (!document) throw new Error(`Canonical document not found: ${uuid}`);
  const data = document.toObject ? document.toObject() : deepClone(document);
  delete data._id;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  return data;
}

function equivalentItems(actor, identifier) {
  return asArray(actor?.items).filter((item) => identifierOf(item) === identifier);
}

async function addCanonicalItem({ actor, uuid, identifier, dryRun, resolver, report }) {
  const equivalents = equivalentItems(actor, identifier);
  if (equivalents.length) {
    const managed = equivalents.filter(isProviderManaged);
    if (managed.length > 1) report.warnings.push({ code: "DUPLICATE_MANAGED_ITEM", identifier, count: managed.length });
    if (!managed.length) report.actions.push({ type: "preserve-player-item", identifier, itemUuid: equivalents[0]?.uuid ?? null });
    return equivalents[0];
  }

  report.changed = true;
  report.actions.push({ type: "create-item", identifier, sourceUuid: uuid });
  if (dryRun) return null;
  const data = await canonicalData(uuid, resolver);
  const [created] = await actor.createEmbeddedDocuments("Item", [data], { render: false, runythOrderAssassin1424Sync: true });
  return created;
}

async function repairMetadata({ actor, core, dryRun, report }) {
  for (const item of asArray(actor?.items)) {
    const flags = providerFlagsOf(item);
    if (!flags?.managed && !isProviderManaged(item)) continue;
    if (hasValidSource(item) && !usesLegacyProviderIdentity(item) && flags?.contentVersion === CONTENT_VERSION) continue;
    const rawEntryId = flags.entryId ?? identifierOf(item);
    const entryId = [LEGACY_IDENTITY.subclassEntryId, IDENTIFIERS.subclass, ENTRY_IDS.subclass].includes(rawEntryId)
      ? ENTRY_IDS.subclass
      : rawEntryId;
    const canonicalUuid = (entryId === ENTRY_IDS.subclass ? UUIDS.subclass : null)
      ?? Object.entries(FEATURE_UUIDS).find(([identifier]) => identifier === entryId)?.[1]
      ?? (entryId === IDENTIFIERS.disguiseKit ? UUIDS.disguiseKit : null)
      ?? (entryId === IDENTIFIERS.poisonersKit ? UUIDS.poisonersKit : null);
    if (!canonicalUuid) {
      report.warnings.push({ code: "UNREPAIRABLE_SOURCE_METADATA", itemUuid: item.uuid ?? null, entryId });
      continue;
    }
    const parts = canonicalUuid.split(".");
    const packId = parts[2];
    const source = normalizedSourceFor(core, {
      packId,
      entryId,
      sourceUuid: canonicalUuid,
      checksum: flags.contentHash ?? null,
    });
    report.changed = true;
    report.actions.push({ type: "repair-source-metadata", itemUuid: item.uuid ?? null, entryId });
    if (!dryRun) {
      if (!globalThis.game?.user?.isGM) {
        report.warnings.push({ code: "GM_REQUIRED_FOR_SOURCE_REPAIR", itemUuid: item.uuid ?? null, entryId });
        continue;
      }
      const identityUpdate = buildLegacyIdentityUpdate(item) ?? {};
      identityUpdate[`flags.${MODULE_ID}.schemaVersion`] = 2;
      identityUpdate[`flags.${MODULE_ID}.managed`] = true;
      identityUpdate[`flags.${MODULE_ID}.entryId`] = entryId;
      identityUpdate[`flags.${MODULE_ID}.contentVersion`] = CONTENT_VERSION;
      if (flags?.contentHash) identityUpdate[`flags.${MODULE_ID}.contentHash`] = flags.contentHash;
      await item.update(identityUpdate, { render: false, runythOrderIdentityMigration: true });
      await tagManagedDocument(core, item, source);
    }
  }
}

export async function syncActor(actor, {
  dryRun = false,
  core = globalThis.game?.modules?.get("runyth-order")?.api,
  resolver = globalThis.fromUuid,
} = {}) {
  if (!actor) throw new TypeError("syncActor requires an Actor or synthetic Actor.");
  if (typeof resolver !== "function") throw new Error("A UUID resolver is required.");
  const report = reportBase(actor, dryRun);
  const actorIdentityUpdate = buildLegacyIdentityUpdate(actor);
  if (actorIdentityUpdate) {
    report.changed = true;
    report.actions.push({ type: "migrate-provider-identity", documentUuid: actor.uuid ?? actor.id ?? null });
    if (!dryRun) {
      if (!globalThis.game?.user?.isGM) report.warnings.push({ code: "GM_REQUIRED_FOR_IDENTITY_MIGRATION", documentUuid: actor.uuid ?? actor.id ?? null });
      else await actor.update(actorIdentityUpdate, { render: false, runythOrderIdentityMigration: true });
    }
  }
  if (!hasAssassinSubclass(actor)) {
    report.warnings.push({ code: "ASSASSIN_SUBCLASS_NOT_PRESENT" });
    return report;
  }

  const level = rogueLevel(actor);
  for (const [identifier, requiredLevel] of Object.entries(FEATURE_LEVELS)) {
    if (level < requiredLevel) continue;
    await addCanonicalItem({ actor, uuid: FEATURE_UUIDS[identifier], identifier, dryRun, resolver, report });
  }

  if (level >= 3) {
    await addCanonicalItem({ actor, uuid: UUIDS.disguiseKit, identifier: IDENTIFIERS.disguiseKit, dryRun, resolver, report });
    await addCanonicalItem({ actor, uuid: UUIDS.poisonersKit, identifier: IDENTIFIERS.poisonersKit, dryRun, resolver, report });

    const path = "system.traits.toolProf.value";
    const current = getProperty(actor, path);
    const required = requiredToolProficiencies(current);
    const existing = new Set(current instanceof Set ? [...current] : Array.isArray(current) ? current : []);
    const missing = [TOOL_PROFICIENCIES.disguiseKit, TOOL_PROFICIENCIES.poisonersKit].filter((key) => !existing.has(key));
    if (missing.length) {
      report.changed = true;
      report.actions.push({ type: "add-tool-proficiencies", keys: missing });
      if (!dryRun) await actor.update({ [path]: required }, { render: false, runythOrderAssassin1424Sync: true });
    }
  }

  if (core) await repairMetadata({ actor, core, dryRun, report });
  return report;
}

export function synchronizationPreview(actor) {
  const level = rogueLevel(actor);
  return {
    actorUuid: actorUuid(actor),
    assassin: hasAssassinSubclass(actor),
    rogueLevel: level,
    requiredFeatures: Object.entries(FEATURE_LEVELS)
      .filter(([, required]) => level >= required)
      .map(([identifier, required]) => ({ identifier, required, present: findItems(actor, identifier).length > 0 })),
    contentVersion: CONTENT_VERSION,
  };
}
