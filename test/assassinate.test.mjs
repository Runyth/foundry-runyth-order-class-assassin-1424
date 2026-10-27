// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("Assassinate keeps the authoritative rule and uses the native critical-damage fallback", async () => {
  const item = JSON.parse(await readFile(resolve(root, "packs/_source/features/assassinate.json"), "utf8"));
  const description = item.system.description.value;
  assert.match(description, /permanent advantage on Initiative rolls/u);
  assert.match(description, /Any weapon attack you score against a surprised creature is a critical hit/u);
  assert.match(description, /select the standard <em>Critical Hit<\/em> option/u);
  assert.match(description, /intentionally adds no separate Assassin Strike attack button/u);
  assert.equal(item.flags["runyth-order-class-assassin-1424"].automation.assassinStrike, "native-critical-damage-dialog");
});

test("runtime contains no custom Assassin Strike attack or damage interception", async () => {
  const main = await readFile(resolve(root, "src/main.mjs"), "utf8");
  assert.doesNotMatch(main, /AssassinateAutomation/u);
  assert.equal(await exists(resolve(root, "src/automation/assassinate.mjs")), false);
  assert.equal(await exists(resolve(root, "src/rules/assassin-strike-state.mjs")), false);

  const runtimeFiles = [
    "src/main.mjs",
    "src/api.mjs",
    "src/core/provider.mjs",
  ];
  for (const file of runtimeFiles) {
    const source = await readFile(resolve(root, file), "utf8");
    assert.doesNotMatch(source, /runythOrderAssassin1424Strike/u);
    assert.doesNotMatch(source, /rollCriticalDamage/u);
    assert.doesNotMatch(source, /rollAssassinStrike/u);
  }
});
