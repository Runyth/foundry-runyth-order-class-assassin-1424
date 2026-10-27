// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID, API_VERSION } from "./constants.mjs";
import { hasAssassinSubclass } from "./rules/identity.mjs";
import { syncActor } from "./core/synchronizer.mjs";
import { validateActorPure } from "./core/validator.mjs";

export class Assassin1424Api {
  #ready = false;
  #readyPromise;
  #resolveReady;
  #publicApi = null;
  #disappearingAct;
  #seizeTheMoment;
  #automations;
  #managerOpener = null;

  constructor({ disappearingAct, seizeTheMoment, automations = [] }) {
    this.#disappearingAct = disappearingAct;
    this.#seizeTheMoment = seizeTheMoment;
    this.#automations = [...automations];
    this.#readyPromise = new Promise((resolve) => {
      this.#resolveReady = resolve;
    });
  }

  get apiVersion() {
    return API_VERSION;
  }

  isReady() {
    return this.#ready;
  }

  whenReady() {
    return this.#ready ? Promise.resolve(this.#publicApi) : this.#readyPromise;
  }

  setPublicApi(publicApi) {
    if (this.#publicApi) throw new Error("The public API facade is already configured.");
    this.#publicApi = publicApi;
  }

  markReady() {
    if (this.#ready) return;
    if (!this.#publicApi) throw new Error("The public API facade has not been configured.");
    this.#ready = true;
    this.#resolveReady(this.#publicApi);
  }

  hasAssassin1424Subclass(actor) {
    return hasAssassinSubclass(actor);
  }

  hasAssassinSubclass(actor) {
    return this.hasAssassin1424Subclass(actor);
  }

  getActorState(actor) {
    if (!actor) throw new TypeError("getActorState requires an Actor.");
    return Object.freeze({
      actorUuid: actor.uuid ?? actor.id,
      assassin: hasAssassinSubclass(actor),
      seizeTheMoment: this.#seizeTheMoment.getState(actor),
      // Compatibility field retained after removal of the custom Assassin Strike workflow.
      pendingAssassinStrikes: 0,
    });
  }

  async syncActor(actor, { dryRun = false } = {}) {
    if (!actor) throw new TypeError("syncActor requires an Actor.");
    return syncActor(actor, { dryRun });
  }

  async auditActor(actor) {
    if (!actor) throw new TypeError("auditActor requires an Actor.");
    const core = game.modules.get(CORE_ID)?.api;
    if (core?.auditActor) return core.auditActor(actor);
    return validateActorPure(actor);
  }

  async activateDisappearingAct(actorOrToken, options = {}) {
    return this.#disappearingAct.activate(actorOrToken, options);
  }

  async activateSeizeTheMoment(actorOrToken, options = {}) {
    return this.#seizeTheMoment.activate(actorOrToken, options);
  }

  setManagerOpener(opener) {
    this.#managerOpener = opener;
  }

  openManager(options = {}) {
    if (!this.#managerOpener) throw new Error("Assassin 1424 manager is not ready.");
    return this.#managerOpener(options);
  }

  async shutdown() {
    const cleanups = this.#automations.map(async (automation) => {
      try {
        if (typeof automation?.clear === "function") await automation.clear();
        else if (typeof automation?.clearAll === "function") await automation.clearAll();
      } catch {
        // Shutdown cleanup is best-effort and must never block Foundry shutdown.
      }
    });
    await Promise.allSettled(cleanups);
  }
}

export function publicApiShape(api) {
  return Object.freeze({
    apiVersion: api.apiVersion,
    isReady: api.isReady.bind(api),
    whenReady: api.whenReady.bind(api),
    hasAssassin1424Subclass: api.hasAssassin1424Subclass.bind(api),
    // Compatibility alias retained for scripts created before the identity rename.
    hasAssassinSubclass: api.hasAssassinSubclass.bind(api),
    getActorState: api.getActorState.bind(api),
    syncActor: api.syncActor.bind(api),
    auditActor: api.auditActor.bind(api),
    activateDisappearingAct: api.activateDisappearingAct.bind(api),
    activateSeizeTheMoment: api.activateSeizeTheMoment.bind(api),
    openManager: api.openManager.bind(api),
  });
}
