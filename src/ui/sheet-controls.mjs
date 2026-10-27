// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { IDENTIFIERS, MODULE_ID } from "../constants.mjs";
import { findItem, hasAssassinSubclass } from "../rules/identity.mjs";
import { remainingUses } from "../rules/uses.mjs";
import { SETTINGS } from "../settings.mjs";

function rootElement(html) {
  if (globalThis.HTMLElement && html instanceof HTMLElement) return html;
  return globalThis.HTMLElement && html?.[0] instanceof HTMLElement ? html[0] : null;
}

function sheetActor(application) {
  return application?.actor ?? application?.document ?? application?.object ?? null;
}

export function safeSheetAnchor(root) {
  const content = root?.matches?.(".window-content") ? root : root?.querySelector?.(".window-content") ?? root;
  return content?.querySelector?.([
    ".sheet-header",
    ".actor-header",
    '[data-application-part="header"]',
    '[data-section="header"]',
  ].join(", ")) ?? null;
}

function actionButton({ action, icon, label, disabled = false }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "runyth-order-class-assassin-1424-sheet-control";
  button.dataset.action = action;
  button.innerHTML = `<i class="${icon}" inert></i><span>${label}</span>`;
  button.disabled = disabled;
  button.setAttribute("aria-label", label);
  button.title = label;
  return button;
}

async function runButtonOperation(button, operation) {
  if (button.disabled || button.dataset.busy === "true") return;
  button.dataset.busy = "true";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    await operation();
  } catch (error) {
    ui.notifications.warn(error.message);
  } finally {
    if (button.isConnected) {
      button.dataset.busy = "false";
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}

export function registerSheetControls({ api }) {
  const render = (application, html) => {
    if (!game.settings.get(MODULE_ID, SETTINGS.showSheetControls)) return;
    const actor = sheetActor(application);
    const root = rootElement(html);
    if (!actor || actor.documentName !== "Actor" || !root || !hasAssassinSubclass(actor) || root.querySelector(".runyth-order-class-assassin-1424-sheet-controls")) return;
    const anchor = safeSheetAnchor(root);
    if (!anchor) return;

    const controls = document.createElement("nav");
    controls.className = "runyth-order-class-assassin-1424-sheet-controls";
    controls.setAttribute("aria-label", game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Sheet.Controls"));

    const manager = actionButton({ action: "manager", icon: "fa-solid fa-user-ninja", label: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Sheet.Manager") });
    manager.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      api.openManager({ actor });
    });
    controls.append(manager);

    const disappearing = findItem(actor, IDENTIFIERS.disappearingAct);
    if (disappearing) {
      const button = actionButton({
        action: "disappearing-act",
        icon: "fa-solid fa-smog",
        label: `${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Title")} (${remainingUses(disappearing)})`,
        disabled: remainingUses(disappearing) <= 0,
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void runButtonOperation(button, () => api.activateDisappearingAct(actor, { manual: true, event }));
      });
      controls.append(button);
    }

    const seize = findItem(actor, IDENTIFIERS.seizeTheMoment);
    if (seize) {
      const button = actionButton({
        action: "seize-the-moment",
        icon: "fa-solid fa-bolt",
        label: `${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Title")} (${remainingUses(seize)})`,
        disabled: remainingUses(seize) <= 0,
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void runButtonOperation(button, () => api.activateSeizeTheMoment(actor, { manual: true, event }));
      });
      controls.append(button);
    }
    anchor.append(controls);
  };
  Hooks.on("renderActorSheetV2", render);
}

export { runButtonOperation };
