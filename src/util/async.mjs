// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export async function resolveUuidSafe(uuid, resolver = globalThis.fromUuid) {
  if (!uuid || typeof resolver !== "function") return null;
  try {
    return await resolver(uuid);
  } catch {
    return null;
  }
}

export class KeyedOperationGate {
  #operations = new Map();

  run(key, operation) {
    if (!key) throw new TypeError("A non-empty operation key is required.");
    const existing = this.#operations.get(key);
    if (existing) return existing;
    const pending = Promise.resolve().then(operation);
    this.#operations.set(key, pending);
    void pending.finally(() => {
      if (this.#operations.get(key) === pending) this.#operations.delete(key);
    }).catch(() => {});
    return pending;
  }

  has(key) {
    return this.#operations.has(key);
  }

  clear() {
    this.#operations.clear();
  }
}
