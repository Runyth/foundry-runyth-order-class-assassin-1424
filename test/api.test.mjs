// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";
import { Assassin1424Api, publicApiShape } from "../src/api.mjs";

function buildApi() {
  const disappearingAct = { async activate() { return { activated: true }; }, clear() {} };
  const seizeTheMoment = { getState() { return null; }, async activate() { return { activated: true }; }, clear() {} };
  const internal = new Assassin1424Api({ disappearingAct, seizeTheMoment, automations: [disappearingAct, seizeTheMoment] });
  internal.setManagerOpener(() => ({ rendered: true }));
  const api = publicApiShape(internal);
  internal.setPublicApi(api);
  return { internal, api };
}

test("public API is frozen, narrow, and exposes no automation internals", () => {
  const { api } = buildApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api).sort(), [
    "activateDisappearingAct",
    "activateSeizeTheMoment",
    "apiVersion",
    "auditActor",
    "getActorState",
    "hasAssassin1424Subclass",
    "hasAssassinSubclass",
    "isReady",
    "openManager",
    "syncActor",
    "whenReady",
  ].sort());
  assert.equal("assassinate" in api, false);
  assert.equal("seizeTheMoment" in api, false);
});

test("whenReady resolves to the same public facade", async () => {
  const { internal, api } = buildApi();
  const pending = api.whenReady();
  internal.markReady();
  assert.equal(await pending, api);
  assert.equal(await api.whenReady(), api);
});

test("actor state retains a zero-valued legacy Assassin Strike compatibility field", () => {
  const { api } = buildApi();
  const state = api.getActorState({ uuid: "Actor.a", items: [] });
  assert.equal(state.pendingAssassinStrikes, 0);
  assert.equal(Object.isFrozen(state), true);
});
