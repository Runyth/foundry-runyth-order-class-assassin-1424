// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { DisappearingActAutomation, healthState, incomingHealth } from "../src/automation/disappearing-act.mjs";
import { CONTENT_VERSION, MODULE_ID, MODULE_VERSION } from "../src/constants.mjs";
import { getCatalog } from "../src/content/catalog.mjs";
import { ProviderRegistration } from "../src/core/provider-registration.mjs";
import { ModuleSocket } from "../src/core/socket.mjs";
import { prepareSubclassDiscovery, SUBCLASS_INDEX_FIELDS, SUBCLASS_PACK } from "../src/integration/subclass-discovery.mjs";
import { boundaryWarningParagraph, boundaryWarningsEnabled } from "../src/ui/chat-guidance.mjs";
import { askYesNo } from "../src/ui/dialogs.mjs";
import { safeSheetAnchor } from "../src/ui/sheet-controls.mjs";
import { KeyedOperationGate, resolveUuidSafe } from "../src/util/async.mjs";

const root = resolve(import.meta.dirname, "..");

function combat(turn) {
  return { uuid: "Combat.c", round: 2, turn };
}

test("patch advances canonical content while retaining the identity migration", async () => {
  assert.equal(MODULE_VERSION, "1.0.8");
  assert.equal(CONTENT_VERSION, "1.0.5");
  const catalog = JSON.parse(await readFile(resolve(root, "packs/catalog.json"), "utf8"));
  assert.equal(catalog.version, CONTENT_VERSION);
  assert.equal(catalog.providerId, "runyth-order-class-assassin-1424");
  const validationSource = await readFile(resolve(root, "tools/validate.mjs"), "utf8");
  assert.doesNotMatch(validationSource, /Initial version must be 1\.0\.0/u);
  assert.match(validationSource, /Manifest and package versions differ/u);
  assert.ok(catalog.packs.flatMap((pack) => pack.entries).every((entry) => entry.version === CONTENT_VERSION));
});

test("custom Assassin Strike interception is removed after the live Midi-QOL failure", async () => {
  const main = await readFile(resolve(root, "src/main.mjs"), "utf8");
  const provider = await readFile(resolve(root, "src/core/provider.mjs"), "utf8");
  assert.doesNotMatch(main, /AssassinateAutomation/u);
  assert.doesNotMatch(provider, /\.assassin-strike/u);
});

test("subclass discovery explicitly enables and indexes the canonical Rogue subclass pack", async () => {
  const documentId = "a551a551a551a551";
  const entry = {
    _id: documentId,
    type: "subclass",
    system: { identifier: MODULE_ID, classIdentifier: "rogue" },
  };
  const index = new Map([[documentId, entry]]);
  let requestedFields = [];
  let writtenSetting = null;
  const pack = {
    visible: true,
    async getIndex({ fields }) {
      requestedFields = fields;
      return index;
    },
  };
  const settings = {
    get(namespace, key) {
      if (namespace === MODULE_ID) return true;
      if (namespace === "dnd5e" && key === "packSourceConfiguration") return {};
      throw new Error(`Unexpected setting ${namespace}.${key}`);
    },
    async set(namespace, key, value) {
      writtenSetting = { namespace, key, value };
      return value;
    },
  };

  const result = await prepareSubclassDiscovery({
    packs: new Map([[SUBCLASS_PACK, pack]]),
    settings,
    user: { isGM: true },
  });

  assert.equal(result.available, true);
  assert.deepEqual(new Set(requestedFields), new Set(SUBCLASS_INDEX_FIELDS));
  assert.equal(writtenSetting.value[SUBCLASS_PACK], true);
});

test("subclass discovery reports a player-hidden D&D 5e browser source without mutating it", async () => {
  const entry = {
    _id: "a551a551a551a551",
    type: "subclass",
    system: { identifier: MODULE_ID, classIdentifier: "rogue" },
  };
  let writes = 0;
  const result = await prepareSubclassDiscovery({
    packs: new Map([[SUBCLASS_PACK, { visible: true, getIndex: async () => new Map([[entry._id, entry]]) }]]),
    settings: {
      get(namespace) {
        return namespace === MODULE_ID ? true : { [SUBCLASS_PACK]: false };
      },
      async set() { writes += 1; },
    },
    user: { isGM: false },
  });
  assert.equal(result.available, false);
  assert.equal(result.sourceEnabled, false);
  assert.equal(writes, 0);
});

test("disabling subclass exposure writes the D&D 5e source off for a GM", async () => {
  const entry = {
    _id: "a551a551a551a551",
    type: "subclass",
    system: { identifier: MODULE_ID, classIdentifier: "rogue" },
  };
  let writtenSetting = null;
  const result = await prepareSubclassDiscovery({
    packs: new Map([[SUBCLASS_PACK, { visible: true, getIndex: async () => new Map([[entry._id, entry]]) }]]),
    settings: {
      get(namespace) {
        return namespace === MODULE_ID ? false : {};
      },
      async set(namespace, key, value) {
        writtenSetting = { namespace, key, value };
      },
    },
    user: { isGM: true },
  });
  assert.equal(result.available, false);
  assert.equal(result.sourceEnabled, false);
  assert.equal(writtenSetting.value[SUBCLASS_PACK], false);
});

test("subclass discovery rejects an index entry that cannot pass the Rogue filter", async () => {
  await assert.rejects(
    prepareSubclassDiscovery({
      packs: new Map([[SUBCLASS_PACK, {
        visible: true,
        getIndex: async () => new Map([["a551a551a551a551", {
          _id: "a551a551a551a551",
          type: "subclass",
          system: { identifier: MODULE_ID, classIdentifier: "fighter" },
        }]]),
      }]]),
      settings: {
        get(namespace) {
          return namespace === MODULE_ID ? true : { [SUBCLASS_PACK]: true };
        },
      },
      user: { isGM: false },
    }),
    /could not index Assassin 1424 as a Rogue subclass/u,
  );
});

test("temporary movement state survives unrelated Combat updates", async () => {
  const disappearing = new DisappearingActAutomation({ socket: {}, controllers: {} });
  let movementClears = 0;
  disappearing.clearTemporaryEffects = async () => { movementClears += 1; };
  disappearing.lastCombatTurnKey = "Combat.c|2|0";
  await disappearing.onCombatUpdate(combat(0));
  assert.equal(movementClears, 0);
  await disappearing.onCombatUpdate(combat(1));
  assert.equal(movementClears, 1);
});

test("damage detection includes temporary HP and rejects malformed values", () => {
  const actor = { system: { attributes: { hp: { value: 20, temp: 7 } } } };
  assert.deepEqual(healthState(actor), { value: 20, temp: 7, total: 27 });
  assert.deepEqual(incomingHealth(actor, { "system.attributes.hp.temp": 2 }), { value: 20, temp: 2, total: 22 });
  assert.equal(incomingHealth(actor, { "system.attributes.hp.value": "invalid" }), null);
});

test("keyed operation gate deduplicates simultaneous activation", async () => {
  const gate = new KeyedOperationGate();
  let calls = 0;
  let release;
  const waiting = new Promise((resolvePromise) => { release = resolvePromise; });
  const operation = async () => {
    calls += 1;
    await waiting;
    return "done";
  };
  const first = gate.run("Actor.a", operation);
  const second = gate.run("Actor.a", operation);
  assert.equal(first, second);
  assert.equal(gate.has("Actor.a"), true);
  release();
  assert.equal(await first, "done");
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(gate.has("Actor.a"), false);
});

test("safe UUID resolution converts stale-document errors to null", async () => {
  assert.equal(await resolveUuidSafe("Actor.missing", async () => { throw new Error("missing"); }), null);
});

test("sheet controls never fall back into generic window chrome", () => {
  const actorHeader = { id: "actor-header" };
  const content = {
    querySelector(selector) {
      assert.equal(selector.includes(".window-header"), false);
      assert.equal(selector.split(",").some((part) => part.trim() === "header"), false);
      return actorHeader;
    },
  };
  const rootElement = {
    matches: () => false,
    querySelector: (selector) => selector === ".window-content" ? content : null,
  };
  assert.equal(safeSheetAnchor(rootElement), actorHeader);
  assert.equal(safeSheetAnchor({ matches: () => false, querySelector: () => null }), null);
});

test("DialogV2 prompt is modal and closes safely without rejection", async () => {
  const previousFoundry = globalThis.foundry;
  let options;
  globalThis.foundry = {
    applications: { api: { DialogV2: { confirm: async (value) => { options = value; return true; } } } },
  };
  try {
    assert.equal(await askYesNo({ title: "Title", content: "Question", yesLabel: "Yes", noLabel: "No" }), true);
    assert.equal(options.modal, true);
    assert.equal(options.rejectClose, false);
    assert.deepEqual(options.classes, ["runyth-order-class-assassin-1424", "runyth-order-class-assassin-1424-prompt-dialog"]);
  } finally {
    globalThis.foundry = previousFoundry;
  }
});

test("automation-boundary warning setting controls chat guidance", () => {
  const previousGame = globalThis.game;
  const values = [false, true];
  globalThis.game = {
    settings: { get: () => values.shift() },
    i18n: { localize: (key) => `localized:${key}` },
  };
  try {
    assert.equal(boundaryWarningsEnabled(), false);
    assert.equal(boundaryWarningParagraph("Key"), "<p>localized:Key</p>");
  } finally {
    globalThis.game = previousGame;
  }
});

test("module socket registration is idempotent and removable", async () => {
  const previousGame = globalThis.game;
  const listeners = [];
  const removed = [];
  globalThis.game = {
    socket: {
      on: (channel, listener) => listeners.push({ channel, listener }),
      off: (channel, listener) => removed.push({ channel, listener }),
      emit() {},
    },
  };
  try {
    const socket = new ModuleSocket();
    let calls = 0;
    socket.on("action", async () => { calls += 1; });
    socket.register();
    socket.register();
    assert.equal(listeners.length, 1);
    await listeners[0].listener({ type: "action" });
    assert.equal(calls, 1);
    socket.clear();
    assert.equal(removed.length, 1);
  } finally {
    globalThis.game = previousGame;
  }
});

test("manager rendering avoids optional Handlebars helpers and closed-window reopening", async () => {
  const manager = await readFile(resolve(root, "src/ui/manager.mjs"), "utf8");
  const template = await readFile(resolve(root, "templates/manager.hbs"), "utf8");
  assert.match(manager, /stateJson: state \? JSON\.stringify/u);
  assert.match(manager, /if \(this\.rendered\) await this\.render/u);
  assert.match(manager, /#currentActor\(\)/u);
  assert.doesNotMatch(template, /\{\{json\s/u);
  const sheetControls = await readFile(resolve(root, "src/ui/sheet-controls.mjs"), "utf8");
  assert.match(sheetControls, /openManager\(\{ actor \}\)/u);
  assert.equal(template.includes('aria-busy="{{busy}}"'), true);
  assert.equal(template.includes('aria-live="polite"'), true);
});


test("provider registration is synchronous, verified, and idempotent", () => {
  const previousGame = globalThis.game;
  const providers = new Map();
  let registrations = 0;
  globalThis.game = {
    modules: {
      get: (id) => id === "runyth-order-class-assassin-1424" ? { id, active: true, version: "1.0.2" } : null,
    },
  };
  const core = {
    getProvider: (id) => providers.get(id) ?? null,
    registerProvider: (descriptor) => {
      registrations += 1;
      const registered = Object.freeze({ ...descriptor, packIds: descriptor.packs.map((pack) => `${descriptor.id}.${pack.id}`), validatorIds: [`${descriptor.id}.assassin-actor`], migrationIds: [] });
      providers.set(descriptor.id, registered);
      return registered;
    },
  };
  try {
    const registration = new ProviderRegistration({ catalog: getCatalog(), getCore: () => core });
    const first = registration.register();
    const second = registration.register();
    assert.equal(first.id, "runyth-order-class-assassin-1424");
    assert.equal(first.version, "1.0.2");
    assert.equal(second, first);
    assert.equal(registrations, 1);
    assert.equal(registration.isRegistered(), true);
    assert.equal(registration.error, null);
  } finally {
    globalThis.game = previousGame;
  }
});

test("provider registration fails closed when Core does not retain the provider", () => {
  const previousGame = globalThis.game;
  globalThis.game = {
    modules: {
      get: (id) => id === "runyth-order-class-assassin-1424" ? { id, active: true, version: "1.0.2" } : null,
    },
  };
  const core = {
    getProvider: () => null,
    registerProvider: (descriptor) => descriptor,
  };
  try {
    const registration = new ProviderRegistration({ catalog: getCatalog(), getCore: () => core });
    assert.throws(() => registration.register(), /did not retain provider/u);
    assert.equal(registration.isRegistered(), false);
    assert.ok(registration.error instanceof Error);
  } finally {
    globalThis.game = previousGame;
  }
});

test("provider lifecycle does not defer registration behind an asynchronous init listener", async () => {
  const main = await readFile(resolve(root, "src/main.mjs"), "utf8");
  const catalogLoader = await readFile(resolve(root, "src/content/catalog.mjs"), "utf8");
  assert.match(main, /Hooks\.once\("init", \(\) =>/u);
  assert.doesNotMatch(main, /Hooks\.once\("init", async/u);
  assert.match(main, /completeProviderInitialization\(core\)/u);
  assert.match(main, /providerRegistration\.isRegistered\(\)/u);
  assert.match(main, /Ready with provider \$\{MODULE_ID\} registered/u);
  assert.doesNotMatch(catalogLoader, /fetch\(/u);
});

test("runtime catalog exactly mirrors the canonical provider catalog", async () => {
  const canonical = JSON.parse(await readFile(resolve(root, "packs/catalog.json"), "utf8"));
  assert.deepEqual(getCatalog(), canonical);
});
