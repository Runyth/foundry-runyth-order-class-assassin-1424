// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function numericSpeed(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function halfCurrentSpeed(actor) {
  return numericSpeed(actor?.system?.attributes?.movement?.walk) / 2;
}

export function synchronizeDerivedClimb(actor) {
  const movement = actor?.system?.attributes?.movement;
  if (!movement) return false;
  const walk = numericSpeed(movement.walk);
  if (movement.climb === walk) return false;
  movement.climb = walk;
  return true;
}

export function isWalkZeroChange(change) {
  const key = String(change?.key ?? "");
  const value = Number(change?.value);
  return value === 0 && ["system.attributes.movement.walk", "system.attributes.movement.all"].includes(key);
}

export function removeSteadyAimSpeedZero(changes) {
  return (changes ?? []).filter((change) => !isWalkZeroChange(change));
}
