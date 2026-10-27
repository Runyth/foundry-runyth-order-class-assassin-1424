// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { CORE_API_VERSION, CORE_ID, LEGACY_CORE_ID, MODULE_ID } from "../src/constants.mjs";
import { ProviderRegistration } from "../src/core/provider-registration.mjs";
import { sourceOf } from "../src/core/source.mjs";
import { getCatalog } from "../src/content/catalog.mjs";

const root = resolve(import.meta.dirname, "..");

test("manifest requires the accepted Runyth Order package identity", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "module.json"), "utf8"));
  assert.equal(CORE_ID, "runyth-order");
  assert.equal(CORE_API_VERSION, "1.0.0");
  assert.equal(LEGACY_CORE_ID, "runyth-rules-core");
  assert.deepEqual(manifest.relationships.requires, [{
    id: "runyth-order",
    type: "module",
    compatibility: { minimum: "1.0.3", verified: "1.0.4" },
  }]);
});

test("provider registration accepts Runyth Order API 1.0.0", () => {
  const previousGame = globalThis.game;
  globalThis.game = { modules: new Map([[MODULE_ID, { version: "1.0.7" }]]) };
  const providers = new Map();
  const core = {
    registerProvider(descriptor) {
      assert.equal(descriptor.id, MODULE_ID);
      assert.deepEqual(descriptor.coreApi, { minimum: "1.0.0", verified: "1.0.0", maximum: "1.0.0" });
      providers.set(descriptor.id, descriptor);
      return descriptor;
    },
    getProvider(id) {
      return providers.get(id) ?? null;
    },
  };
  try {
    const registration = new ProviderRegistration({ catalog: getCatalog(), getCore: () => core });
    assert.equal(registration.register(core).id, MODULE_ID);
    assert.equal(registration.isRegistered(core), true);
  } finally {
    globalThis.game = previousGame;
  }
});

test("source reads canonical Runyth Order metadata and falls back to the retired namespace", () => {
  const canonical = { providerId: MODULE_ID, entryId: "assassinate" };
  const legacy = { providerId: "runyth-assassin", entryId: "assassinate" };
  assert.equal(sourceOf({ flags: { [CORE_ID]: { source: canonical } } }, null), canonical);
  assert.equal(sourceOf({ flags: { [LEGACY_CORE_ID]: { source: legacy } } }, null), legacy);
});
