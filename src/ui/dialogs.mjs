// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE } from "../constants.mjs";

export async function askYesNo({ title = MODULE_TITLE, content, yesLabel, noLabel }) {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.confirm) throw new Error("Foundry V13 DialogV2 is unavailable.");
  const result = await DialogV2.confirm({
    classes: [MODULE_ID, "runyth-order-class-assassin-1424-prompt-dialog"],
    window: { title },
    content: `<div class="runyth-order-class-assassin-1424-prompt">${content}</div>`,
    yes: { label: yesLabel, icon: "fa-solid fa-check", default: true },
    no: { label: noLabel, icon: "fa-solid fa-xmark" },
    modal: true,
    rejectClose: false,
  });
  return result === true;
}

export function notify(level, key, data = {}) {
  const text = globalThis.game?.i18n?.format?.(key, data) ?? key;
  globalThis.ui?.notifications?.[level]?.(text);
  return text;
}
