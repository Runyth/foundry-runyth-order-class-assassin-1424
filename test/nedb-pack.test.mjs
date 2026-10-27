// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  compileFoundryNedbDocuments,
  readDeterministicNedbPack,
  validateDeterministicNedbPack,
  writeDeterministicNedbPack,
} from "../tools/lib/nedb-pack.mjs";

const source = {
  _key: "!items!item000000000001",
  _id: "item000000000001",
  name: "Test Item",
  type: "feat",
  effects: [
    {
      _key: "!items.effects!item000000000001.effect0000000001",
      _id: "effect0000000001",
      name: "Test Effect",
      changes: [],
    },
  ],
};

test("NeDB compilation preserves embedded effects and removes storage-only keys", () => {
  const documents = compileFoundryNedbDocuments([source]);
  assert.equal(documents.length, 1);
  assert.equal(documents[0]._key, undefined);
  assert.equal(documents[0].effects[0]._key, undefined);
  assert.equal(documents[0].effects[0]._id, "effect0000000001");
});

test("deterministic NeDB pack survives exact round trip", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "runyth-order-assassin-nedb-"));
  const path = resolve(directory, "items.db");
  try {
    const documents = compileFoundryNedbDocuments([source]);
    await writeDeterministicNedbPack(path, documents);
    const first = await readFile(path);
    const result = await validateDeterministicNedbPack(path, documents);
    assert.equal(result.documents, 1);
    assert.deepEqual(await readDeterministicNedbPack(path), documents);
    await writeDeterministicNedbPack(path, documents);
    assert.equal((await readFile(path)).equals(first), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
