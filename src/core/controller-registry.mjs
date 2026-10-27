// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { SOCKET } from "../constants.mjs";
import { selectControllingUser } from "../rules/controllers.mjs";

export class ControllerRegistry {
  #controlled = new Map();

  registerHooks() {
    Hooks.on("controlToken", (token, controlled) => {
      const tokenUuid = token?.document?.uuid ?? token?.uuid;
      if (!tokenUuid || !game.user?.id) return;
      game.socket.emit(SOCKET, { type: "token-control", userId: game.user.id, tokenUuid, controlled: Boolean(controlled) });
      this.record(game.user.id, tokenUuid, controlled);
    });
  }

  record(userId, tokenUuid, controlled) {
    if (!userId || !tokenUuid) return;
    const set = this.#controlled.get(tokenUuid) ?? new Set();
    if (controlled) set.add(userId);
    else set.delete(userId);
    if (set.size) this.#controlled.set(tokenUuid, set);
    else this.#controlled.delete(tokenUuid);
  }

  receive(payload) {
    if (payload?.type === "token-control") this.record(payload.userId, payload.tokenUuid, payload.controlled);
  }

  select({ actor, token = null }) {
    const tokenUuid = token?.document?.uuid ?? token?.uuid ?? null;
    const controlling = tokenUuid ? [...(this.#controlled.get(tokenUuid) ?? [])] : [];
    const active = game.users?.filter?.((user) => user.active) ?? [];
    const preferred = controlling.find((id) => active.some((user) => user.id === id));
    if (preferred) return preferred;
    return selectControllingUser({ actor, users: active });
  }

  clear() {
    this.#controlled.clear();
  }
}
