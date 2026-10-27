// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalContentHash, embeddedEffectHash } from "./lib/content-hash.mjs";
import { walk } from "./lib/files.mjs";

const root = resolve(import.meta.dirname, "..");
const write = process.argv.includes("--write");
const failures = [];
const files = (await walk(resolve(root, "packs/_source"))).filter((entry) => entry.path.endsWith(".json"));

for (const file of files) {
  const document = JSON.parse(await readFile(file.absolute, "utf8"));
  for (const effect of document.effects ?? []) {
    const source = effect.flags?.["runyth-order"]?.source;
    if (source) source.checksum = embeddedEffectHash(effect);
  }
  const expected = canonicalContentHash(document);
  const provider = document.flags?.["runyth-order-class-assassin-1424"];
  const source = document.flags?.["runyth-order"]?.source;
  const matches = provider?.contentHash === expected && source?.checksum === expected;
  if (!matches && !write) failures.push(`${file.path}: expected ${expected}`);
  if (write) {
    provider.contentHash = expected;
    source.checksum = expected;
    await writeFile(file.absolute, `${JSON.stringify(document, null, 2)}\n`);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`ERROR: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`${write ? "Updated" : "Verified"} ${files.length} canonical content hashes.`);
}
