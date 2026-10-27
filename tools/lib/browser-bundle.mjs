// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";

const IMPORT_PATTERN = /^import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?\s*$/gmu;
const EXPORT_DECLARATION_PATTERN = /^export\s+(?:(async)\s+)?(function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gmu;
const EXPORT_LIST_PATTERN = /^export\s*\{([\s\S]*?)\};?\s*$/gmu;

function normalizeId(root, absolute) {
  return relative(root, absolute).split(sep).join("/");
}

function resolveSpecifier(root, importer, specifier) {
  if (!specifier.startsWith(".")) throw new Error(`Browser bundle only supports local relative imports: ${specifier} from ${importer}`);
  const absolute = resolve(dirname(resolve(root, importer)), specifier);
  const id = normalizeId(root, absolute);
  if (id.startsWith("../") || posix.isAbsolute(id)) throw new Error(`Import escapes source root: ${specifier} from ${importer}`);
  return id;
}

function parseBindings(source) {
  return source
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((binding) => {
      const match = binding.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/u);
      if (!match) throw new Error(`Unsupported import/export binding: ${binding}`);
      return { imported: match[1], local: match[2] ?? match[1] };
    });
}

function transformModule(root, id, source) {
  const imports = [];
  source = source.replace(IMPORT_PATTERN, (_match, bindings, specifier) => {
    const dependency = resolveSpecifier(root, id, specifier);
    const parsed = parseBindings(bindings);
    const destructured = parsed.map(({ imported, local }) => imported === local ? imported : `${imported}: ${local}`).join(", ");
    imports.push(dependency);
    return `const { ${destructured} } = __require(${JSON.stringify(dependency)});`;
  });

  const exports = new Map();
  source = source.replace(EXPORT_DECLARATION_PATTERN, (_match, asyncKeyword, kind, name) => {
    exports.set(name, name);
    return `${asyncKeyword ? "async " : ""}${kind} ${name}`;
  });
  source = source.replace(EXPORT_LIST_PATTERN, (_match, bindings) => {
    for (const { imported, local } of parseBindings(bindings)) exports.set(local, imported);
    return "";
  });

  if (/^\s*import\s/mu.test(source)) throw new Error(`Unsupported import syntax remains in ${id}.`);
  if (/^\s*export\s/mu.test(source)) throw new Error(`Unsupported export syntax remains in ${id}.`);

  const assignments = [...exports.entries()].map(([exported, local]) => `${JSON.stringify(exported)}: ${local}`).join(", ");
  const trailer = assignments ? `\nObject.assign(__exports, { ${assignments} });` : "";
  return { id, imports: [...new Set(imports)], code: `${source.trimEnd()}${trailer}\n` };
}

async function loadGraph(root, entryId) {
  const modules = new Map();
  const visiting = new Set();

  async function visit(id) {
    if (modules.has(id)) return;
    if (visiting.has(id)) throw new Error(`Circular runtime import detected at ${id}.`);
    visiting.add(id);
    const absolute = resolve(root, id);
    const source = await readFile(absolute, "utf8");
    const transformed = transformModule(root, id, source);
    for (const dependency of transformed.imports) await visit(dependency);
    visiting.delete(id);
    modules.set(id, transformed);
  }

  await visit(entryId);
  return modules;
}

function indent(source, spaces = 4) {
  const prefix = " ".repeat(spaces);
  return source.split("\n").map((line) => line ? `${prefix}${line}` : "").join("\n");
}

export async function createBrowserBundle({ sourceRoot, entry = "src/main.mjs", destination }) {
  const root = resolve(sourceRoot);
  const modules = await loadGraph(root, entry);
  const chunks = [];
  chunks.push("// Generated deterministic runtime bundle. Edit src/*.mjs, never this file.");
  chunks.push("const __modules = Object.create(null);");
  chunks.push("const __cache = Object.create(null);");
  chunks.push("function __require(id) {");
  chunks.push("  if (__cache[id]) return __cache[id];");
  chunks.push("  const factory = __modules[id];");
  chunks.push("  if (!factory) throw new Error(`Missing bundled module: ${id}`);");
  chunks.push("  const exports = Object.create(null);");
  chunks.push("  __cache[id] = exports;");
  chunks.push("  factory(exports, __require);");
  chunks.push("  return exports;");
  chunks.push("}");

  for (const module of modules.values()) {
    chunks.push(`__modules[${JSON.stringify(module.id)}] = (__exports, __require) => {`);
    chunks.push(indent(module.code, 2));
    chunks.push("};");
  }
  chunks.push(`__require(${JSON.stringify(entry)});`);
  chunks.push("");

  const bundle = chunks.join("\n");
  await writeFile(destination, bundle);
  return { bundle, moduleCount: modules.size, modules: [...modules.keys()] };
}
