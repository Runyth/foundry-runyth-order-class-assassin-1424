// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { canonicalContentHash, embeddedEffectHash } from "./lib/content-hash.mjs";
import { renderRuntimeCatalog } from "./lib/runtime-catalog.mjs";
import { collectManifestRuntimeAssets } from "./lib/runtime-assets.mjs";
import { readJson, walk } from "./lib/files.mjs";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const notices = [];
const manifest = await readJson(resolve(root, "module.json"));
const packageJson = await readJson(resolve(root, "package.json"));
const packageLock = await readJson(resolve(root, "package-lock.json"));
const catalog = await readJson(resolve(root, "packs/catalog.json"));
const runtimeCatalogPath = resolve(root, "src/content/catalog-data.mjs");
const runtimeCatalog = await readFile(runtimeCatalogPath, "utf8").catch(() => "");
if (runtimeCatalog !== renderRuntimeCatalog(catalog)) failures.push("Runtime catalog module is not synchronized with packs/catalog.json.");
const allFiles = await walk(root);
const files = new Set(allFiles.map((file) => file.path));

if (manifest.id !== "runyth-order-class-assassin-1424") failures.push("Module ID must be runyth-order-class-assassin-1424.");
if (manifest.title !== "Runyth Order: Class Assassin 1424") failures.push("Display title changed.");
if (manifest.flags?.runyth?.orderName !== "Runyth Order" || manifest.flags?.runyth?.moduleKind !== "Class" || manifest.flags?.runyth?.contentName !== "Assassin 1424" || manifest.flags?.runyth?.canonicalTitle !== manifest.title) failures.push("Runyth Order naming metadata is invalid.");
if (manifest.version !== packageJson.version) failures.push("Manifest and package versions differ.");
if (packageLock.version !== packageJson.version || packageLock.packages?.[""]?.version !== packageJson.version) failures.push("Package-lock version differs from package version.");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(manifest.version)) failures.push(`Invalid semantic module version ${manifest.version}.`);
if (catalog.providerId !== manifest.id) failures.push("Catalog provider ID differs from module ID.");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(catalog.version)) failures.push(`Invalid semantic content version ${catalog.version}.`);
if (manifest.compatibility.minimum !== "13.351" || manifest.compatibility.verified !== "13.351" || manifest.compatibility.maximum !== "13.351") failures.push("Foundry compatibility must be exactly 13.351.");
const system = manifest.relationships?.systems?.find((entry) => entry.id === "dnd5e");
if (!system || Object.values(system.compatibility).some((value) => value !== "5.3.3")) failures.push("D&D 5e compatibility must be exactly 5.3.3.");
const core = manifest.relationships?.requires?.find((entry) => entry.id === "runyth-order");
if (!core || core.compatibility?.minimum !== "1.0.3" || core.compatibility?.verified !== "1.0.4" || "maximum" in (core.compatibility ?? {})) failures.push("Runyth Order dependency must require 1.0.3 or newer and verify 1.0.4 without blocking compatible patch releases.");
if (manifest.relationships.requires.some((entry) => ["midi-qol", "dae", "lib-wrapper"].includes(entry.id))) failures.push("Optional automation modules must not be required.");

if (JSON.stringify(manifest.esmodules) !== JSON.stringify(["src/main.mjs"])) {
  failures.push("Foundry runtime must expose only the generated src/main.mjs browser entry.");
}
if (!files.has("tools/lib/browser-bundle.mjs") || !files.has("test/runtime-bundle.test.mjs")) {
  failures.push("Deterministic single-file browser bundling tooling or regression tests are missing.");
}
if (!files.has("tools/lib/runtime-assets.mjs") || !files.has("runtime-assets.json") || !files.has("test/runtime-assets.test.mjs")) {
  failures.push("Runtime asset integrity tooling, declaration, or regression tests are missing.");
}
const generatedPackPaths = new Set((manifest.packs ?? []).map((pack) => pack.path));
for (const asset of collectManifestRuntimeAssets(manifest)) {
  if (generatedPackPaths.has(asset)) continue;
  if (!files.has(asset)) failures.push(`Manifest-declared source/runtime path is missing: ${asset}`);
}
for (const path of [...manifest.styles, ...manifest.languages.map((entry) => entry.path)]) {
  if (!files.has(path)) failures.push(`Manifest path is missing: ${path}`);
}
for (const pack of manifest.packs) {
  if (!catalog.packs.some((entry) => entry.id === pack.name)) failures.push(`Manifest pack ${pack.name} is absent from the catalog.`);
  if (pack.path !== `packs/${pack.name}-v2.db`) failures.push(`Manifest pack ${pack.name} must use its v2 NeDB path.`);
}
const characterOptionsPack = manifest.packs.find((pack) => pack.name === "character-options");
if (!characterOptionsPack) failures.push("Character Options pack is missing from the manifest.");
else {
  if (JSON.stringify(characterOptionsPack.flags?.dnd5e?.types) !== JSON.stringify(["subclass"])) {
    failures.push("Character Options pack must declare D&D 5e subclass content.");
  }
  if (characterOptionsPack.ownership?.PLAYER !== "OBSERVER" || characterOptionsPack.ownership?.ASSISTANT !== "OWNER") {
    failures.push("Character Options pack must remain visible to players and owned by assistant GMs.");
  }
}

const en = await readJson(resolve(root, "lang/en.json"));
const de = await readJson(resolve(root, "lang/de.json"));
const localeKeys = new Set([...Object.keys(en), ...Object.keys(de)]);
for (const key of localeKeys) if (!(key in en) || !(key in de)) failures.push(`Localization parity failure: ${key}`);

const ids = new Set();
const uuids = new Set();
let sourceDocuments = 0;
for (const pack of catalog.packs) {
  for (const entry of pack.entries) {
    if (ids.has(entry.id)) failures.push(`Duplicate provider entry ID: ${entry.id}`);
    ids.add(entry.id);
    if (uuids.has(entry.uuid)) failures.push(`Duplicate compendium UUID: ${entry.uuid}`);
    uuids.add(entry.uuid);
    if (!entry.uuid.startsWith(`Compendium.runyth-order-class-assassin-1424.${pack.id}.Item.`)) failures.push(`Invalid UUID for ${entry.id}: ${entry.uuid}`);
    if (entry.identifier === "assassin") failures.push("Official Assassin identifier collision detected.");
  }
  const sourceDir = resolve(root, "packs/_source", pack.id);
  const documents = (await walk(sourceDir)).filter((file) => file.path.endsWith(".json"));
  if (documents.length !== pack.entries.length) failures.push(`Pack ${pack.id} source count differs from catalog.`);
  for (const file of documents) {
    sourceDocuments += 1;
    const document = await readJson(file.absolute);
    if (!/^[A-Za-z0-9]{16}$/u.test(document._id)) failures.push(`${file.path}: invalid Foundry ID ${document._id}`);
    if (document._key !== `!items!${document._id}`) failures.push(`${file.path}: invalid _key.`);
    const source = document.flags?.["runyth-order"]?.source;
    if (!source || source.schemaVersion !== 1 || source.providerId !== "runyth-order-class-assassin-1424" || source.packId !== `runyth-order-class-assassin-1424.${pack.id}` || source.contentVersion !== catalog.version) failures.push(`${file.path}: invalid normalized source metadata.`);
    if (!/^[a-f0-9]{64}$/u.test(source?.checksum ?? "")) failures.push(`${file.path}: invalid checksum.`);
    const expectedContentHash = canonicalContentHash(document);
    if (document.flags?.["runyth-order-class-assassin-1424"]?.contentHash !== expectedContentHash || source?.checksum !== expectedContentHash) {
      failures.push(`${file.path}: canonical content hash drift.`);
    }
    for (const effect of document.effects ?? []) {
      if (effect._key !== `!items.effects!${document._id}.${effect._id}`) {
        failures.push(`${file.path}: embedded effect ${effect._id} has an invalid embedded-document source key.`);
      }
      if (!effect.flags?.["runyth-order-class-assassin-1424"]?.managed) continue;
      const effectSource = effect.flags?.["runyth-order"]?.source;
      if (!effectSource || effectSource.providerId !== "runyth-order-class-assassin-1424" || effectSource.packId !== `runyth-order-class-assassin-1424.${pack.id}` || !effectSource.entryId) {
        failures.push(`${file.path}: managed embedded effect ${effect._id} lacks normalized source metadata.`);
      } else if (effectSource.checksum !== embeddedEffectHash(effect)) {
        failures.push(`${file.path}: managed embedded effect ${effect._id} checksum drift.`);
      }
    }
    const provider = document.flags?.["runyth-order-class-assassin-1424"];
    if (!provider?.managed || provider.schemaVersion !== 2 || provider.contentVersion !== catalog.version) failures.push(`${file.path}: invalid provider flags.`);
  }
}
if (sourceDocuments !== 9) failures.push(`Expected 9 canonical Items, found ${sourceDocuments}.`);

const subclass = await readJson(resolve(root, "packs/_source/character-options/assassin-1424.json"));
if (subclass.type !== "subclass") failures.push("Canonical Assassin 1424 Item must use type subclass.");
if (subclass.system.identifier !== "runyth-order-class-assassin-1424") failures.push("Subclass identifier must be runyth-order-class-assassin-1424.");
if (subclass.system.classIdentifier !== "rogue") failures.push("Assassin 1424 must declare system.classIdentifier rogue.");
if (subclass._stats?.coreVersion !== "13.351" || subclass._stats?.systemId !== "dnd5e" || subclass._stats?.systemVersion !== "5.3.3") {
  failures.push("Assassin 1424 deterministic D&D 5e _stats metadata is invalid.");
}
const levels = subclass.system.advancement.filter((entry) => entry.type === "ItemGrant").map((entry) => entry.level).sort((a, b) => a - b);
if (JSON.stringify(levels) !== JSON.stringify([3, 3, 9, 13, 17])) failures.push(`Unexpected Advancement levels: ${levels.join(", ")}`);
for (const advancement of subclass.system.advancement) {
  for (const item of advancement.configuration.items) if (!uuids.has(item.uuid)) failures.push(`Advancement references unknown UUID ${item.uuid}.`);
}


const assassinate = await readJson(resolve(root, "packs/_source/features/assassinate.json"));
const assassinateDescription = assassinate.system?.description?.value ?? "";
if (!assassinateDescription.includes("intentionally adds no separate Assassin Strike attack button")) {
  failures.push("Assassinate must document the native Critical Hit fallback and absence of a separate strike button.");
}
if (assassinate.flags?.["runyth-order-class-assassin-1424"]?.automation?.assassinStrike !== "native-critical-damage-dialog") {
  failures.push("Assassinate automation metadata must use native-critical-damage-dialog.");
}
for (const removedPath of ["src/automation/assassinate.mjs", "src/rules/assassin-strike-state.mjs"]) {
  if (files.has(removedPath)) failures.push(`Removed custom Assassin Strike runtime path is still present: ${removedPath}.`);
}
if (files.has("tools/lib/leveldb.mjs") || files.has("test/leveldb.test.mjs")) failures.push("The rejected provisional LevelDB writer is still present.");
if (!files.has("tools/lib/nedb-pack.mjs") || !files.has("test/nedb-pack.test.mjs")) failures.push("Deterministic NeDB pack tooling is missing.");

for (const requiredPath of [
  "src/integration/subclass-discovery.mjs",
  "tools/documentation-bundle.mjs",
  "docs/LIVE_TEST_FINDINGS.md",
  "docs/RELEASE_ARTIFACTS.md",
]) {
  if (!files.has(requiredPath)) failures.push(`Patch release support file is missing: ${requiredPath}.`);
}

const prohibited = [
  /ApplicationV1/u,
  /FormApplication/u,
  /libWrapper/u,
  /_source\s*\./u,
  /CONFIG\.DND5E\.classFeatures/u,
  /Hooks\._/u,
  /game\.dnd5e\._/u,
];
for (const file of allFiles.filter((entry) => entry.path.startsWith("src/") && extname(entry.path) === ".mjs")) {
  const text = await readFile(file.absolute, "utf8");
  for (const pattern of prohibited) if (pattern.test(text)) failures.push(`${file.path}: prohibited/private/deprecated API pattern ${pattern}.`);
  for (const match of text.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/gu)) {
    const target = resolve(dirname(file.absolute), match[1]);
    const relative = target.slice(root.length + 1).replaceAll("\\", "/");
    if (!files.has(relative)) failures.push(`${file.path}: unresolved import ${match[1]}.`);
  }
}

notices.push("Automated validation covers manifests, IDs, UUIDs, source flags, Advancement, localization, imports, and prohibited API scans.");
notices.push("Live Foundry VTT browser behavior remains subject to the documented manual checklist.");
const output = [...failures.map((failure) => `ERROR: ${failure}`), ...notices.map((notice) => `INFO: ${notice}`)];
if (process.env.RUNYTH_VALIDATION_LOG) await writeFile(process.env.RUNYTH_VALIDATION_LOG, output.join("\n") + "\n");
if (failures.length) {
  output.forEach((line) => console.error(line));
  process.exitCode = 1;
} else {
  output.forEach((line) => console.log(line));
  console.log(`Validation passed: ${files.size} files, ${sourceDocuments} canonical Items, ${localeKeys.size} localization keys.`);
}
