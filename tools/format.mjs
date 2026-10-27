// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { walk } from "./lib/files.mjs";

const root = resolve(import.meta.dirname, "..");
const write = process.argv.includes("--write");
const failures = [];
for (const file of await walk(root)) {
  if (
    file.path === "LICENSE" ||
    file.path.startsWith("keys/") ||
    file.path.startsWith("dist/") ||
    file.path.startsWith(".build/") ||
    file.path.startsWith(".staging/") ||
    file.path.startsWith(".git/") ||
    file.path.startsWith("node_modules/")
  ) continue;
  const original = await readFile(file.absolute, "utf8");
  const normalized = original.replaceAll("\r\n", "\n").replace(/[ \t]+$/gmu, "").replace(/\n*$/u, "\n");
  if (original !== normalized) {
    if (write) await writeFile(file.absolute, normalized);
    else failures.push(file.path);
  }
}
if (failures.length) {
  failures.forEach((path) => console.error(`- ${path}`));
  process.exitCode = 1;
} else console.log(write ? "Formatting applied." : "Format check passed.");
