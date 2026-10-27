// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderRuntimeCatalog } from "./lib/runtime-catalog.mjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "packs/catalog.json");
const targetPath = resolve(root, "src/content/catalog-data.mjs");
const write = process.argv.includes("--write");
const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
const generated = renderRuntimeCatalog(catalog);

if (write) {
  await writeFile(targetPath, generated);
  console.log("Runtime catalog generated.");
} else {
  const current = await readFile(targetPath, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("src/content/catalog-data.mjs is not synchronized with packs/catalog.json.");
    process.exitCode = 1;
  } else console.log("Runtime catalog is synchronized.");
}
