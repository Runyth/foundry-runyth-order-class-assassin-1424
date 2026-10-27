// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  CONTENT_VERSION,
  CORE_ID,
  LEGACY_CORE_ID,
  LEGACY_IDENTITY,
  MODULE_ID,
} from "../constants.mjs";
import { getProperty } from "../util/objects.mjs";

export function sourceOf(document, core = globalThis.game?.modules?.get(CORE_ID)?.api) {
  const source = core?.readSource?.(document);
  if (source) return source;
  return getProperty(document, `flags.${CORE_ID}.source`)
    ?? getProperty(document, `flags.${LEGACY_CORE_ID}.source`)
    ?? null;
}

export function currentProviderFlagsOf(document) {
  return getProperty(document, `flags.${MODULE_ID}`) ?? null;
}

export function legacyProviderFlagsOf(document) {
  return getProperty(document, `flags.${LEGACY_IDENTITY.moduleId}`) ?? null;
}

export function providerFlagsOf(document) {
  return currentProviderFlagsOf(document) ?? legacyProviderFlagsOf(document);
}

export function sourceBelongsToProvider(source) {
  return source?.providerId === MODULE_ID || source?.providerId === LEGACY_IDENTITY.providerId;
}

export function sourceUsesLegacyIdentity(source) {
  return source?.providerId === LEGACY_IDENTITY.providerId
    || String(source?.packId ?? "").startsWith(`${LEGACY_IDENTITY.providerId}.`)
    || String(source?.sourceUuid ?? "").includes(`Compendium.${LEGACY_IDENTITY.moduleId}.`);
}

export function normalizedSourceFor(core, { packId, entryId, sourceUuid = null, checksum = null }) {
  const namespacedPackId = String(packId).startsWith(`${MODULE_ID}.`) ? String(packId) : `${MODULE_ID}.${packId}`;
  return core.normalizeSource({
    providerId: MODULE_ID,
    packId: namespacedPackId,
    entryId,
    sourceUuid,
    contentVersion: CONTENT_VERSION,
    checksum,
  });
}

export async function tagManagedDocument(core, document, source) {
  if (!core?.tagDocument) throw new Error("Runyth Order tagDocument API is unavailable.");
  return core.tagDocument(document, source, { update: true });
}

export function hasValidSource(document) {
  const source = sourceOf(document);
  return Boolean(source
    && source.schemaVersion === 1
    && source.providerId === MODULE_ID
    && String(source.packId).startsWith(`${MODULE_ID}.`)
    && source.entryId
    && source.contentVersion === CONTENT_VERSION);
}

export function hasLegacySource(document) {
  return sourceUsesLegacyIdentity(sourceOf(document));
}
