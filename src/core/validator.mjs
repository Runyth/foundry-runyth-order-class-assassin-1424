// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  CONTENT_VERSION,
  DND5E_VERSION,
  FEATURE_LEVELS,
  IDENTIFIERS,
  LEGACY_IDENTITY,
  MODULE_ID,
  TOOL_PROFICIENCIES,
} from "../constants.mjs";
import { findItems, hasAssassinSubclass, identifierOf, isProviderManaged, rogueLevel, usesLegacyProviderIdentity } from "../rules/identity.mjs";
import { isValidTurnState, sameTurn, turnIdentity } from "../rules/turn-state.mjs";
import { missingToolProficiencies } from "../rules/tools.mjs";
import { asArray, getProperty } from "../util/objects.mjs";
import { hasValidSource, providerFlagsOf } from "./source.mjs";

function localizedAuditText(code, field, data, fallback) {
  const key = `RUNYTH_ORDER_CLASS_ASSASSIN_1424.Audit.${code}.${field}`;
  const i18n = globalThis.game?.i18n;
  if (!i18n?.has?.(key)) return fallback;
  return i18n.format(key, data);
}

function issue(code, severity, message, data = {}, remediation = null, documentUuid = null) {
  return {
    id: `${MODULE_ID}.${code.toLowerCase()}`,
    code,
    severity,
    title: localizedAuditText(code, "Title", data, code),
    message: localizedAuditText(code, "Message", data, message),
    remediation: remediation ? localizedAuditText(code, "Remediation", data, remediation) : null,
    documentUuid,
    data,
  };
}

function hasInitiativeAdvantage(actor) {
  const assassinate = findItems(actor, IDENTIFIERS.assassinate)[0];
  if (!assassinate) return false;
  return asArray(assassinate.effects).some((effect) => asArray(effect.changes).some((change) => change.key === "system.attributes.init.roll.mode" && Number(change.mode) === 2 && String(change.value) === "1"));
}

function toolItems(actor, identifier) {
  return asArray(actor?.items).filter((item) => identifierOf(item) === identifier);
}

function toolItemPresent(actor, identifier) {
  return toolItems(actor, identifier).length > 0;
}

export function validateActorPure(actor, { systemVersion = globalThis.game?.system?.version ?? null, combat = globalThis.game?.combat ?? null } = {}) {
  const issues = [];
  if (systemVersion !== DND5E_VERSION) {
    issues.push(issue("UNSUPPORTED_DND5E_VERSION", "error", `Runyth Order: Class Assassin 1424 supports D&D 5e ${DND5E_VERSION} exactly.`, { actual: systemVersion, expected: DND5E_VERSION }));
  }
  if (!hasAssassinSubclass(actor)) return issues;

  const level = rogueLevel(actor);
  if (level < 3) issues.push(issue("SUBCLASS_BELOW_LEVEL_THREE", "warning", "Assassin 1424 subclass is present below Rogue level 3.", { level }));

  for (const [identifier, requiredLevel] of Object.entries(FEATURE_LEVELS)) {
    const items = findItems(actor, identifier);
    if (level >= requiredLevel && !items.length) {
      issues.push(issue("MISSING_LEVEL_FEATURE", "error", `${identifier} is missing at Rogue level ${level}.`, { identifier, requiredLevel, level }, "Run actor synchronization or revisit Advancement."));
    }
    if (level < requiredLevel && items.length) {
      issues.push(issue("FEATURE_GRANTED_EARLY", "warning", `${identifier} is present before Rogue level ${requiredLevel}.`, { identifier, requiredLevel, level }, "Review Advancement history; synchronization will not delete player content."));
    }
    const managed = items.filter(isProviderManaged);
    if (managed.length > 1) issues.push(issue("DUPLICATE_PROVIDER_MANAGED_FEATURE", "error", `${identifier} has duplicate provider-managed copies.`, { identifier, count: managed.length }));
  }

  for (const item of asArray(actor?.items).filter(isProviderManaged)) {
    const flags = providerFlagsOf(item);
    if (usesLegacyProviderIdentity(item)) {
      issues.push(issue("LEGACY_PROVIDER_IDENTITY", "warning", `${item.name} still uses the legacy ${LEGACY_IDENTITY.providerId} identity.`, { identifier: identifierOf(item), legacyProviderId: LEGACY_IDENTITY.providerId, providerId: MODULE_ID }, "Run the registered Rules Core migration after creating a world backup, or synchronize this Actor as GM.", item.uuid ?? null));
    } else if (!hasValidSource(item)) {
      issues.push(issue("MISSING_SOURCE_METADATA", "warning", `${item.name} is missing normalized Runyth Order source metadata.`, { identifier: identifierOf(item) }, "Run actor synchronization.", item.uuid ?? null));
    }
    if (flags?.contentVersion && flags.contentVersion !== CONTENT_VERSION) issues.push(issue("STALE_MANAGED_SOURCE", "warning", `${item.name} was created from content version ${flags.contentVersion}.`, { actual: flags.contentVersion, expected: CONTENT_VERSION }, "Review the dry-run synchronization report before applying repairs.", item.uuid ?? null));
  }

  if (level >= 3) {
    if (!toolItemPresent(actor, IDENTIFIERS.disguiseKit)) issues.push(issue("MISSING_DISGUISE_KIT", "error", "Assassin’s Tools requires a Disguise Kit.", {}, "Run actor synchronization."));
    if (!toolItemPresent(actor, IDENTIFIERS.poisonersKit)) issues.push(issue("MISSING_POISONERS_KIT", "error", "Assassin’s Tools requires a Poisoner’s Kit.", {}, "Run actor synchronization."));
    for (const identifier of [IDENTIFIERS.disguiseKit, IDENTIFIERS.poisonersKit]) {
      const managed = toolItems(actor, identifier).filter(isProviderManaged);
      if (managed.length > 1) {
        issues.push(issue("DUPLICATE_PROVIDER_MANAGED_EQUIPMENT", "error", `${identifier} has duplicate provider-managed copies.`, { identifier, count: managed.length }));
      }
    }
    const missing = missingToolProficiencies(getProperty(actor, "system.traits.toolProf.value"));
    if (missing.length) issues.push(issue("MISSING_TOOL_PROFICIENCY", "error", `Missing tool proficiency keys: ${missing.join(", ")}.`, { missing }, "Run actor synchronization."));
    if (!hasInitiativeAdvantage(actor)) issues.push(issue("MISSING_INITIATIVE_ADVANTAGE", "error", "Assassinate is missing its permanent Initiative Advantage effect.", {}, "Restore the canonical Assassinate Item or run synchronization."));
  }

  if (level >= 17 && !asArray(actor?.items).some((item) => identifierOf(item) === IDENTIFIERS.sneakAttack)) {
    issues.push(issue("SNEAK_ATTACK_INTEGRATION_MISSING", "warning", "No compatible Sneak Attack Item with identifier sneak-attack was found.", {}, "Restore the official Rogue Sneak Attack feature; the module will not rewrite it."));
  }

  const state = getProperty(actor, `flags.${MODULE_ID}.seizeTheMoment`)
    ?? getProperty(actor, `flags.${LEGACY_IDENTITY.moduleId}.seizeTheMoment`);
  if (state && !isValidTurnState(state)) {
    issues.push(issue("INVALID_PERSISTENT_TURN_STATE", "error", "Seize the Moment has invalid persistent turn identity data.", { state }, "Clear the stale provider flag through the module manager."));
  } else if (state) {
    const current = turnIdentity(combat);
    if (!sameTurn(state, current)) {
      issues.push(issue("STALE_PERSISTENT_TURN_STATE", "error", "Seize the Moment contains validly shaped but expired Combat-turn state.", { state, current }, "Clear the stale provider flag through the module manager."));
    }
  }
  return issues;
}

export function actorValidator() {
  return {
    id: "assassin-actor",
    title: "Runyth Order: Class Assassin 1424 Actor",
    description: "Checks progression, managed content, tool grants, automation prerequisites, and temporary turn state without mutating the Actor.",
    scope: "actor",
    timeoutMs: 5000,
    run: ({ actor }) => validateActorPure(actor),
  };
}
