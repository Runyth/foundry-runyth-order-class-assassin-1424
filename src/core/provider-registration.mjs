// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CORE_ID, MODULE_ID, MODULE_TITLE } from "../constants.mjs";
import { registerProvider } from "./provider.mjs";

export class ProviderRegistration {
  #catalog;
  #getCore;
  #registered = null;
  #error = null;

  constructor({ catalog, getCore = () => game.modules.get(CORE_ID)?.api ?? null } = {}) {
    if (!catalog || typeof catalog !== "object") throw new TypeError("A canonical provider catalog is required.");
    if (typeof getCore !== "function") throw new TypeError("getCore must be a function.");
    this.#catalog = catalog;
    this.#getCore = getCore;
  }

  get error() {
    return this.#error;
  }

  get registeredProvider() {
    return this.#registered;
  }

  isRegistered(core = this.#getCore()) {
    const provider = core?.getProvider ? core.getProvider(MODULE_ID) : this.#registered;
    return provider?.id === MODULE_ID && provider?.moduleId === MODULE_ID;
  }

  register(core = this.#getCore()) {
    if (!core?.registerProvider || !core?.getProvider) {
      const error = new Error(`${MODULE_TITLE} requires the Runyth Order 1.0.0 provider registry API.`);
      this.#error = error;
      throw error;
    }

    const existing = core.getProvider(MODULE_ID);
    if (existing) {
      if (existing.moduleId !== MODULE_ID) {
        const error = new Error(`Provider ${MODULE_ID} is already owned by module ${existing.moduleId}.`);
        this.#error = error;
        throw error;
      }
      this.#registered = existing;
      this.#error = null;
      return existing;
    }

    try {
      const result = registerProvider(core, this.#catalog);
      const verified = core.getProvider(MODULE_ID);
      if (!verified || verified.id !== MODULE_ID || verified.moduleId !== MODULE_ID) {
        throw new Error(`Runyth Order did not retain provider ${MODULE_ID} after registration.`);
      }
      this.#registered = verified ?? result;
      this.#error = null;
      return this.#registered;
    } catch (error) {
      this.#registered = null;
      this.#error = error;
      throw error;
    }
  }
}
