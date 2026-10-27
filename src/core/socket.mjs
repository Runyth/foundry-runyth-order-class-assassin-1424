// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_TITLE, SOCKET } from "../constants.mjs";

export class ModuleSocket {
  #handlers = new Map();
  #listener = null;

  on(type, handler) {
    if (!type || typeof handler !== "function") throw new TypeError("Socket handlers require a type and callback.");
    this.#handlers.set(type, handler);
  }

  register() {
    if (this.#listener) return;
    this.#listener = async (payload) => {
      if (!payload || typeof payload !== "object" || typeof payload.type !== "string") return;
      const handler = this.#handlers.get(payload.type);
      if (!handler) return;
      try {
        await handler(payload);
      } catch (error) {
        console.error(`${MODULE_TITLE} | Socket handler ${payload.type} failed`, error);
      }
    };
    game.socket.on(SOCKET, this.#listener);
  }

  emit(type, data = {}) {
    if (!type || typeof type !== "string") throw new TypeError("Socket messages require a type.");
    game.socket.emit(SOCKET, { type, ...data });
  }

  clear() {
    if (this.#listener && typeof game.socket?.off === "function") game.socket.off(SOCKET, this.#listener);
    this.#listener = null;
    this.#handlers.clear();
  }
}
