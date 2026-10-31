// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createZip, listZip } from "./lib/zip.mjs";
import { validateRuntimeArchiveEntries, validateRuntimeTree } from "./lib/runtime-assets.mjs";
import { createDocumentationBundle } from "./documentation-bundle.mjs";
import { isExcludedSourcePath, readJson, walk } from "./lib/files.mjs";
import { materializePublicationSource } from "./lib/publication-source.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const manifest = await readJson(resolve(root, "module.json"));
const catalog = await readJson(resolve(root, "packs/catalog.json"));
const moduleId = manifest.id;
const version = manifest.version;
const installName = `${moduleId}-v${version}-mod.zip`;
const sourceName = `${moduleId}-v${version}-src.zip`;
const documentationName = `${moduleId}-v${version}-doc.zip`;
const checksumName = `${moduleId}-v${version}-SHA256SUMS.txt`;
const buildResult = spawnSync(process.execPath, [resolve(root, "tools/build.mjs")], { cwd: root, encoding: "utf8" });
if (buildResult.status !== 0) {
  process.stderr.write(buildResult.stdout ?? "");
  process.stderr.write(buildResult.stderr ?? "");
  process.exit(buildResult.status ?? 1);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const runtimeRoot = resolve(root, ".build/runtime", moduleId);
const runtimeFiles = await walk(runtimeRoot);
const runtimeManifest = await readJson(resolve(runtimeRoot, "module.json"));
if (JSON.stringify(runtimeManifest) !== JSON.stringify(manifest)) {
  throw new Error("Built runtime module.json differs from the authoritative source manifest.");
}
const runtimeAssetValidation = await validateRuntimeTree({ runtimeRoot, manifest: runtimeManifest, projectRoot: root });
const buildManifest = await readJson(resolve(root, ".build/build-manifest.json"));
const publication = await materializePublicationSource(root);
const sourceFiles = (await walk(publication.root)).filter((file) => {
  if (file.path.startsWith(".git/")) return publication.includeGit;
  return !isExcludedSourcePath(file.path) && !file.path.startsWith(".build/") && !file.path.startsWith("dist/");
});
const sourceRoot = `${moduleId}-v${version}-src`;
await createZip(resolve(dist, installName), runtimeFiles.map((file) => ({ path: file.absolute, name: `${moduleId}/${file.path}` })));
validateRuntimeArchiveEntries({
  entries: await listZip(resolve(dist, installName)),
  moduleId,
  requiredAssets: runtimeAssetValidation.assets,
});
await createZip(resolve(dist, sourceName), sourceFiles.map((file) => ({ path: file.absolute, name: `${sourceRoot}/${file.path}` })));
await cp(resolve(root, "module.json"), resolve(dist, "module.json"));
const versionedManifestName = `${moduleId}-v${version}-module.json`;
const standaloneManifestName = `${moduleId}-v${version}-module-standalone.json`;
await cp(resolve(root, "module.json"), resolve(dist, versionedManifestName));
await cp(resolve(root, "module.json"), resolve(dist, standaloneManifestName));

const digest = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const report = {
  schemaVersion: 1,
  moduleId,
  title: manifest.title,
  naming: manifest.flags?.runyth ?? null,
  version,
  contentVersion: catalog.version,
  foundry: manifest.compatibility,
  dnd5e: manifest.relationships.systems[0].compatibility,
  rulesCoreModule: manifest.relationships.requires[0].compatibility,
  rulesCoreApi: "1.0.0",
  installArchive: installName,
  sourceArchive: sourceName,
  documentationArchive: documentationName,
  installRoot: moduleId,
  sourceRoot,
  installFiles: runtimeFiles.length,
  sourceFiles: sourceFiles.length,
  installBytes: (await readFile(resolve(dist, installName))).length,
  sourceBytes: (await readFile(resolve(dist, sourceName))).length,
  reproducibleTimestamp: "1980-01-01T00:00:00Z",
  runtimeEntry: buildManifest.runtimeBundle,
  validatedRuntimeAssets: runtimeAssetValidation.assets.length,
  bundledSourceModules: buildManifest.bundledSourceModules,
  runtimeStrategy: "Single generated browser ES module shipped at the exact manifest path src/main.mjs; all manifest-declared and discovered runtime assets are validated before and after ZIP creation",
  packFormat: "Deterministic NeDB source packs on v2 paths; Foundry V13 migrates them to LevelDB",
  liveFoundryValidationPerformed: false,
  publicationSource: publication.mode,
  publicationGit: publication.includeGit,
  publicationRevision: publication.report?.revisionSha ?? null,
};
await writeFile(resolve(dist, `${moduleId}-v${version}-build-report.json`), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(dist, checksumName), [
  `${await digest(resolve(dist, installName))}  ${installName}`,
  `${await digest(resolve(dist, sourceName))}  ${sourceName}`,
  `${await digest(resolve(dist, "module.json"))}  module.json`,
  `${await digest(resolve(dist, versionedManifestName))}  ${versionedManifestName}`,
  `${await digest(resolve(dist, standaloneManifestName))}  ${standaloneManifestName}`,
].join("\n") + "\n");
const documentation = await createDocumentationBundle({ root, dist });
console.log(buildResult.stdout.trim());
console.log(`Packaged ${installName}, ${sourceName}, and ${documentation.archiveName}.`);
