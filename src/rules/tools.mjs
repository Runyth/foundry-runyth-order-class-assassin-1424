// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { TOOL_PROFICIENCIES } from "../constants.mjs";
import { unique } from "../util/objects.mjs";

export function normalizeTraitValues(value) {
  if (value instanceof Set) return [...value];
  if (Array.isArray(value)) return [...value];
  if (value && typeof value.values === "function") return [...value.values()];
  return [];
}

export function requiredToolProficiencies(current) {
  return unique([...normalizeTraitValues(current), TOOL_PROFICIENCIES.disguiseKit, TOOL_PROFICIENCIES.poisonersKit]).sort();
}

export function missingToolProficiencies(current) {
  const values = new Set(normalizeTraitValues(current));
  return [TOOL_PROFICIENCIES.disguiseKit, TOOL_PROFICIENCIES.poisonersKit].filter((key) => !values.has(key));
}
