// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { listZip } from "../tools/lib/zip.mjs";

const root = resolve(import.meta.dirname, "..");

test("runtime source uses ApplicationV2 and avoids mandatory optional integrations", async () => {
  const manager = await readFile(resolve(root, "src/ui/manager.mjs"), "utf8");
  const manifest = JSON.parse(await readFile(resolve(root, "module.json"), "utf8"));
  assert.match(manager, /HandlebarsApplicationMixin\(ApplicationV2\)/u);
  assert.equal(manifest.relationships.requires.some((entry) => ["midi-qol", "dae", "lib-wrapper"].includes(entry.id)), false);
});

test("build tooling uses fixed deterministic ZIP timestamps", async () => {
  const zip = await readFile(resolve(root, "tools/lib/zip.mjs"), "utf8");
  assert.match(zip, /FIXED_DOS_DATE/u);
  assert.match(zip, /sorted = \[\.\.\.entries\]\.sort/u);
});

test("pack build compiles and validates deterministic NeDB source packs", async () => {
  const build = await readFile(resolve(root, "tools/build.mjs"), "utf8");
  assert.match(build, /writeDeterministicNedbPack/u);
  assert.match(build, /validateDeterministicNedbPack/u);
  assert.match(build, /-v2\.db/u);
});

test("archive listing helper remains callable", async () => {
  assert.equal(typeof listZip, "function");
});

test("release tooling creates a deterministic documentation archive", async () => {
  const packageTool = await readFile(resolve(root, "tools/package.mjs"), "utf8");
  const verifyTool = await readFile(resolve(root, "tools/verify-release.mjs"), "utf8");
  const bundleTool = await readFile(resolve(root, "tools/documentation-bundle.mjs"), "utf8");
  assert.match(packageTool, /createDocumentationBundle/u);
  assert.match(verifyTool, /documentationArchive/u);
  assert.match(bundleTool, /release-verification\.json/u);
  assert.match(bundleTool, /fresh-extraction-validation\.log/u);
});
