// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE, UUIDS } from "../constants.mjs";
import { SETTINGS } from "../settings.mjs";

export const SUBCLASS_PACK = `${MODULE_ID}.character-options`;
export const SUBCLASS_DOCUMENT_ID = UUIDS.subclass.split(".").at(-1);
export const SUBCLASS_INDEX_FIELDS = Object.freeze([
  "system.classIdentifier",
  "system.identifier",
  "system.source",
  "system.container",
]);

function indexValues(index) {
  if (!index) return [];
  if (typeof index.values === "function") return [...index.values()];
  if (Array.isArray(index)) return index;
  return [...index];
}

export function isAssassin1424SubclassIndexEntry(entry) {
  return entry?._id === SUBCLASS_DOCUMENT_ID
    && entry?.type === "subclass"
    && entry?.system?.identifier === MODULE_ID
    && entry?.system?.classIdentifier === "rogue";
}

export function findAssassin1424SubclassIndexEntry(index) {
  const direct = index?.get?.(SUBCLASS_DOCUMENT_ID);
  if (isAssassin1424SubclassIndexEntry(direct)) return direct;
  return indexValues(index).find(isAssassin1424SubclassIndexEntry) ?? null;
}

function sourceConfiguration(settings) {
  try {
    return settings.get("dnd5e", "packSourceConfiguration") ?? {};
  } catch {
    return {};
  }
}

async function ensureSourceEnabled({ settings, user, enabled }) {
  const current = sourceConfiguration(settings);
  if (!enabled) {
    if (user?.isGM && current[SUBCLASS_PACK] !== false) {
      await settings.set("dnd5e", "packSourceConfiguration", {
        ...current,
        [SUBCLASS_PACK]: false,
      });
    }
    return false;
  }
  if (current[SUBCLASS_PACK] === true) return true;
  if (!user?.isGM) return current[SUBCLASS_PACK] !== false;
  await settings.set("dnd5e", "packSourceConfiguration", {
    ...current,
    [SUBCLASS_PACK]: true,
  });
  return true;
}

/**
 * Prepare the canonical subclass pack for D&D 5e 5.3.3's normal Subclass Advancement picker.
 * This uses public pack indexing and the public D&D 5e pack-source setting only.
 */
export async function prepareSubclassDiscovery({
  packs = globalThis.game?.packs,
  settings = globalThis.game?.settings,
  user = globalThis.game?.user,
} = {}) {
  if (!packs?.get || !settings?.get) throw new Error(`${MODULE_TITLE} cannot access Foundry compendia or settings.`);
  const pack = packs.get(SUBCLASS_PACK);
  if (!pack) throw new Error(`${MODULE_TITLE} could not find compendium ${SUBCLASS_PACK}.`);

  const expose = settings.get(MODULE_ID, SETTINGS.exposeSubclassInPicker) !== false;
  const sourceEnabled = await ensureSourceEnabled({ settings, user, enabled: expose });
  const index = await pack.getIndex({ fields: [...SUBCLASS_INDEX_FIELDS] });
  const entry = findAssassin1424SubclassIndexEntry(index);
  if (!entry) {
    throw new Error(`${MODULE_TITLE} could not index Assassin 1424 as a Rogue subclass in ${SUBCLASS_PACK}.`);
  }

  const visible = pack.visible !== false;
  return Object.freeze({
    available: visible && sourceEnabled,
    collection: SUBCLASS_PACK,
    documentId: SUBCLASS_DOCUMENT_ID,
    uuid: UUIDS.subclass,
    visible,
    sourceEnabled,
    entry,
  });
}
