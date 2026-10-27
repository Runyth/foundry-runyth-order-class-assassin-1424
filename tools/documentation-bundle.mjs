// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createZip } from "./lib/zip.mjs";
import { readJson, walk } from "./lib/files.mjs";

function unique(entries) {
  const byName = new Map();
  for (const entry of entries) byName.set(entry.name, entry);
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function createDocumentationBundle({
  root = resolve(import.meta.dirname, ".."),
  dist = resolve(root, "dist"),
} = {}) {
  const manifest = await readJson(resolve(root, "module.json"));
  const prefix = `${manifest.id}-v${manifest.version}`;
  const archiveName = `${manifest.id}-documentation-v${manifest.version}.zip`;
  const archiveRoot = `${manifest.id}-documentation-v${manifest.version}`;
  const entries = [];

  for (const name of [
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "module.json",
    "runtime-assets.json",
  ]) {
    entries.push({ path: resolve(root, name), name: `${archiveRoot}/${name}` });
  }

  for (const directory of ["docs", "prompts", "types"]) {
    for (const file of await walk(resolve(root, directory))) {
      entries.push({ path: file.absolute, name: `${archiveRoot}/${directory}/${file.path}` });
    }
  }

  const releaseFiles = [
    "module.json",
    `${prefix}-module.json`,
    `${prefix}-module-standalone.json`,
    `${prefix}-build-report.json`,
    `${prefix}-release-verification.json`,
    `${prefix}-build-and-validation-report.md`,
    `${prefix}-validation.log`,
    `${prefix}-fresh-extraction-validation.log`,
    `${prefix}-SHA256SUMS.txt`,
  ];
  for (const name of releaseFiles) {
    try {
      await readFile(resolve(dist, name));
      entries.push({ path: resolve(dist, name), name: `${archiveRoot}/release/${name}` });
    } catch {
      // Some release evidence exists only after release:verify; the final bundle is regenerated then.
    }
  }

  await createZip(resolve(dist, archiveName), unique(entries));
  return Object.freeze({ archiveName, archiveRoot, entries: unique(entries).length });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = await createDocumentationBundle();
  console.log(`Packaged ${result.archiveName} with ${result.entries} documentation entries.`);
}
