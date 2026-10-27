// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../constants.mjs";
import { SETTINGS } from "../settings.mjs";

export function boundaryWarningsEnabled() {
  try {
    return game.settings.get(MODULE_ID, SETTINGS.showBoundaryWarnings) !== false;
  } catch {
    return true;
  }
}

export function boundaryWarningParagraph(localizationKey) {
  if (!boundaryWarningsEnabled()) return "";
  return `<p>${game.i18n.localize(localizationKey)}</p>`;
}
