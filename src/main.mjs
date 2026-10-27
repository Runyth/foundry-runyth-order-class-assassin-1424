// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { Assassin1424Api, publicApiShape } from "./api.mjs";
import { DisappearingActAutomation } from "./automation/disappearing-act.mjs";
import { RooftopPursuitAutomation } from "./automation/rooftop-pursuit.mjs";
import { SeizeTheMomentAutomation } from "./automation/seize-the-moment.mjs";
import { SteadyAimAutomation } from "./automation/steady-aim.mjs";
import { getCatalog } from "./content/catalog.mjs";
import { prepareSubclassDiscovery } from "./integration/subclass-discovery.mjs";
import { ControllerRegistry } from "./core/controller-registry.mjs";
import { ProviderRegistration } from "./core/provider-registration.mjs";
import { ModuleSocket } from "./core/socket.mjs";
import { CORE_ID, DND5E_VERSION, MODULE_ID, MODULE_TITLE } from "./constants.mjs";
import { registerSettings, SETTINGS } from "./settings.mjs";
import { Assassin1424Manager } from "./ui/manager.mjs";
import { registerSheetControls } from "./ui/sheet-controls.mjs";

const CORE_API_READY_HOOK = `${CORE_ID}.apiReady`;

let api;
let publicApi;
let manager;
let controllers;
let socket;
let automations;
let providerRegistration;
let runtimeHooksRegistered = false;
let initializationError = null;

function openManager(options = {}) {
  const { actor = null, ...applicationOptions } = options;
  const stored = game.settings.get(MODULE_ID, SETTINGS.managerPosition) ?? {};
  if (!manager) {
    manager = new Assassin1424Manager({
      ...applicationOptions,
      actor,
      position: { ...stored, ...(applicationOptions.position ?? {}) },
      onClose: (closed) => {
        if (manager === closed) manager = null;
      },
    });
  } else if (actor) {
    manager.setActor(actor);
  }
  if (manager.rendered) {
    void manager.render({ force: true });
    manager.bringToFront();
  } else void manager.render({ force: true });
  return manager;
}

function reportInitializationFailure(error, { notify = false } = {}) {
  initializationError = error;
  console.error(`${MODULE_TITLE} | Initialization failed`, error);
  if (notify) ui.notifications?.error?.(`${MODULE_TITLE}: ${error.message}`, { permanent: true });
}

function registerRuntimeHooks() {
  if (runtimeHooksRegistered) return;
  socket.on("token-control", (payload) => controllers.receive(payload));
  socket.register();
  controllers.registerHooks();
  for (const automation of Object.values(automations)) automation.registerHooks();
  registerSheetControls({ api: publicApi });
  runtimeHooksRegistered = true;
}

function completeProviderInitialization(core = game.modules.get(CORE_ID)?.api ?? null) {
  const provider = providerRegistration.register(core);
  registerRuntimeHooks();
  initializationError = null;
  console.info(`${MODULE_TITLE} | Provider ${provider.id} v${provider.version} registered.`);
  return provider;
}

Hooks.once("init", () => {
  try {
    registerSettings({ ManagerClass: Assassin1424Manager });
    socket = new ModuleSocket();
    controllers = new ControllerRegistry();
    const steadyAim = new SteadyAimAutomation();
    const rooftopPursuit = new RooftopPursuitAutomation();
    const disappearingAct = new DisappearingActAutomation({ socket, controllers });
    const seizeTheMoment = new SeizeTheMomentAutomation({ socket, controllers });
    automations = { steadyAim, rooftopPursuit, disappearingAct, seizeTheMoment };

    api = new Assassin1424Api({ disappearingAct, seizeTheMoment, automations: Object.values(automations) });
    api.setManagerOpener(openManager);
    publicApi = publicApiShape(api);
    api.setPublicApi(publicApi);
    const module = game.modules.get(MODULE_ID);
    if (!module) throw new Error(`Module record ${MODULE_ID} is unavailable.`);
    module.api = publicApi;

    providerRegistration = new ProviderRegistration({ catalog: getCatalog() });
    const core = game.modules.get(CORE_ID)?.api ?? null;
    if (core) completeProviderInitialization(core);
    else {
      Hooks.once(CORE_API_READY_HOOK, (coreApi) => {
        try {
          completeProviderInitialization(coreApi);
        } catch (error) {
          reportInitializationFailure(error);
        }
      });
    }

    console.info(`${MODULE_TITLE} | API ${api.apiVersion} initialized.`);
  } catch (error) {
    reportInitializationFailure(error);
  }
});

Hooks.once("ready", async () => {
  if (!api || !providerRegistration) return;
  try {
    if (!providerRegistration.isRegistered()) completeProviderInitialization();
    if (!runtimeHooksRegistered) throw new Error("Runtime hooks were not registered after provider registration.");
    if (game.system?.version !== DND5E_VERSION) {
      throw new Error(game.i18n.format("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Errors.UnsupportedSystem", { expected: DND5E_VERSION, actual: game.system?.version ?? "unknown" }));
    }
    const discovery = await prepareSubclassDiscovery();
    if (!discovery.available) {
      ui.notifications?.error?.(game.i18n.localize("RUNYTH_ORDER_CLASS_ASSASSIN_1424.Errors.SubclassUnavailable"), { permanent: true });
      console.error(`${MODULE_TITLE} | Subclass compendium is indexed but unavailable to this user.`, discovery);
    } else {
      console.info(`${MODULE_TITLE} | Assassin 1424 subclass is available through the normal Rogue Advancement picker.`);
    }
    await automations.seizeTheMoment.initialize();
    api.markReady();
    console.info(`${MODULE_TITLE} | Ready with provider ${MODULE_ID} registered.`);
  } catch (error) {
    reportInitializationFailure(initializationError ?? providerRegistration.error ?? error, { notify: true });
  }
});

Hooks.once("shutdown", () => {
  void manager?.close().catch(() => {});
  manager = null;
  void api?.shutdown();
  socket?.clear?.();
  controllers?.clear?.();
  runtimeHooksRegistered = false;
});
