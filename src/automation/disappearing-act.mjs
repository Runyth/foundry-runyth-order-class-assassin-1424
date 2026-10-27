// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { IDENTIFIERS, MODULE_ID } from "../constants.mjs";
import { findItem, hasFeature } from "../rules/identity.mjs";
import { halfCurrentSpeed } from "../rules/speeds.mjs";
import { nextSpentValue, remainingUses } from "../rules/uses.mjs";
import { KeyedOperationGate, resolveUuidSafe } from "../util/async.mjs";
import { getProperty } from "../util/objects.mjs";
import { askYesNo, notify } from "../ui/dialogs.mjs";
import { boundaryWarningParagraph } from "../ui/chat-guidance.mjs";

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function healthState(actor) {
  const hp = actor?.system?.attributes?.hp ?? {};
  const value = finiteNumber(hp.value, 0);
  const temp = finiteNumber(hp.temp, 0);
  return { value, temp, total: value + temp };
}

export function incomingHealth(actor, changes) {
  const current = healthState(actor);
  const valueChange = changes?.["system.attributes.hp.value"] ?? getProperty(changes, "system.attributes.hp.value");
  const tempChange = changes?.["system.attributes.hp.temp"] ?? getProperty(changes, "system.attributes.hp.temp");
  const value = valueChange === undefined ? current.value : finiteNumber(valueChange);
  const temp = tempChange === undefined ? current.temp : finiteNumber(tempChange);
  if (value === null || temp === null) return null;
  return { value, temp, total: value + temp };
}

function hpValue(actor) {
  return healthState(actor).value;
}

function incomingHp(changes) {
  const flat = changes?.["system.attributes.hp.value"];
  const nested = flat === undefined ? getProperty(changes, "system.attributes.hp.value") : flat;
  return nested === undefined ? null : finiteNumber(nested);
}

function actorToken(actor) {
  const active = actor?.getActiveTokens?.(true, true) ?? actor?.getActiveTokens?.() ?? [];
  return active.find((token) => token?.controlled) ?? active[0] ?? null;
}

async function resolveActorOrToken(value) {
  if (!value) return { actor: null, token: null };
  if (typeof value === "string") value = await resolveUuidSafe(value);
  if (value?.documentName === "Token" || value?.constructor?.documentName === "Token") return { actor: value.actor, token: value.object ?? value };
  if (value?.document?.documentName === "Token") return { actor: value.actor, token: value };
  if (value?.documentName === "Actor") return { actor: value, token: actorToken(value) };
  if (value?.actor?.documentName === "Actor") return { actor: value.actor, token: value };
  return { actor: null, token: null };
}

async function performHide(actor, options = {}) {
  if (typeof actor?.rollSkill !== "function") {
    throw new Error("No supported D&D 5e Stealth-check adapter is available for the Hide Action.");
  }
  const config = { ...(options.rollConfig ?? {}), skill: "ste", event: options.event };
  const dialog = { configure: true, ...(options.dialog ?? {}) };
  const message = { ...(options.message ?? {}) };
  return actor.rollSkill(config, dialog, message);
}

function damageWorkflowKey(actor, options) {
  return options?.runythOrderAssassin1424DamageKey
    ?? options?.damageId
    ?? options?.dnd5e?.damageId
    ?? options?.dnd5e?.transactionId
    ?? options?.transactionId
    ?? `${actor.uuid}:${game.combat?.uuid ?? "no-combat"}:${game.combat?.round ?? 0}:${game.combat?.turn ?? -1}:${Date.now()}`;
}

function combatTurnKey(combat) {
  if (!combat) return null;
  return `${combat.uuid ?? combat.id ?? "combat"}|${combat.round ?? 0}|${combat.turn ?? -1}`;
}

export class DisappearingActAutomation {
  constructor({ socket, controllers }) {
    this.socket = socket;
    this.controllers = controllers;
    this.beforeHp = new Map();
    this.pendingPrompts = new Set();
    this.promptTimers = new Map();
    this.promptDialogs = new Set();
    this.temporaryEffects = new Map();
    this.effectTimers = new Map();
    this.activationGate = new KeyedOperationGate();
    this.lastCombatTurnKey = null;
  }

  registerHooks() {
    Hooks.on("preUpdateActor", (actor, changes, options) => this.captureDamage(actor, changes, options));
    Hooks.on("updateActor", (actor, changes, options) => void this.afterDamage(actor, changes, options));
    Hooks.on("updateCombat", (combat) => void this.onCombatUpdate(combat));
    Hooks.on("deleteCombat", () => void this.clearTemporaryEffects());
    Hooks.on("deleteActor", (actor) => this.clearActor(actor?.uuid));
    Hooks.on("deleteToken", (token) => this.clearActor(token?.actor?.uuid));
    Hooks.on("dnd5e.restCompleted", (actor) => void this.clearActorEffects(actor?.uuid));
    this.socket.on("prompt-disappearing-act", (payload) => void this.receivePrompt(payload));
  }

  captureDamage(actor, changes, options = {}) {
    const current = healthState(actor);
    const next = incomingHealth(actor, changes);
    if (!next || next.total >= current.total) return;
    const key = damageWorkflowKey(actor, options);
    this.beforeHp.set(key, { actorUuid: actor.uuid, before: current, after: next });
    options.runythOrderAssassin1424DamageKey = key;
  }

  async afterDamage(actor, _changes, options) {
    const key = options?.runythOrderAssassin1424DamageKey;
    if (!key || !this.beforeHp.has(key)) return;
    this.beforeHp.delete(key);
    if (!hasFeature(actor, IDENTIFIERS.shadowInTheNight)) return;
    const feature = findItem(actor, IDENTIFIERS.disappearingAct);
    if (!feature || remainingUses(feature) <= 0 || this.pendingPrompts.has(key)) return;
    const token = actorToken(actor);
    const userId = this.controllers.select({ actor, token });
    if (!userId) return;
    this.pendingPrompts.add(key);
    this.socket.emit("prompt-disappearing-act", {
      userId,
      actorUuid: actor.uuid,
      tokenUuid: token?.document?.uuid ?? token?.uuid ?? null,
      workflowKey: key,
    });
    const timer = setTimeout(() => this.#clearPromptKey(key), 30000);
    this.promptTimers.set(key, timer);
  }

  async receivePrompt(payload) {
    if (payload?.userId !== game.user?.id || !payload.workflowKey || this.promptDialogs.has(payload.workflowKey)) return;
    this.promptDialogs.add(payload.workflowKey);
    try {
      const actor = await resolveUuidSafe(payload.actorUuid);
      if (!actor) return;
      const feature = findItem(actor, IDENTIFIERS.disappearingAct);
      if (!feature || remainingUses(feature) <= 0) return;
      const yes = await askYesNo({
        title: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Title"),
        content: `<p>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Question")}</p>`,
        yesLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.Yes"),
        noLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.No"),
      });
      if (!yes) return;
      const token = await resolveUuidSafe(payload.tokenUuid);
      await this.activate(token ?? actor, { prompted: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Disappearing Act failed`, error);
      notify("error", "RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Failed", { error: error.message });
    } finally {
      this.promptDialogs.delete(payload.workflowKey);
      this.#clearPromptKey(payload.workflowKey);
    }
  }

  async activate(actorOrToken, options = {}) {
    const resolved = await resolveActorOrToken(actorOrToken);
    if (!resolved.actor) throw new TypeError("Disappearing Act requires an Actor or Token.");
    return this.activationGate.run(resolved.actor.uuid, () => this.#activateResolved(resolved, options));
  }

  async #activateResolved({ actor, token }, options) {
    if (!hasFeature(actor, IDENTIFIERS.shadowInTheNight)) throw new Error("The Actor does not have Shadow in the Night.");
    const feature = findItem(actor, IDENTIFIERS.disappearingAct);
    if (!feature) throw new Error("The Disappearing Act feature is missing.");
    if (remainingUses(feature) <= 0) throw new Error("Disappearing Act has no remaining uses.");

    const hideResult = await performHide(actor, options);
    if (hideResult === false || hideResult === null) return { activated: false, reason: "hide-cancelled" };
    const distance = halfCurrentSpeed(actor);
    const combat = game.combat;
    const effectData = {
      name: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Effect"),
      img: feature.img,
      origin: feature.uuid,
      disabled: false,
      transfer: false,
      statuses: [],
      changes: [],
      duration: combat ? { rounds: 1, turns: 1, startRound: combat.round, startTurn: combat.turn } : { seconds: 60, startTime: game.time.worldTime },
      flags: {
        [MODULE_ID]: {
          schemaVersion: 1,
          role: "disappearing-act-movement",
          movementAllowance: distance,
          opportunityAttacksSuppressedByRule: true,
          tokenUuid: token?.document?.uuid ?? token?.uuid ?? null,
          combatUuid: combat?.uuid ?? null,
          round: combat?.round ?? null,
          turn: combat?.turn ?? null,
        },
      },
    };
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData], { render: false });
    try {
      await feature.update({ "system.uses.spent": nextSpentValue(feature) }, { render: false, runythOrderAssassin1424Activation: true });
    } catch (error) {
      if (effect) await effect.delete({ render: false });
      throw error;
    }
    if (effect) this.#trackEffect(actor, effect, { outsideCombat: !combat });
    if (combat) this.lastCombatTurnKey = combatTurnKey(combat);
    try {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token?.document ?? token }),
        content: `<section class="runyth-order-class-assassin-1424-chat"><h3>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Title")}</h3><p>${game.i18n.format("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.Chat", { distance })}</p>${boundaryWarningParagraph("RUNYTH_ORDER_CLASS_ASSASSIN_1424.DisappearingAct.OABoundary")}</section>`,
        flags: { [MODULE_ID]: { action: "disappearing-act", actorUuid: actor.uuid, movementAllowance: distance } },
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Disappearing Act activated, but chat guidance could not be posted`, error);
    }
    return { activated: true, actorUuid: actor.uuid, movementAllowance: distance, effectUuid: effect?.uuid ?? null };
  }

  async onCombatUpdate(combat) {
    const next = combatTurnKey(combat);
    if (this.lastCombatTurnKey && next !== this.lastCombatTurnKey) await this.clearTemporaryEffects();
    this.lastCombatTurnKey = next;
  }

  #trackEffect(actor, effect, { outsideCombat }) {
    const effectUuid = effect.uuid ?? effect.id;
    const set = this.temporaryEffects.get(actor.uuid) ?? new Set();
    set.add(effectUuid);
    this.temporaryEffects.set(actor.uuid, set);
    if (!outsideCombat) return;
    const timer = setTimeout(() => void this.#expireEffect(actor.uuid, effectUuid), 60000);
    this.effectTimers.set(effectUuid, timer);
  }

  async #expireEffect(actorUuid, effectUuid) {
    this.#clearEffectTimer(effectUuid);
    const effect = await resolveUuidSafe(effectUuid);
    if (effect) await effect.delete({ render: false }).catch(() => {});
    const set = this.temporaryEffects.get(actorUuid);
    set?.delete(effectUuid);
    if (!set?.size) this.temporaryEffects.delete(actorUuid);
  }

  #clearEffectTimer(effectUuid) {
    const timer = this.effectTimers.get(effectUuid);
    if (timer) clearTimeout(timer);
    this.effectTimers.delete(effectUuid);
  }

  #clearPromptKey(key) {
    const timer = this.promptTimers.get(key);
    if (timer) clearTimeout(timer);
    this.promptTimers.delete(key);
    this.pendingPrompts.delete(key);
  }

  async clearTemporaryEffects() {
    for (const [actorUuid, effectUuids] of this.temporaryEffects) {
      const actor = await resolveUuidSafe(actorUuid);
      for (const effectUuid of effectUuids) this.#clearEffectTimer(effectUuid);
      if (!actor) continue;
      const ids = [...effectUuids].map((uuid) => String(uuid).split(".").pop());
      const existing = ids.filter((id) => actor.effects?.get?.(id));
      if (existing.length) await actor.deleteEmbeddedDocuments("ActiveEffect", existing, { render: false });
    }
    this.temporaryEffects.clear();
  }

  async clearActorEffects(actorUuid) {
    if (!actorUuid) return;
    const effectUuids = this.temporaryEffects.get(actorUuid) ?? new Set();
    const actor = await resolveUuidSafe(actorUuid);
    for (const effectUuid of effectUuids) this.#clearEffectTimer(effectUuid);
    if (actor) {
      const trackedIds = [...effectUuids].map((uuid) => String(uuid).split(".").pop());
      const roleIds = [...(actor.effects ?? [])]
        .filter((effect) => effect.getFlag?.(MODULE_ID, "role") === "disappearing-act-movement")
        .map((effect) => effect.id);
      const ids = [...new Set([...trackedIds, ...roleIds])].filter((id) => actor.effects?.get?.(id));
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids, { render: false });
    }
    this.temporaryEffects.delete(actorUuid);
  }

  clearActor(actorUuid) {
    if (!actorUuid) return;
    this.beforeHp.forEach((value, key) => {
      if (value.actorUuid === actorUuid) this.beforeHp.delete(key);
    });
    const effects = this.temporaryEffects.get(actorUuid) ?? new Set();
    for (const effectUuid of effects) this.#clearEffectTimer(effectUuid);
    this.temporaryEffects.delete(actorUuid);
  }

  async clear() {
    this.beforeHp.clear();
    for (const key of [...this.pendingPrompts]) this.#clearPromptKey(key);
    this.promptDialogs.clear();
    this.activationGate.clear();
    this.lastCombatTurnKey = null;
    await this.clearTemporaryEffects();
  }
}

export { actorToken, combatTurnKey, hpValue, incomingHp, performHide, resolveActorOrToken };
