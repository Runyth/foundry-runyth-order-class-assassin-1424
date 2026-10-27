// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE } from "../constants.mjs";
import { SETTINGS } from "../settings.mjs";
import { selectedActor } from "../util/objects.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class Assassin1424Manager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-manager`,
    tag: "section",
    classes: [MODULE_ID, "runyth-order-class-assassin-1424-manager"],
    window: { title: MODULE_TITLE, icon: "fa-solid fa-user-ninja", resizable: true },
    position: { width: 720, height: 620 },
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/manager.hbs` },
  };

  constructor({ actor = null, onClose = null, ...options } = {}) {
    super(options);
    this.api = game.modules.get(MODULE_ID)?.api ?? null;
    this.actor = actor?.documentName === "Actor" ? actor : null;
    this.lastResult = null;
    this.busy = false;
    this.positionSaveTimer = null;
    this.onCloseCallback = onClose;
  }

  setActor(actor) {
    this.actor = actor?.documentName === "Actor" ? actor : null;
    return this;
  }

  #currentActor() {
    return this.actor ?? selectedActor();
  }

  async _prepareContext() {
    const actor = this.#currentActor();
    const audit = actor && this.api ? await this.api.auditActor(actor) : [];
    const state = actor && this.api ? this.api.getActorState(actor) : null;
    return {
      moduleId: MODULE_ID,
      version: game.modules.get(MODULE_ID)?.version ?? "—",
      actor: actor ? { name: actor.name, uuid: actor.uuid, img: actor.img, isOwner: actor.isOwner } : null,
      stateJson: state ? JSON.stringify(state, null, 2) : null,
      audit: Array.isArray(audit) ? audit : audit?.issues ?? [],
      busy: this.busy,
      lastResult: this.lastResult ? JSON.stringify(this.lastResult, null, 2) : null,
      isGM: game.user?.isGM ?? false,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!root) return;
    root.querySelector('[data-action="dry-run"]')?.addEventListener("click", () => void this.#runSync(true));
    root.querySelector('[data-action="sync"]')?.addEventListener("click", () => void this.#runSync(false));
    root.querySelector('[data-action="audit"]')?.addEventListener("click", () => void this.#audit());
    root.querySelector('[data-action="disappearing-act"]')?.addEventListener("click", () => void this.#activate("disappearing"));
    root.querySelector('[data-action="seize-the-moment"]')?.addEventListener("click", () => void this.#activate("seize"));
    root.querySelector('[data-action="reset-position"]')?.addEventListener("click", () => void this.#resetPosition());
    root.querySelector('[data-action="refresh"]')?.addEventListener("click", () => void this.render({ force: true }));
  }

  _onPosition(position) {
    super._onPosition(position);
    if (!this.rendered) return;
    clearTimeout(this.positionSaveTimer);
    this.positionSaveTimer = setTimeout(() => {
      void game.settings.set(MODULE_ID, SETTINGS.managerPosition, {
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
      }).catch((error) => console.warn(`${MODULE_TITLE} | Could not save manager position`, error));
    }, 250);
  }

  async _onClose(options) {
    clearTimeout(this.positionSaveTimer);
    this.positionSaveTimer = null;
    await super._onClose(options);
    this.onCloseCallback?.(this);
  }

  async #withBusy(operation) {
    if (this.busy) return;
    this.busy = true;
    if (this.rendered) await this.render({ force: true });
    try {
      this.lastResult = await operation();
    } catch (error) {
      console.error(`${MODULE_TITLE} | Manager operation failed`, error);
      ui.notifications.error(`${MODULE_TITLE}: ${error.message}`);
    } finally {
      this.busy = false;
      if (this.rendered) await this.render({ force: true });
    }
  }

  async #runSync(dryRun) {
    const actor = this.#currentActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Manager.SelectActor"));
    await this.#withBusy(() => this.api.syncActor(actor, { dryRun }));
  }

  async #audit() {
    const actor = this.#currentActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Manager.SelectActor"));
    await this.#withBusy(() => this.api.auditActor(actor));
  }

  async #activate(kind) {
    const actor = this.#currentActor();
    if (!actor) return ui.notifications.warn(game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Manager.SelectActor"));
    await this.#withBusy(() => kind === "seize"
      ? this.api.activateSeizeTheMoment(actor, { manual: true })
      : this.api.activateDisappearingAct(actor, { manual: true }));
  }

  async #resetPosition() {
    await game.settings.set(MODULE_ID, SETTINGS.managerPosition, {});
    this.setPosition({
      left: Math.max(0, Math.round((window.innerWidth - 720) / 2)),
      top: Math.max(0, Math.round((window.innerHeight - 620) / 2)),
      width: 720,
      height: 620,
    });
  }
}
