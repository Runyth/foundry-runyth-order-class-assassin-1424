// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { spawnSync } from "node:child_process";
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
  const dirty = gitText(root, ["status", "--porcelain", "--untracked-files=no"]);
  if (dirty) {
    if (process.env.RUNYTH_PUBLIC_RELEASE || !process.env.RUNYTH_ALLOW_UNCOMMITTED) {
      throw new Error("Tracked uncommitted changes cannot enter a publication archive.");
    }
    return { mode: "worktree", root, includeGit: false, report: null };
  }
  const staged = await stageSource(root);
  return {
    mode: "staged",
    root: staged.root,
    includeGit: true,
    report: staged.report,
  };
}
