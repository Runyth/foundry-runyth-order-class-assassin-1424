// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function maximumUses(item) {
  const value = Number(item?.system?.uses?.max);
  return Number.isFinite(value) ? value : 0;
}

export function spentUses(item) {
  const value = Number(item?.system?.uses?.spent);
  return Number.isFinite(value) ? value : 0;
}

export function remainingUses(item) {
  return Math.max(0, maximumUses(item) - spentUses(item));
}

export function nextSpentValue(item) {
  if (remainingUses(item) <= 0) throw new Error("No uses remain.");
  return spentUses(item) + 1;
}
