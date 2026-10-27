// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { API_VERSION, CONTENT_VERSION, CORE_API_VERSION, DND5E_VERSION, MODULE_ID, MODULE_TITLE, MODULE_VERSION, PUBLIC_REPOSITORY } from "../constants.mjs";
import { coreIdentityMigration, legacyIdentityMigration } from "./identity-migration.mjs";
import { actorValidator } from "./validator.mjs";

export function providerDescriptor(catalog, moduleVersion = MODULE_VERSION) {
  if (catalog?.version !== CONTENT_VERSION) throw new Error(`Catalog content version ${catalog?.version ?? "missing"} does not match runtime content version ${CONTENT_VERSION}.`);
  return {
    id: MODULE_ID,
    moduleId: MODULE_ID,
    title: MODULE_TITLE,
    description: "A D&D 5e complementary provider implementing the Assassin 1424 Rogue subclass and its automation.",
    version: moduleVersion,
    coreApi: { minimum: CORE_API_VERSION, verified: CORE_API_VERSION, maximum: CORE_API_VERSION },
    systems: [{ id: "dnd5e", minimum: DND5E_VERSION, verified: DND5E_VERSION, maximum: DND5E_VERSION }],
    dependencies: [],
    capabilities: [
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
      `${MODULE_ID}.disappearing-act`,
      `${MODULE_ID}.rooftop-pursuit`,
      `${MODULE_ID}.seize-the-moment`,
    ],
    packs: catalog.packs.map((pack) => ({
      id: pack.id,
      title: pack.title,
      description: pack.description,
      version: catalog.version,
      systemId: "dnd5e",
      contentKinds: pack.contentKinds,
      compendia: pack.compendia,
      entries: pack.entries,
    })),
    validators: [actorValidator()],
    migrations: [legacyIdentityMigration(), coreIdentityMigration()],
    documentationUrl: `https://github.com/Runyth/${PUBLIC_REPOSITORY}/blob/master/docs/API.md`,
    repositoryUrl: `https://github.com/Runyth/${PUBLIC_REPOSITORY}`,
    authors: ["Runyth"],
    metadata: {
      publicApiVersion: API_VERSION,
      namingSchemeVersion: "1.1",
      namingScheme: "Runyth Order: <Category> <Content Name>",
      orderName: "Runyth Order",
      moduleKind: "Class",
      category: "Class",
      contentName: "Assassin 1424",
      subclassDiscovery: "dnd5e-compendium-browser",
      assassinStrikeWorkflow: "native-critical-damage-dialog",
      canonicalTitle: MODULE_TITLE,
      legacyProviderId: "runyth-assassin",
    },
  };
}

export function registerProvider(core, catalog) {
  if (!core) throw new Error(`${MODULE_TITLE} requires Runyth Order.`);
  const version = game.modules.get(MODULE_ID)?.version ?? "0.0.0";
  return core.registerProvider(providerDescriptor(catalog, version));
}
