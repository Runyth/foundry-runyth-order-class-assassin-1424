// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { IDENTIFIERS, MODULE_ID } from "../constants.mjs";
import { hasFeature } from "../rules/identity.mjs";
import { numericSpeed } from "../rules/speeds.mjs";
import { deepClone } from "../util/objects.mjs";
import { askYesNo, notify } from "../ui/dialogs.mjs";

const ACROBATICS_IDS = new Set(["acr", "acrobatics"]);
export const DYNAMIC_CLIMB_KEY = `flags.${MODULE_ID}.dynamicClimb`;

function parseSkillHook(args) {
  const [config = {}, dialog = {}, message = {}] = args;
  const subject = config?.subject ?? null;
  const actor = subject?.documentName === "Actor"
    ? subject
    : subject?.actor?.documentName === "Actor"
      ? subject.actor
      : null;
  return {
    actor,
    skillId: config?.skill ?? null,
    config,
    dialog,
    message,
  };
}

function cloneRollConfig(config = {}) {
  const copy = { ...config, skill: "acr" };
  delete copy.subject;
  delete copy.hookNames;
  if (Array.isArray(config.rolls)) copy.rolls = config.rolls.map((roll) => deepClone(roll));
  return copy;
}

function cloneDialogConfig(dialog = {}) {
  const copy = { ...dialog };
  delete copy.applicationClass;
  if (dialog.options) {
    copy.options = { ...dialog.options };
    delete copy.options.buildConfig;
  }
  return copy;
}

function cloneMessageConfig(message = {}) {
  const copy = { ...message };
  if (message.data) copy.data = deepClone(message.data);
  return copy;
}

export function applyDynamicClimb(actor, change, changes) {
  if (change?.key !== DYNAMIC_CLIMB_KEY) return false;
  if (!actor || !hasFeature(actor, IDENTIFIERS.shadowInTheNight)) return false;
  const walk = numericSpeed(actor?.system?.attributes?.movement?.walk);
  changes["system.attributes.movement.climb"] = walk;
  return true;
}

export class RooftopPursuitAutomation {
  constructor() {
    this.recursionGuard = new Set();
    this.promptInFlight = new Set();
  }

  registerHooks() {
    Hooks.on("applyActiveEffect", (actor, change, _current, _delta, changes) => applyDynamicClimb(actor, change, changes));
    Hooks.on("dnd5e.preRollSkill", (...args) => this.interceptAcrobatics(...args));
  }

  interceptAcrobatics(...args) {
    const { actor, skillId, config, dialog, message } = parseSkillHook(args);
    if (!actor || !ACROBATICS_IDS.has(String(skillId).toLowerCase())) return;
    if (!hasFeature(actor, IDENTIFIERS.shadowInTheNight) || this.recursionGuard.has(actor.uuid)) return;
    if (this.promptInFlight.has(actor.uuid)) return;
    this.promptInFlight.add(actor.uuid);
    void this.promptAndReroll(actor, config, dialog, message);
    return false;
  }

  async promptAndReroll(actor, originalConfig, originalDialog, originalMessage) {
    try {
      let advantage = false;
      try {
        advantage = await askYesNo({
          title: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.RooftopPursuit.Title"),
          content: `<p>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.RooftopPursuit.Question")}</p>`,
          yesLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.Yes"),
          noLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.No"),
        });
      } catch (error) {
        console.warn(`${MODULE_ID} | Rooftop Pursuit prompt failed; rolling normally`, error);
      }
      if (!actor?.uuid || (!game.actors?.get?.(actor.id) && !actor.isToken)) return;
      const config = cloneRollConfig(originalConfig);
      const dialog = cloneDialogConfig(originalDialog);
      const message = cloneMessageConfig(originalMessage);
      if (advantage) config.advantage = true;
      this.recursionGuard.add(actor.uuid);
      try {
        await actor.rollSkill(config, dialog, message);
      } finally {
        this.recursionGuard.delete(actor.uuid);
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Rooftop Pursuit roll failed`, error);
      notify("error", "RUNYTH_ORDER_CLASS_ASSASSIN_1424.RooftopPursuit.Failed", { error: error.message });
    } finally {
      this.promptInFlight.delete(actor?.uuid);
    }
  }

  clear() {
    this.recursionGuard.clear();
    this.promptInFlight.clear();
  }
}

export { cloneDialogConfig, cloneMessageConfig, cloneRollConfig, parseSkillHook };
