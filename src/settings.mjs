// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "./constants.mjs";

export const SETTINGS = Object.freeze({
  managerPosition: "managerPosition",
  showSheetControls: "showSheetControls",
  showBoundaryWarnings: "showBoundaryWarnings",
  exposeSubclassInPicker: "exposeSubclassInPicker",
});

export function registerSettings({ ManagerClass }) {
  game.settings.register(MODULE_ID, SETTINGS.managerPosition, {
    scope: "client",
    config: false,
    type: Object,
    default: {},
  });
  game.settings.register(MODULE_ID, SETTINGS.showSheetControls, {
    name: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ShowSheetControls.Name",
    hint: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ShowSheetControls.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, SETTINGS.showBoundaryWarnings, {
    name: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ShowBoundaryWarnings.Name",
    hint: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ShowBoundaryWarnings.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, SETTINGS.exposeSubclassInPicker, {
    name: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ExposeSubclassInPicker.Name",
    hint: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.ExposeSubclassInPicker.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });
  game.settings.registerMenu(MODULE_ID, "openManager", {
    name: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.OpenManager.Name",
    hint: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.OpenManager.Hint",
    label: "RUNYTH_ORDER_CLASS_ASSASSIN_1424.Settings.OpenManager.Label",
    icon: "fa-solid fa-user-ninja",
    type: ManagerClass,
    restricted: false,
  });
}
