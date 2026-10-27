// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function getProperty(object, path) {
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(object, path);
  return String(path).split(".").reduce((value, key) => value?.[key], object);
}

export function setProperty(object, path, value) {
  if (globalThis.foundry?.utils?.setProperty) return foundry.utils.setProperty(object, path, value);
  const parts = String(path).split(".");
  const last = parts.pop();
  let target = object;
  for (const part of parts) target = target[part] ??= {};
  target[last] = value;
  return true;
}

export function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

export function asArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return [...collection.values()];
  return [...collection];
}

export function unique(values) {
  return [...new Set(values)];
}

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function selectedActor() {
  return globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? globalThis.game?.user?.character ?? null;
}
