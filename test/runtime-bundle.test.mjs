// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createBrowserBundle } from "../tools/lib/browser-bundle.mjs";

const root = resolve(import.meta.dirname, "..");

test("runtime bundle collapses the editable ES module graph into one browser entry", async () => {
  const temp = await mkdtemp(resolve(os.tmpdir(), "assassin-1424-bundle-"));
  const destination = resolve(temp, "main.mjs");
  try {
    const result = await createBrowserBundle({ sourceRoot: root, entry: "src/main.mjs", destination });
    const bundle = await readFile(destination, "utf8");
    assert.ok(result.moduleCount >= 30);
    assert.match(bundle, /Generated deterministic runtime bundle/u);
    assert.doesNotMatch(bundle, /^\s*import\s/mu);
    assert.doesNotMatch(bundle, /^\s*export\s/mu);
    assert.ok(result.modules.includes("src/api.mjs"));
    assert.ok(result.modules.includes("src/automation/disappearing-act.mjs"));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("generated browser entry evaluates without fetching secondary source modules", async () => {
  const temp = await mkdtemp(resolve(os.tmpdir(), "assassin-1424-runtime-"));
  const destination = resolve(temp, "main.mjs");
  const calls = [];
  const previousFoundry = globalThis.foundry;
  const previousHooks = globalThis.Hooks;
  try {
    globalThis.foundry = {
      applications: {
        api: {
          ApplicationV2: class ApplicationV2 {},
          HandlebarsApplicationMixin: (Base) => class extends Base {},
        },
      },
    };
    globalThis.Hooks = {
      once(name, fn) {
        calls.push({ name, fn });
      },
    };
    await createBrowserBundle({ sourceRoot: root, entry: "src/main.mjs", destination });
    await import(`${pathToFileURL(destination).href}?test=${Date.now()}`);
    assert.deepEqual(calls.map(({ name }) => name), ["init", "ready", "shutdown"]);
  } finally {
    if (previousFoundry === undefined) delete globalThis.foundry;
    else globalThis.foundry = previousFoundry;
    if (previousHooks === undefined) delete globalThis.Hooks;
    else globalThis.Hooks = previousHooks;
    await rm(temp, { recursive: true, force: true });
  }
});
