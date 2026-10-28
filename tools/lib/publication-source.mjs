// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { stageSource } from "../stage-source.mjs";
import { isolatedGitEnv } from "./git-env.mjs";

function gitText(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: isolatedGitEnv(),
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export async function materializePublicationSource(root) {
  const head = gitText(root, ["rev-parse", "--verify", "--quiet", "HEAD"]);
  if (!head) {
    if (process.env.RUNYTH_PUBLIC_RELEASE) {
      throw new Error("Public release requires a committed revision.");
    }
    return { mode: "worktree", root, includeGit: false, report: null };
  }
  if (!existsSync(resolve(root, ".git/index"))) {
    const restored = spawnSync("git", ["-C", root, "read-tree", "HEAD"], {
      encoding: "utf8",
      env: isolatedGitEnv(),
    });
    if (restored.status !== 0) {
      throw new Error(`Cannot restore the Git index before publication staging: ${restored.stderr.trim()}`);
    }
  }
  const dirty = gitText(root, ["status", "--porcelain", "--untracked-files=no"]);
  if (dirty && process.env.RUNYTH_PUBLIC_RELEASE) {
    throw new Error("Public release rejects uncommitted tracked changes.");
  }
  if (dirty && !process.env.RUNYTH_ALLOW_UNCOMMITTED) {
    throw new Error("Tracked uncommitted changes cannot enter a publication archive.");
  }
  // A reconstructed archive has no index, so status reports deletions even when the
  // extracted tree matches HEAD. Staging still uses the recorded revision, not the index.
  const staged = await stageSource(root);
  return {
    mode: "staged",
    root: staged.root,
    includeGit: true,
    report: staged.report,
  };
}
