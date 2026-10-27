// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { prohibitedMatches, scanTree } from "../tools/lib/publication-scan.mjs";
import { verifyCommitSignatures } from "../tools/lib/release-signatures.mjs";
import { RECONSTRUCTED_CONFIG, stageSource } from "../tools/stage-source.mjs";

const root = resolve(import.meta.dirname, "..");

test("publication scan accepts the project tree and rejects credential canaries", async () => {
  assert.deepEqual(await scanTree(root), []);
  const token = ["g", "h", "p", "_", "A".repeat(24)].join("");
  assert.ok(prohibitedMatches(token).includes("classic platform access token"));
  assert.ok(prohibitedMatches("Play" + "er 1").includes("removed attribution rumour"));
  assert.ok(prohibitedMatches(["priv", "ate ", "camp", "aign"].join("")).includes("removed attribution rumour"));
});

test("published release key verifies the repository history", async () => {
  assert.deepEqual(await verifyCommitSignatures(root, resolve(root, "keys/release-signing.asc")), []);
});

test("source staging reconstructs a credential-free Git repository", async () => {
  const temp = await mkdtemp(resolve(tmpdir(), "assassin-1424-stage-"));
  const git = (args, options = {}) => {
    const result = spawnSync("git", ["-C", temp, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_AUTHOR_NAME: "Publication Fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "Publication Fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      },
    });
    if (result.status !== 0 && !options.allowFailure) throw new Error(result.stderr);
    return result;
  };
  try {
    git(["init", "--quiet", "--initial-branch", "master", "--template="]);
    git(["config", "commit.gpgsign", "false"]);
    await writeFile(resolve(temp, "README.md"), "fixture\n");
    git(["add", "README.md"]);
    git(["commit", "--quiet", "-m", "Fixture: Add publication staging sample"]);
    const staged = await stageSource(temp, { stagingRoot: resolve(temp, ".staging") });
    const config = await readFile(resolve(staged.root, ".git/config"), "utf8");
    assert.equal(config, RECONSTRUCTED_CONFIG);
    assert.equal(staged.report.closureObjectCount > 0, true);
    await assert.rejects(readFile(resolve(staged.root, ".git/hooks/pre-commit")));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
