// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID, IDENTIFIERS, LEGACY_IDENTIFIERS, LEGACY_IDENTITY, MODULE_ID } from "../constants.mjs";
import { asArray, getProperty } from "../util/objects.mjs";
import { providerFlagsOf, sourceBelongsToProvider } from "../core/source.mjs";

export function identifierOf(document) {
  return document?.system?.identifier
    ?? providerFlagsOf(document)?.entryId
    ?? getProperty(document, `flags.${CORE_ID}.source.entryId`)
    ?? null;
}

export function identifiersEquivalent(actual, expected) {
  if (actual === expected) return true;
  return expected === IDENTIFIERS.subclass && actual === LEGACY_IDENTIFIERS.subclass;
}

export function hasIdentifier(document, identifier) {
  return identifiersEquivalent(identifierOf(document), identifier);
}

export function actorItems(actor) {
  return asArray(actor?.items);
}

export function findItems(actor, identifier) {
  return actorItems(actor).filter((item) => hasIdentifier(item, identifier));
}

export function findItem(actor, identifier) {
  return findItems(actor, identifier)[0] ?? null;
}

export function hasFeature(actor, identifier) {
  return Boolean(findItem(actor, identifier));
}

export function isProviderManaged(document) {
  const flags = providerFlagsOf(document);
  if (flags?.managed === true) return true;
  const source = getProperty(document, `flags.${CORE_ID}.source`);
  return sourceBelongsToProvider(source);
}

export function usesLegacyProviderIdentity(document) {
  const identifier = identifierOf(document);
  const source = getProperty(document, `flags.${CORE_ID}.source`);
  return Boolean(
    getProperty(document, `flags.${LEGACY_IDENTITY.moduleId}`)
    || source?.providerId === LEGACY_IDENTITY.providerId
    || String(source?.packId ?? "").startsWith(`${LEGACY_IDENTITY.providerId}.`)
    || identifier === LEGACY_IDENTIFIERS.subclass,
  );
}

export function hasAssassinSubclass(actor) {
  return actorItems(actor).some((item) => item?.type === "subclass" && hasIdentifier(item, IDENTIFIERS.subclass));
}

export function rogueLevel(actor) {
  const direct = Number(actor?.classes?.rogue?.system?.levels);
  if (Number.isFinite(direct)) return direct;
  const rogue = actorItems(actor).find((item) => item?.type === "class" && identifierOf(item) === "rogue");
  return Number(rogue?.system?.levels ?? 0) || 0;
}

export function activityIdentifier(activity) {
  return activity?.identifier
    ?? activity?.system?.identifier
    ?? activity?.item?.system?.identifier
    ?? activity?.item?.identifier
    ?? null;
}

export function isSteadyAim(activityOrItem) {
  return activityIdentifier(activityOrItem) === IDENTIFIERS.steadyAim
    || identifierOf(activityOrItem) === IDENTIFIERS.steadyAim;
}

export function isSneakAttack(activityOrItem) {
  return activityIdentifier(activityOrItem) === IDENTIFIERS.sneakAttack
    || identifierOf(activityOrItem) === IDENTIFIERS.sneakAttack;
}
