// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { readJson, walk } from "./lib/files.mjs";
import {
  compileFoundryNedbDocuments,
  validateDeterministicNedbPack,
  writeDeterministicNedbPack,
} from "./lib/nedb-pack.mjs";
import { createBrowserBundle } from "./lib/browser-bundle.mjs";
import { validateRuntimeTree } from "./lib/runtime-assets.mjs";
import { renderRuntimeCatalog } from "./lib/runtime-catalog.mjs";

const root = resolve(import.meta.dirname, "..");
const buildRoot = resolve(root, ".build/runtime/runyth-order-class-assassin-1424");
const sourcePacks = resolve(root, "packs/_source");
const catalog = await readJson(resolve(root, "packs/catalog.json"));
const runtimeCatalog = await readFile(resolve(root, "src/content/catalog-data.mjs"), "utf8").catch(() => "");
if (runtimeCatalog !== renderRuntimeCatalog(catalog)) {
  throw new Error("Runtime catalog module is not synchronized with packs/catalog.json.");
}

await rm(resolve(root, ".build"), { recursive: true, force: true });
await mkdir(buildRoot, { recursive: true });

const runtimeRootFiles = ["module.json", "README.md", "CHANGELOG.md", "LICENSE", "SECURITY.md"];
for (const name of runtimeRootFiles) await cp(resolve(root, name), resolve(buildRoot, name));
for (const directory of ["styles", "templates", "lang"]) {
  await cp(resolve(root, directory), resolve(buildRoot, directory), { recursive: true });
}

// Foundry only needs one browser ES module. Keeping editable modules out of the install archive
// prevents secondary .mjs requests from being blocked by hosting/proxy layers while preserving
// the modular source tree in the source release.
await mkdir(resolve(buildRoot, "src"), { recursive: true });
const bundle = await createBrowserBundle({
  sourceRoot: root,
  entry: "src/main.mjs",
  destination: resolve(buildRoot, "src/main.mjs"),
});

await mkdir(resolve(buildRoot, "packs"), { recursive: true });
await cp(resolve(root, "packs/catalog.json"), resolve(buildRoot, "packs/catalog.json"));

const packDirectories = (await walk(sourcePacks, { includeDirectories: true }))
  .filter((entry) => entry.directory && !entry.path.includes("/"))
  .map((entry) => entry.path)
  .sort();
const packCounts = {};
const packBytes = {};
for (const packId of packDirectories) {
  const files = (await walk(resolve(sourcePacks, packId)))
    .filter((entry) => entry.path.endsWith(".json"))
    .sort((left, right) => left.path.localeCompare(right.path));
  const sources = [];
  for (const file of files) sources.push(await readJson(file.absolute));
  const documents = compileFoundryNedbDocuments(sources);
  const destination = resolve(buildRoot, "packs", `${packId}-v2.db`);
  await writeDeterministicNedbPack(destination, documents);
  const validation = await validateDeterministicNedbPack(destination, documents);
  packCounts[packId] = validation.documents;
  packBytes[packId] = validation.bytes;
}

const manifest = await readJson(resolve(root, "module.json"));
const runtimeAssetValidation = await validateRuntimeTree({ runtimeRoot: buildRoot, manifest, projectRoot: root });
await writeFile(resolve(root, ".build/runtime-assets.json"), `${JSON.stringify({ schemaVersion: 1, assets: runtimeAssetValidation.assets }, null, 2)}\n`);
const runtimeFiles = await walk(buildRoot);
const buildManifest = {
  schemaVersion: 1,
  moduleId: manifest.id,
  version: manifest.version,
  runtimeRoot: buildRoot,
  runtimeFiles: runtimeFiles.length,
  runtimeBundle: "src/main.mjs",
  validatedRuntimeAssets: runtimeAssetValidation.assets.length,
  bundledSourceModules: bundle.moduleCount,
  packCounts,
  packBytes,
  packFormat: "Deterministic NeDB source packs on v2 paths; Foundry V13 migrates them to LevelDB",
  generatedAt: "deterministic-build",
};
await writeFile(resolve(root, ".build/build-manifest.json"), `${JSON.stringify(buildManifest, null, 2)}\n`);
console.log(`Built runtime tree ${basename(buildRoot)} with ${runtimeFiles.length} files.`);
console.log(`Browser bundle: ${bundle.moduleCount} editable ES modules -> src/main.mjs.`);
console.log(`Validated ${runtimeAssetValidation.assets.length} manifest-declared and discovered runtime assets.`);
for (const packId of packDirectories) {
  console.log(`Pack ${packId}: ${packCounts[packId]} Items, ${packBytes[packId]} bytes.`);
}
