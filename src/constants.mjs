// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export const MODULE_ID = "runyth-order-class-assassin-1424";
export const PUBLIC_REPOSITORY = "foundry-runyth-order-class-assassin-1424";
export const MODULE_TITLE = "Runyth Order: Class Assassin 1424";
export const MODULE_SHORT_TITLE = "Assassin 1424";
export const MODULE_VERSION = "1.0.8";
export const CONTENT_VERSION = "1.0.5";
export const API_VERSION = "1.0.0";
export const CORE_ID = "runyth-order";
export const LEGACY_CORE_ID = "runyth-rules-core";
export const CORE_API_VERSION = "1.0.0";
export const DND5E_VERSION = "5.3.3";
export const FLAG_SCHEMA_VERSION = 2;
export const SOCKET = `module.${MODULE_ID}`;

export const LEGACY_IDENTITY = Object.freeze({
  moduleId: "runyth-assassin",
  providerId: "runyth-assassin",
  title: "Runyth: The Assassin",
  subclassIdentifier: "runyth-assassin",
  subclassEntryId: "the-assassin",
  flagSchemaVersion: 1,
});

export const IDENTIFIERS = Object.freeze({
  subclass: MODULE_ID,
  assassinate: "assassinate",
  assassinsTools: "assassins-tools",
  infiltrationExpertise: "infiltration-expertise",
  shadowInTheNight: "shadow-in-the-night",
  disappearingAct: "disappearing-act",
  seizeTheMoment: "seize-the-moment",
  steadyAim: "steady-aim",
  sneakAttack: "sneak-attack",
  disguiseKit: "disguise-kit",
  poisonersKit: "poisoners-kit",
});

export const LEGACY_IDENTIFIERS = Object.freeze({
  subclass: LEGACY_IDENTITY.subclassIdentifier,
});

export const ENTRY_IDS = Object.freeze({
  subclass: "assassin-1424",
  assassinate: "assassinate",
  assassinsTools: "assassins-tools",
  infiltrationExpertise: "infiltration-expertise",
  shadowInTheNight: "shadow-in-the-night",
  disappearingAct: "disappearing-act",
  seizeTheMoment: "seize-the-moment",
  disguiseKit: "disguise-kit",
  poisonersKit: "poisoners-kit",
});

export const TOOL_PROFICIENCIES = Object.freeze({
  disguiseKit: "disg",
  poisonersKit: "pois",
});

export const UUIDS = Object.freeze({
  subclass: `Compendium.${MODULE_ID}.character-options.Item.a551a551a551a551`,
  assassinate: `Compendium.${MODULE_ID}.features.Item.a551000000000003`,
  assassinsTools: `Compendium.${MODULE_ID}.features.Item.a552000000000003`,
  infiltrationExpertise: `Compendium.${MODULE_ID}.features.Item.a553000000000009`,
  shadowInTheNight: `Compendium.${MODULE_ID}.features.Item.a554000000000013`,
  seizeTheMoment: `Compendium.${MODULE_ID}.features.Item.a555000000000017`,
  disappearingAct: `Compendium.${MODULE_ID}.features.Item.a556000000000013`,
  disguiseKit: `Compendium.${MODULE_ID}.equipment.Item.a557000000000003`,
  poisonersKit: `Compendium.${MODULE_ID}.equipment.Item.a558000000000003`,
});

export const FEATURE_LEVELS = Object.freeze({
  [IDENTIFIERS.assassinate]: 3,
  [IDENTIFIERS.assassinsTools]: 3,
  [IDENTIFIERS.infiltrationExpertise]: 9,
  [IDENTIFIERS.shadowInTheNight]: 13,
  [IDENTIFIERS.disappearingAct]: 13,
  [IDENTIFIERS.seizeTheMoment]: 17,
});

export const FEATURE_UUIDS = Object.freeze({
  [IDENTIFIERS.assassinate]: UUIDS.assassinate,
  [IDENTIFIERS.assassinsTools]: UUIDS.assassinsTools,
  [IDENTIFIERS.infiltrationExpertise]: UUIDS.infiltrationExpertise,
  [IDENTIFIERS.shadowInTheNight]: UUIDS.shadowInTheNight,
  [IDENTIFIERS.disappearingAct]: UUIDS.disappearingAct,
  [IDENTIFIERS.seizeTheMoment]: UUIDS.seizeTheMoment,
});
