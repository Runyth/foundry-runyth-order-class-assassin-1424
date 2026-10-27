// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { walk } from "./lib/files.mjs";

const root = resolve(import.meta.dirname, "..");
const failures = [];
for (const file of await walk(root)) {
  if (![".mjs", ".js"].includes(extname(file.path))) continue;
  if (file.path.startsWith("dist/") || file.path.startsWith(".build/")) continue;
  const text = await readFile(file.absolute, "utf8");
  if (/\t/u.test(text)) failures.push(`${file.path}: tab indentation is not allowed.`);
  if (/ +$/gmu.test(text)) failures.push(`${file.path}: trailing whitespace.`);
  if (/console\.log\(/u.test(text) && file.path.startsWith("src/")) failures.push(`${file.path}: runtime console.log is not allowed.`);
  if (/\bvar\s+/u.test(text)) failures.push(`${file.path}: use const or let instead of var.`);
}
if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else console.log("Lint passed.");
