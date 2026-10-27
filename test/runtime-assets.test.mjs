// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  collectManifestRuntimeAssets,
  validateRuntimeArchiveEntries,
  validateRuntimeTree,
} from "../tools/lib/runtime-assets.mjs";

const manifest = {
  id: "runyth-order-class-assassin-1424",
  esmodules: ["src/main.mjs"],
  scripts: [],
  styles: ["styles/module.css"],
  languages: [{ lang: "en", path: "lang/en.json" }],
  packs: [{ name: "features", path: "packs/features.db" }],
};

test("manifest runtime inventory includes every declared local asset", () => {
  assert.deepEqual(collectManifestRuntimeAssets(manifest), [
    "lang/en.json",
    "module.json",
    "packs/features.db",
    "src/main.mjs",
    "styles/module.css",
  ]);
});

test("runtime tree validation discovers templates and CSS assets and fails closed when missing", async () => {
  const root = await mkdtemp(resolve(os.tmpdir(), "assassin-1424-assets-"));
  try {
    for (const directory of ["src", "styles", "lang", "packs", "templates", "assets"]) {
      await mkdir(resolve(root, directory), { recursive: true });
    }
    await writeFile(resolve(root, "module.json"), "{}\n");
    await writeFile(resolve(root, "src/main.mjs"), "const MODULE_ID = 'runyth-order-class-assassin-1424'; const p = `modules/${MODULE_ID}/templates/manager.hbs`;\n");
    await writeFile(resolve(root, "styles/module.css"), ".icon { background-image: url('../assets/icon.svg'); }\n");
    await writeFile(resolve(root, "lang/en.json"), "{}\n");
    await writeFile(resolve(root, "packs/features.db"), "{}\n");
    await writeFile(resolve(root, "templates/manager.hbs"), "<p>Manager</p>\n");
    await writeFile(resolve(root, "assets/icon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>\n");
    await writeFile(resolve(root, "runtime-assets.json"), '{"schemaVersion":1,"required":[]}\n');

    const result = await validateRuntimeTree({ runtimeRoot: root, manifest, projectRoot: root });
    assert.ok(result.assets.includes("templates/manager.hbs"));
    assert.ok(result.assets.includes("assets/icon.svg"));

    await rm(resolve(root, "templates/manager.hbs"));
    await assert.rejects(
      validateRuntimeTree({ runtimeRoot: root, manifest, projectRoot: root }),
      /missing required asset.*templates\/manager\.hbs/iu,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("install archive validation requires exact module-root asset paths", () => {
  const requiredAssets = ["module.json", "src/main.mjs", "styles/module.css"];
  assert.deepEqual(
    validateRuntimeArchiveEntries({
      entries: requiredAssets.map((path) => `${manifest.id}/${path}`),
      moduleId: manifest.id,
      requiredAssets,
    }).missing,
    [],
  );
  assert.throws(
    () => validateRuntimeArchiveEntries({
      entries: [`${manifest.id}/module.json`, `${manifest.id}/styles/module.css`],
      moduleId: manifest.id,
      requiredAssets,
    }),
    /src\/main\.mjs/u,
  );
});
