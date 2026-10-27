// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, stat } from "node:fs/promises";
import { dirname, posix, resolve, sep } from "node:path";
import { readJson } from "./files.mjs";

function normalizeLocalAsset(path, label) {
  const value = String(path ?? "").trim().replaceAll("\\", "/");
  if (!value) throw new Error(`${label} contains an empty runtime asset path.`);
  if (/^[a-z]+:/iu.test(value) || value.startsWith("//")) {
    throw new Error(`${label} must reference a module-local runtime asset, received ${value}.`);
  }
  const normalized = posix.normalize(value).replace(/^\.\//u, "");
  if (normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new Error(`${label} escapes the module root: ${value}.`);
  }
  return normalized;
}

function addList(target, values, label) {
  for (const value of values ?? []) {
    if (typeof value !== "string") throw new Error(`${label} entries must be strings.`);
    target.add(normalizeLocalAsset(value, label));
  }
}

export function collectManifestRuntimeAssets(manifest) {
  const assets = new Set(["module.json"]);
  addList(assets, manifest.esmodules, "module.json esmodules");
  addList(assets, manifest.scripts, "module.json scripts");
  addList(assets, manifest.styles, "module.json styles");

  for (const language of manifest.languages ?? []) {
    if (!language?.path) throw new Error("Each module.json language entry must declare path.");
    assets.add(normalizeLocalAsset(language.path, "module.json language path"));
  }
  for (const pack of manifest.packs ?? []) {
    if (!pack?.path) throw new Error("Each module.json pack entry must declare path.");
    assets.add(normalizeLocalAsset(pack.path, "module.json pack path"));
  }
  return [...assets].sort();
}

async function collectCssReferences(runtimeRoot, styles) {
  const discovered = new Set();
  for (const style of styles ?? []) {
    const normalizedStyle = normalizeLocalAsset(style, "module.json styles");
    const css = await readFile(resolve(runtimeRoot, normalizedStyle), "utf8");
    const base = posix.dirname(normalizedStyle);
    for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/giu)) {
      const reference = match[2].trim();
      if (!reference || reference.startsWith("data:") || reference.startsWith("#") || /^[a-z]+:/iu.test(reference) || reference.startsWith("//")) continue;
      discovered.add(normalizeLocalAsset(posix.join(base, reference), `CSS reference from ${normalizedStyle}`));
    }
  }
  return discovered;
}

async function collectModuleReferences(runtimeRoot, manifest) {
  const discovered = new Set();
  const modulePaths = [...(manifest.esmodules ?? []), ...(manifest.scripts ?? [])];
  for (const modulePath of modulePaths) {
    const normalizedModule = normalizeLocalAsset(modulePath, "module.json JavaScript entry");
    const source = await readFile(resolve(runtimeRoot, normalizedModule), "utf8");
    const dynamicPrefix = "modules/${MODULE_ID}/";
    const literalPrefix = `modules/${manifest.id}/`;
    for (const prefix of [dynamicPrefix, literalPrefix]) {
      let from = 0;
      while (true) {
        const index = source.indexOf(prefix, from);
        if (index < 0) break;
        const start = index + prefix.length;
        let end = start;
        while (end < source.length && !/[`"'\s)<>]/u.test(source[end])) end += 1;
        if (end > start) discovered.add(normalizeLocalAsset(source.slice(start, end), `runtime reference from ${normalizedModule}`));
        from = end;
      }
    }
  }
  return discovered;
}

export async function collectRequiredRuntimeAssets({ runtimeRoot, manifest, projectRoot }) {
  const required = new Set(collectManifestRuntimeAssets(manifest));
  const configRoot = projectRoot ?? runtimeRoot;
  const extra = await readJson(resolve(configRoot, "runtime-assets.json")).catch(() => ({ required: [] }));
  if (extra.schemaVersion !== undefined && extra.schemaVersion !== 1) {
    throw new Error(`Unsupported runtime-assets.json schemaVersion ${extra.schemaVersion}.`);
  }
  addList(required, extra.required, "runtime-assets.json required");

  for (const path of await collectCssReferences(runtimeRoot, manifest.styles)) required.add(path);
  for (const path of await collectModuleReferences(runtimeRoot, manifest)) required.add(path);
  return [...required].sort();
}

export async function validateRuntimeTree({ runtimeRoot, manifest, projectRoot }) {
  const assets = await collectRequiredRuntimeAssets({ runtimeRoot, manifest, projectRoot });
  const missing = [];
  for (const asset of assets) {
    const absolute = resolve(runtimeRoot, asset);
    const relative = absolute.slice(resolve(runtimeRoot).length + 1).split(sep).join("/");
    if (relative !== asset) {
      throw new Error(`Runtime asset normalization mismatch for ${asset}.`);
    }
    const metadata = await stat(absolute).catch(() => null);
    if (!metadata?.isFile()) missing.push(asset);
  }
  if (missing.length) throw new Error(`Runtime tree is missing required asset(s): ${missing.join(", ")}.`);
  return { assets, missing: [] };
}

export function validateRuntimeArchiveEntries({ entries, moduleId, requiredAssets }) {
  const entrySet = new Set(entries);
  const missing = requiredAssets.filter((asset) => !entrySet.has(`${moduleId}/${asset}`));
  if (missing.length) throw new Error(`Install archive is missing required runtime asset(s): ${missing.join(", ")}.`);
  return { assets: [...requiredAssets], missing: [] };
}
