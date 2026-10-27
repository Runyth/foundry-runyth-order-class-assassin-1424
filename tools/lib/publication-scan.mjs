// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { walk } from "./files.mjs";

const composed = (...parts) => parts.join("");

const credentialPatterns = [
  {
    source: "classic platform access token",
    pattern: new RegExp(`${composed("g", "h")}[posr]_[A-Za-z0-9]{20,}`, "u"),
  },
  {
    source: "fine-grained platform access token",
    pattern: new RegExp(`${composed("github", "_pat_")}[A-Za-z0-9_]{20,}`, "u"),
  },
  {
    source: "machine-account token URL alias",
    pattern: new RegExp(`x-access-${composed("to", "ken")}:[^@\\s]{6,}@`, "iu"),
  },
  {
    source: "URL with embedded credentials",
    pattern: new RegExp(`${composed("ht", "tp")}s?:\\/\\/[^@\\s/]+:[^@\\s]+@`, "u"),
  },
  {
    source: "HTTP authorization credential header",
    pattern: new RegExp(
      `(?:^|\\r?\\n)\\s*(?:${composed("ex", "tra", "hea", "der")}\\s*=\\s*)?${composed("Au", "th", "orization")}\\s*:\\s*(?:${composed("ba", "sic")}|${composed("be", "ar", "er")})\\s+\\S`,
      "iu",
    ),
  },
  {
    source: "private key material",
    pattern: new RegExp(
      `${composed("-----", "BE", "GIN ")}(?:RSA |OPENSSH |EC |PGP )?${composed("PR")}IVATE\\s+${composed("KE", "Y")}-----`,
      "u",
    ),
  },
];

const identityPatterns = [
  {
    source: "removed attribution rumour",
    pattern: new RegExp(`${composed("Play", "er")}[\\s_-]*1\\b`, "iu"),
  },
  {
    source: "removed attribution rumour",
    pattern: new RegExp(`${composed("priv", "ate")}[\\s_-]*${composed("camp", "aign")}`, "iu"),
  },
  {
    source: "removed campaign identity reference",
    pattern: new RegExp(`${composed("orph", "an")}[\\s_-]*${composed("bl", "ack")}`, "iu"),
  },
  {
    source: "developer identity material",
    pattern: new RegExp(composed("aki", "to"), "iu"),
  },
  {
    source: "developer filesystem path",
    pattern: new RegExp(composed("/mnt/", "v/"), "u"),
  },
];

const TEXT_EXTENSIONS = new Set(["", ".mjs", ".js", ".json", ".md", ".yml", ".yaml", ".css", ".hbs", ".txt", ".html", ".asc"]);

function isTextPath(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

export function prohibitedMatches(buffer, { identity = true } = {}) {
  const decoded = Buffer.isBuffer(buffer) ? buffer.toString("latin1") : String(buffer);
  const patterns = identity ? [...credentialPatterns, ...identityPatterns] : credentialPatterns;
  return patterns.filter(({ pattern }) => pattern.test(decoded)).map(({ source }) => source);
}

export async function scanTree(root, { includeGit = false } = {}) {
  const failures = [];
  for (const file of await walk(root)) {
    if (file.path.startsWith("dist/") || file.path.startsWith(".build/") || file.path.startsWith("node_modules/") || file.path.startsWith(".staging/")) continue;
    if (!includeGit && file.path.startsWith(".git/")) continue;
    const gitObject = file.path.startsWith(".git/objects/");
    const identity = !gitObject && isTextPath(file.path);
    const data = await readFile(file.absolute);
    const matches = prohibitedMatches(data, { identity });
    if (matches.length) failures.push(`${file.path}: ${[...new Set(matches)].join(", ")}`);
  }
  return failures;
}
