// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { createHash } from "node:crypto";

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (key === "_key") continue;
    if (key === "contentHash") continue;
    if ((key === "checksum" || key === "importedAt") && value.providerId === "runyth-order-class-assassin-1424") continue;
    result[key] = scrub(child);
  }
  return result;
}

export function canonicalContentPayload(document) {
  return JSON.stringify(scrub(document));
}

export function canonicalContentHash(document) {
  return createHash("sha256").update(canonicalContentPayload(document)).digest("hex");
}

export function embeddedEffectHash(effect) {
  return createHash("sha256").update(JSON.stringify(scrub(effect))).digest("hex");
}
