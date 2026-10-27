// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { IDENTIFIERS } from "../constants.mjs";
import { hasFeature, isSteadyAim } from "../rules/identity.mjs";
import { removeSteadyAimSpeedZero } from "../rules/speeds.mjs";
import { getProperty } from "../util/objects.mjs";

function activityFromArgs(args) {
  return args.find((arg) => arg?.item && (arg?.type || arg?.constructor?.metadata?.type))
    ?? args.find((arg) => arg?.subject?.item)?.subject
    ?? null;
}

function actorFromActivity(activity) {
  return activity?.item?.actor ?? activity?.actor ?? null;
}

function resolveOrigin(data, effect) {
  const origin = data?.origin ?? effect?.origin;
  if (!origin || !globalThis.fromUuidSync) return null;
  try {
    return fromUuidSync(origin);
  } catch {
    return null;
  }
}

function deleteMovementZero(update) {
  let changed = false;
  for (const path of ["system.attributes.movement.walk", "system.attributes.movement.all"]) {
    if (Object.hasOwn(update, path) && Number(update[path]) === 0) {
      delete update[path];
      changed = true;
    }
  }
  const movement = getProperty(update, "system.attributes.movement");
  if (movement && Number(movement.walk) === 0) {
    delete movement.walk;
    changed = true;
  }
  if (movement && Number(movement.all) === 0) {
    delete movement.all;
    changed = true;
  }
  return changed;
}

export class SteadyAimAutomation {
  constructor() {
    this.markers = new Map();
  }

  registerHooks() {
    Hooks.on("dnd5e.preUseActivity", (...args) => this.markActivity(...args));
    Hooks.on("dnd5e.postUseActivity", (...args) => this.finishActivity(...args));
    Hooks.on("preCreateActiveEffect", (effect, data) => this.filterEffect(effect, data));
    Hooks.on("preUpdateActiveEffect", (effect, changes) => this.filterEffect(effect, changes));
    Hooks.on("preUpdateActor", (actor, changes) => this.filterActorUpdate(actor, changes));
    Hooks.on("deleteActor", (actor) => this.markers.delete(actor?.uuid));
  }

  markActivity(...args) {
    const activity = activityFromArgs(args);
    const actor = actorFromActivity(activity);
    if (!actor || !hasFeature(actor, IDENTIFIERS.infiltrationExpertise) || !isSteadyAim(activity)) return;
    this.markers.set(actor.uuid, Date.now() + 5000);
  }

  finishActivity(...args) {
    const activity = activityFromArgs(args);
    const actor = actorFromActivity(activity);
    if (!actor?.uuid || !isSteadyAim(activity)) return;
    setTimeout(() => this.markers.delete(actor.uuid), 1000);
  }

  markerActive(actor) {
    const expiry = this.markers.get(actor?.uuid);
    if (!expiry) return false;
    if (expiry < Date.now()) {
      this.markers.delete(actor.uuid);
      return false;
    }
    return true;
  }

  filterEffect(effect, data) {
    const actor = effect?.parent?.documentName === "Actor" ? effect.parent : effect?.parent?.actor ?? null;
    if (!actor || !hasFeature(actor, IDENTIFIERS.infiltrationExpertise)) return;
    const originUuid = data?.origin ?? effect?.origin;
    const origin = resolveOrigin(data, effect);
    const originIsSteadyAim = isSteadyAim(origin) || isSteadyAim(origin?.item);
    if (originUuid && !originIsSteadyAim) return;
    if (!originUuid && !this.markerActive(actor)) return;
    if (Array.isArray(data?.changes)) data.changes = removeSteadyAimSpeedZero(data.changes);
  }

  filterActorUpdate(actor, changes) {
    if (!hasFeature(actor, IDENTIFIERS.infiltrationExpertise) || !this.markerActive(actor)) return;
    deleteMovementZero(changes);
  }

  clear() {
    this.markers.clear();
  }
}

export { deleteMovementZero };
