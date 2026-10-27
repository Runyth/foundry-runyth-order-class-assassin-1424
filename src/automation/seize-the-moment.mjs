// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { IDENTIFIERS, MODULE_ID } from "../constants.mjs";
import { currentUserIsAuthority } from "../core/authority.mjs";
import { findItem, hasFeature, isSneakAttack } from "../rules/identity.mjs";
import { sameTurn, turnIdentity, TurnStateStore } from "../rules/turn-state.mjs";
import { nextSpentValue, remainingUses } from "../rules/uses.mjs";
import { KeyedOperationGate, resolveUuidSafe } from "../util/async.mjs";
import { askYesNo, notify } from "../ui/dialogs.mjs";
import { boundaryWarningParagraph } from "../ui/chat-guidance.mjs";
import { resolveActorOrToken } from "./disappearing-act.mjs";

function activityFromArgs(args) {
  return args.find((arg) => arg?.item && (arg?.type || arg?.constructor?.metadata?.type))
    ?? args.find((arg) => arg?.subject?.item)?.subject
    ?? null;
}

function actorFromActivity(activity) {
  return activity?.item?.actor ?? activity?.actor ?? null;
}

function currentIdentityFor(actor) {
  const combat = game.combat;
  if (!combat || !actor) return null;
  const currentActor = combat.combatant?.actor ?? null;
  if (currentActor?.uuid !== actor.uuid) return null;
  return turnIdentity(combat, actor.uuid);
}

function normalUseKey(identity) {
  return identity ? `${identity.actorUuid}|${identity.combatUuid}|${identity.round}|${identity.turn}` : null;
}

export class SeizeTheMomentAutomation {
  constructor({ socket, controllers }) {
    this.socket = socket;
    this.controllers = controllers;
    this.states = new TurnStateStore();
    this.normalSneakUses = new Map();
    this.effectByActor = new Map();
    this.lastTurn = null;
    this.promptedTurns = new Set();
    this.promptDialogs = new Set();
    this.activationGate = new KeyedOperationGate();
  }

  registerHooks() {
    Hooks.on("updateCombat", (combat) => void this.onTurnUpdate(combat));
    Hooks.on("deleteCombat", (combat) => void this.clearCombat(combat?.uuid ?? combat?.id));
    Hooks.on("deleteActor", (actor) => void this.clearActor(actor?.uuid));
    Hooks.on("deleteToken", (token) => void this.clearActor(token?.actor?.uuid));
    Hooks.on("dnd5e.preUseActivity", (...args) => this.beforeActivity(...args));
    Hooks.on("dnd5e.postUseActivity", (...args) => this.afterActivity(...args));
    Hooks.on("dnd5e.restCompleted", (actor) => void this.clearActor(actor?.uuid));
    this.socket.on("prompt-seize-the-moment", (payload) => void this.receivePrompt(payload));
  }

  async initialize() {
    if (!game.user?.isGM) return;
    for (const actor of allWorldAndSyntheticActors()) {
      const stale = actor.getFlag?.(MODULE_ID, "seizeTheMoment");
      if (stale) await actor.unsetFlag(MODULE_ID, "seizeTheMoment");
      const effectIds = [...(actor.effects ?? [])]
        .filter((effect) => effect.getFlag?.(MODULE_ID, "role") === "seize-the-moment")
        .map((effect) => effect.id);
      if (effectIds.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds, { render: false });
    }
  }

  beforeActivity(...args) {
    const activity = activityFromArgs(args);
    if (!isSneakAttack(activity)) return;
    const actor = actorFromActivity(activity);
    const identity = currentIdentityFor(actor);
    if (!identity) return;
    const state = this.states.get(actor.uuid);
    if (!sameTurn(state, identity)) return;
    if (state.sneakAttackUses >= 2) {
      notify("warn", "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.ThirdRejected");
      return false;
    }
  }

  afterActivity(...args) {
    const activity = activityFromArgs(args);
    if (!isSneakAttack(activity)) return;
    const actor = actorFromActivity(activity);
    const identity = currentIdentityFor(actor);
    if (!identity) return;
    const state = this.states.get(actor.uuid);
    if (sameTurn(state, identity)) {
      this.states.recordSneakAttack(identity);
      return;
    }
    const key = normalUseKey(identity);
    this.normalSneakUses.set(key, Math.min(1, (this.normalSneakUses.get(key) ?? 0) + 1));
  }

  async onTurnUpdate(combat) {
    const identity = turnIdentity(combat);
    if (!identity?.actorUuid || identity.turn < 0) {
      await this.clearCombat(combat?.uuid ?? combat?.id);
      return;
    }
    if (!sameTurn(this.lastTurn, identity)) {
      await this.clearExpired(identity);
      this.lastTurn = identity;
    }
    const actor = combat.combatant?.actor;
    if (!actor || !currentUserIsAuthority(actor)) return;
    if (!hasFeature(actor, IDENTIFIERS.seizeTheMoment)) return;
    const feature = findItem(actor, IDENTIFIERS.seizeTheMoment);
    if (!feature || remainingUses(feature) <= 0) return;
    const promptKey = normalUseKey(identity);
    if (this.promptedTurns.has(promptKey)) return;
    const token = combat.combatant?.token?.object ?? combat.combatant?.token ?? null;
    const userId = this.controllers.select({ actor, token });
    if (!userId) return;
    this.promptedTurns.add(promptKey);
    this.socket.emit("prompt-seize-the-moment", {
      userId,
      actorUuid: actor.uuid,
      tokenUuid: token?.document?.uuid ?? token?.uuid ?? null,
      identity,
    });
  }

  async receivePrompt(payload) {
    const promptKey = normalUseKey(payload?.identity);
    if (payload?.userId !== game.user?.id || !promptKey || this.promptDialogs.has(promptKey)) return;
    this.promptDialogs.add(promptKey);
    try {
      const actor = await resolveUuidSafe(payload.actorUuid);
      if (!actor) return;
      const current = currentIdentityFor(actor);
      if (!sameTurn(current, payload.identity)) return;
      const feature = findItem(actor, IDENTIFIERS.seizeTheMoment);
      if (!feature || remainingUses(feature) <= 0) return;
      const yes = await askYesNo({
        title: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Title"),
        content: `<p>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Question")}</p>`,
        yesLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.Yes"),
        noLabel: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Common.No"),
      });
      if (!yes) return;
      const token = await resolveUuidSafe(payload.tokenUuid);
      await this.activate(token ?? actor, { prompted: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Seize the Moment failed`, error);
      notify("error", "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Failed", { error: error.message });
    } finally {
      this.promptDialogs.delete(promptKey);
    }
  }

  async activate(actorOrToken, _options = {}) {
    const resolved = await resolveActorOrToken(actorOrToken);
    if (!resolved.actor) throw new TypeError("Seize the Moment requires an Actor or Token.");
    return this.activationGate.run(resolved.actor.uuid, () => this.#activateResolved(resolved));
  }

  async #activateResolved({ actor, token }) {
    const identity = currentIdentityFor(actor);
    if (!identity) throw new Error(game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.RequiresTurn"));
    const feature = findItem(actor, IDENTIFIERS.seizeTheMoment);
    if (!feature) throw new Error("The Seize the Moment feature is missing.");
    if (remainingUses(feature) <= 0) throw new Error("Seize the Moment has no remaining uses.");
    if (sameTurn(this.states.get(actor.uuid), identity)) return { activated: false, reason: "already-active", state: this.states.get(actor.uuid) };

    const previousSpent = Number(feature.system?.uses?.spent ?? 0) || 0;
    const effectData = {
      name: game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Effect"),
      img: feature.img,
      origin: feature.uuid,
      disabled: false,
      transfer: false,
      statuses: [],
      changes: [],
      duration: { rounds: 1, turns: 1, startRound: identity.round, startTurn: identity.turn },
      flags: { [MODULE_ID]: { schemaVersion: 1, role: "seize-the-moment", ...identity, extraAttackAction: 1, maximumSneakAttacks: 2 } },
    };
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData], { render: false });
    let state = null;
    try {
      await feature.update({ "system.uses.spent": nextSpentValue(feature) }, { render: false, runythOrderAssassin1424Activation: true });
      const previousSneakUses = this.normalSneakUses.get(normalUseKey(identity)) ?? 0;
      state = this.states.activate(identity, { sneakAttackUses: previousSneakUses });
      this.effectByActor.set(actor.uuid, effect?.uuid ?? null);
      await actor.setFlag(MODULE_ID, "seizeTheMoment", state);
    } catch (error) {
      this.states.clearActor(actor.uuid);
      this.effectByActor.delete(actor.uuid);
      if (effect) await effect.delete({ render: false }).catch(() => {});
      await feature.update({ "system.uses.spent": previousSpent }, { render: false, runythOrderAssassin1424Rollback: true }).catch(() => {});
      throw error;
    }
    try {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor, token: token?.document ?? token }),
        content: `<section class="runyth-order-class-assassin-1424-chat"><h3>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Title")}</h3><p>${game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.Chat")}</p>${boundaryWarningParagraph("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Seize.ActionBoundary")}</section>`,
        flags: { [MODULE_ID]: { action: "seize-the-moment", ...identity } },
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Seize the Moment activated, but chat guidance could not be posted`, error);
    }
    return { activated: true, state };
  }

  async clearExpired(currentIdentity) {
    for (const state of this.states.snapshot()) {
      if (sameTurn(state, currentIdentity)) continue;
      await this.clearActor(state.actorUuid);
    }
    const currentKey = normalUseKey(currentIdentity);
    for (const key of [...this.normalSneakUses.keys()]) if (key !== currentKey) this.normalSneakUses.delete(key);
    for (const key of [...this.promptedTurns]) if (key !== currentKey) this.promptedTurns.delete(key);
  }

  async clearActor(actorUuid) {
    if (!actorUuid) return;
    this.states.clearActor(actorUuid);
    const actor = await resolveUuidSafe(actorUuid);
    if (actor?.getFlag?.(MODULE_ID, "seizeTheMoment")) await actor.unsetFlag(MODULE_ID, "seizeTheMoment");
    const effectUuid = this.effectByActor.get(actorUuid);
    if (effectUuid) {
      const effect = await resolveUuidSafe(effectUuid);
      if (effect) await effect.delete({ render: false });
    } else if (actor) {
      const ids = [...(actor.effects ?? [])]
        .filter((effect) => effect.getFlag?.(MODULE_ID, "role") === "seize-the-moment")
        .map((effect) => effect.id);
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids, { render: false });
    }
    this.effectByActor.delete(actorUuid);
  }

  async clearCombat(combatUuid) {
    for (const state of this.states.snapshot()) {
      if (!combatUuid || state.combatUuid === combatUuid) await this.clearActor(state.actorUuid);
    }
    this.states.clearCombat(combatUuid);
    for (const key of [...this.normalSneakUses.keys()]) if (!combatUuid || key.includes(`|${combatUuid}|`)) this.normalSneakUses.delete(key);
    this.promptedTurns.clear();
    this.promptDialogs.clear();
    if (!combatUuid || this.lastTurn?.combatUuid === combatUuid) this.lastTurn = null;
  }

  getState(actor) {
    return this.states.get(actor?.uuid ?? actor) ?? null;
  }

  async clear() {
    const actorUuids = new Set([
      ...this.states.snapshot().map((state) => state.actorUuid),
      ...this.effectByActor.keys(),
    ]);
    for (const actorUuid of actorUuids) await this.clearActor(actorUuid);
    this.states.clear();
    this.normalSneakUses.clear();
    this.effectByActor.clear();
    this.promptedTurns.clear();
    this.promptDialogs.clear();
    this.activationGate.clear();
    this.lastTurn = null;
  }
}

export function allWorldAndSyntheticActors() {
  const actors = new Map();
  for (const actor of game.actors ?? []) if (actor?.uuid) actors.set(actor.uuid, actor);
  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens ?? []) {
      const actor = token?.actor;
      if (actor?.uuid) actors.set(actor.uuid, actor);
    }
  }
  return [...actors.values()];
}

export { currentIdentityFor, activityFromArgs, normalUseKey };
