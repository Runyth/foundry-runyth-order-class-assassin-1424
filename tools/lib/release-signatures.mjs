// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args, env) {
  return spawnSync(command, args, { encoding: "utf8", env });
}

export async function verifyCommitSignatures(gitRoot, publicKeyPath) {
  const gnupg = await mkdtemp(resolve(tmpdir(), "assassin-release-gpg-"));
  const env = {
    ...process.env,
    GNUPGHOME: gnupg,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  try {
    const imported = run("gpg", ["--batch", "--import", publicKeyPath], env);
    if (imported.status !== 0) return ["The published release key could not be imported."];
    const listed = run("git", ["-C", gitRoot, "rev-list", "--all"], env);
    if (listed.status !== 0) return ["Archived commits could not be listed for signature verification."];
    const commits = listed.stdout.trim().split("\n").filter(Boolean);
    if (!commits.length) return ["Archived Git history contains no commits to verify."];
    const failures = [];
    for (const commit of commits) {
      const verified = run("git", ["-C", gitRoot, "verify-commit", commit], env);
      if (verified.status !== 0) failures.push(`Archived commit ${commit} is not signed by the published release key.`);
    }
    return failures;
  } finally {
    await rm(gnupg, { recursive: true, force: true });
  }
}
