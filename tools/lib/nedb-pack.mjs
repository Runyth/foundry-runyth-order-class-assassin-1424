// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, writeFile } from "node:fs/promises";

function stripStorageKeys(value) {
  if (Array.isArray(value)) return value.map(stripStorageKeys);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "_key") continue;
    result[key] = stripStorageKeys(entry);
  }
  return result;
}

export function compileFoundryNedbDocuments(documents) {
  const seen = new Set();
  return [...documents]
    .sort((left, right) => String(left?._key ?? left?._id).localeCompare(String(right?._key ?? right?._id)))
    .map((source) => {
      if (!source?._key?.startsWith("!items!")) {
        throw new Error(`Item source ${source?.name ?? source?._id ?? "unknown"} has no valid !items! key.`);
      }
      if (!/^[A-Za-z0-9]{16}$/u.test(source._id ?? "")) {
        throw new Error(`Item source ${source?.name ?? "unknown"} has an invalid Foundry ID.`);
      }
      if (seen.has(source._id)) throw new Error(`Duplicate Foundry document ID ${source._id}.`);
      seen.add(source._id);
      return stripStorageKeys(structuredClone(source));
    });
}

export async function writeDeterministicNedbPack(path, documents) {
  if (!documents.length) throw new Error("Refusing to create an empty Foundry compendium pack.");
  const content = `${documents.map((document) => JSON.stringify(document)).join("\n")}\n`;
  await writeFile(path, content, "utf8");
}

export async function readDeterministicNedbPack(path) {
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/u).filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid NeDB JSON line ${index + 1}: ${error.message}`);
    }
  });
}

export async function validateDeterministicNedbPack(path, expectedDocuments) {
  const actual = await readDeterministicNedbPack(path);
  if (actual.length !== expectedDocuments.length) {
    throw new Error(`NeDB pack document count ${actual.length} differs from expected ${expectedDocuments.length}.`);
  }
  for (let index = 0; index < expectedDocuments.length; index += 1) {
    if (JSON.stringify(actual[index]) !== JSON.stringify(expectedDocuments[index])) {
      throw new Error(`NeDB document mismatch at index ${index}.`);
    }
  }
  return Object.freeze({ documents: actual.length, bytes: Buffer.byteLength(await readFile(path, "utf8")) });
}
