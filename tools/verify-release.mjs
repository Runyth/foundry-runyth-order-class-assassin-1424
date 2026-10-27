// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createDocumentationBundle } from "./documentation-bundle.mjs";
import { extractZip, listZip } from "./lib/zip.mjs";
import { validateRuntimeArchiveEntries } from "./lib/runtime-assets.mjs";
import { readJson } from "./lib/files.mjs";
import { scanTree } from "./lib/publication-scan.mjs";
import { RECONSTRUCTED_CONFIG } from "./stage-source.mjs";
import { verifyCommitSignatures } from "./lib/release-signatures.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const manifest = await readJson(resolve(root, "module.json"));
const catalog = await readJson(resolve(root, "packs/catalog.json"));
const prefix = `${manifest.id}-v${manifest.version}`;
const installName = `${prefix}.zip`;
const sourceName = `${manifest.id}-source-v${manifest.version}.zip`;
const documentationName = `${manifest.id}-documentation-v${manifest.version}.zip`;
const installPath = resolve(dist, installName);
const sourcePath = resolve(dist, sourceName);
const documentationPath = resolve(dist, documentationName);
const validationLogPath = resolve(dist, `${prefix}-validation.log`);
const freshLogPath = resolve(dist, `${prefix}-fresh-extraction-validation.log`);
const failures = [];
const validationSections = [];

function run(command, args, cwd = root, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const rendered = [
    `$ ${[command, ...args].join(" ")}`,
    result.stdout?.trim(),
    result.stderr?.trim(),
  ].filter(Boolean).join("\n");
  return { ...result, rendered };
}

function requireSuccess(label, result, target = validationSections) {
  target.push(`## ${label}\n${result.rendered}`);
  if (result.status !== 0) failures.push(`${label} failed with status ${result.status}.`);
}

async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function sameBytes(path, expected) {
  return readFile(path).then((data) => data.equals(expected)).catch(() => false);
}

for (const [label, command, args] of [
  ["npm ci", "npm", ["ci", "--ignore-scripts"]],
  ["tests", "npm", ["test"]],
  ["format", "npm", ["run", "format:check"]],
  ["lint", "npm", ["run", "lint"]],
  ["validation", "npm", ["run", "validate"]],
  ["build", "npm", ["run", "build"]],
  ["package", "npm", ["run", "package"]],
]) requireSuccess(label, run(command, args));

if (failures.length) {
  await mkdir(dist, { recursive: true });
  await writeFile(validationLogPath, `${validationSections.join("\n\n")}\n`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const installFirst = await readFile(installPath);
const sourceFirst = await readFile(sourcePath);
const documentationFirst = await readFile(documentationPath);
const installEntries = await listZip(installPath);
const sourceEntries = await listZip(sourcePath);
const documentationEntriesInitial = await listZip(documentationPath);
const requiredRuntimeAssets = (await readJson(resolve(root, ".build/runtime-assets.json"))).assets;
try {
  validateRuntimeArchiveEntries({ entries: installEntries, moduleId: manifest.id, requiredAssets: requiredRuntimeAssets });
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}
const sourceRoot = `${manifest.id}-source-v${manifest.version}`;
const documentationRoot = `${manifest.id}-documentation-v${manifest.version}`;

for (const required of [
  `${manifest.id}/module.json`,
  `${manifest.id}/LICENSE`,
  `${manifest.id}/src/main.mjs`,
  `${manifest.id}/packs/character-options-v2.db`,
  `${manifest.id}/packs/features-v2.db`,
  `${manifest.id}/packs/equipment-v2.db`,
]) {
  if (!installEntries.includes(required)) failures.push(`Install archive is missing ${required}.`);
}

for (const forbidden of [
  `${manifest.id}/NOTICE.md`,
  `${sourceRoot}/NOTICE.md`,
  `${manifest.id}/src/automation/assassinate.mjs`,
  `${manifest.id}/src/rules/assassin-strike-state.mjs`,
]) {
  if (installEntries.includes(forbidden)) failures.push(`Install archive contains removed runtime path ${forbidden}.`);
}

for (const required of [
  `${sourceRoot}/package.json`,
  `${sourceRoot}/tools/build.mjs`,
  `${sourceRoot}/tools/documentation-bundle.mjs`,
  `${sourceRoot}/tools/lib/nedb-pack.mjs`,
  `${sourceRoot}/tools/lib/browser-bundle.mjs`,
  `${sourceRoot}/tools/lib/runtime-assets.mjs`,
  `${sourceRoot}/runtime-assets.json`,
  `${sourceRoot}/test/runtime-assets.test.mjs`,
  `${sourceRoot}/test/content.test.mjs`,
  `${sourceRoot}/test/assassinate.test.mjs`,
  `${sourceRoot}/docs/MANUAL_LIVE_TESTS.md`,
  `${sourceRoot}/docs/LIVE_TEST_FINDINGS.md`,
  `${sourceRoot}/docs/RELEASE_ARTIFACTS.md`,
  `${sourceRoot}/docs/PATCH_1.0.7_RUNTIME_ASSET_INTEGRITY.md`,
  `${sourceRoot}/docs/RUNYTH_ORDER_NAMING.md`,
  `${sourceRoot}/prompts/runyth-order-core-naming-patch-prompt.md`,
  `${sourceRoot}/src/core/identity-migration.mjs`,
  `${sourceRoot}/src/integration/subclass-discovery.mjs`,
  `${sourceRoot}/test/identity-migration.test.mjs`,
  `${sourceRoot}/test/nedb-pack.test.mjs`,
  `${sourceRoot}/test/runtime-bundle.test.mjs`,
]) {
  if (!sourceEntries.includes(required)) failures.push(`Source archive is missing ${required}.`);
}

for (const forbidden of ["/test/", "/tools/", "/docs/", "/package.json", "/package-lock.json", "/packs/_source/"]) {
  if (installEntries.some((entry) => entry.includes(forbidden))) {
    failures.push(`Install archive contains source-only path ${forbidden}.`);
  }
}
const installedSrcEntries = installEntries.filter((entry) => entry.startsWith(`${manifest.id}/src/`));
if (JSON.stringify(installedSrcEntries) !== JSON.stringify([`${manifest.id}/src/main.mjs`])) {
  failures.push(`Install archive must contain only the generated src/main.mjs under src/, found: ${installedSrcEntries.join(", ") || "none"}.`);
}

for (const required of [
  `${documentationRoot}/README.md`,
  `${documentationRoot}/CHANGELOG.md`,
  `${documentationRoot}/docs/LIVE_TEST_FINDINGS.md`,
  `${documentationRoot}/docs/MANUAL_LIVE_TESTS.md`,
  `${documentationRoot}/docs/RELEASE_ARTIFACTS.md`,
  `${documentationRoot}/docs/PATCH_1.0.7_RUNTIME_ASSET_INTEGRITY.md`,
  `${documentationRoot}/runtime-assets.json`,
  `${documentationRoot}/prompts/runyth-order-core-naming-patch-prompt.md`,
  `${documentationRoot}/types/runyth-order-class-assassin-1424.d.ts`,
  `${documentationRoot}/release/${prefix}-build-report.json`,
  `${documentationRoot}/release/${prefix}-SHA256SUMS.txt`,
]) {
  if (!documentationEntriesInitial.includes(required)) {
    failures.push(`Initial documentation archive is missing ${required}.`);
  }
}

const scanRoot = resolve(root, ".build/publication-scan");
await rm(scanRoot, { recursive: true, force: true });
await mkdir(scanRoot, { recursive: true });
await extractZip(installPath, resolve(scanRoot, "install"));
await extractZip(sourcePath, resolve(scanRoot, "source"));
for (const finding of await scanTree(resolve(scanRoot, "install", manifest.id))) failures.push(`Install archive prohibited content: ${finding}`);
for (const finding of await scanTree(resolve(scanRoot, "source", sourceRoot), { includeGit: true })) failures.push(`Source archive prohibited content: ${finding}`);
const stagedConfigPath = resolve(scanRoot, "source", sourceRoot, ".git/config");
if (sourceEntries.includes(`${sourceRoot}/.git/config`)) {
  const stagedConfig = await readFile(stagedConfigPath, "utf8");
  if (stagedConfig !== RECONSTRUCTED_CONFIG) failures.push("Reconstructed Git config is not the closed credential-free config.");
  if (sourceEntries.some((entry) => entry.includes("/.git/hooks/"))) failures.push("Source archive contains Git hooks.");
} else if (process.env.RUNYTH_PUBLIC_RELEASE) {
  failures.push("Public source archive must contain reconstructed Git metadata.");
}
if (sourceEntries.includes(`${sourceRoot}/.git/config`)) {
  failures.push(...await verifyCommitSignatures(resolve(scanRoot, "source", sourceRoot), resolve(root, "keys/release-signing.asc")));
}

const secondPackage = run("npm", ["run", "package"]);
requireSuccess("second deterministic package", secondPackage);
if (!(await sameBytes(installPath, installFirst))) failures.push("Install archive is not byte-identical across repeated packaging.");
if (!(await sameBytes(sourcePath, sourceFirst))) failures.push("Source archive is not byte-identical across repeated packaging.");
if (!(await sameBytes(documentationPath, documentationFirst))) failures.push("Documentation archive is not byte-identical across repeated packaging.");

const freshRoot = resolve(root, ".build/fresh-extraction");
await rm(freshRoot, { recursive: true, force: true });
await mkdir(freshRoot, { recursive: true });
await extractZip(sourcePath, freshRoot);
const extracted = resolve(freshRoot, sourceRoot);
const freshSections = [];
for (const [label, command, args, env] of [
  ["fresh npm ci", "npm", ["ci", "--ignore-scripts"]],
  ["fresh tests", "npm", ["test"]],
  ["fresh validation", "npm", ["run", "validate"]],
  ["fresh build", "npm", ["run", "build"]],
  ["fresh package", "npm", ["run", "package"], { RUNYTH_ALLOW_UNCOMMITTED: "1" }],
]) requireSuccess(label, run(command, args, extracted, env), freshSections);

const freshInstall = resolve(extracted, "dist", installName);
const freshSource = resolve(extracted, "dist", sourceName);
const freshDocumentation = resolve(extracted, "dist", documentationName);
if (!(await sameBytes(freshInstall, installFirst))) failures.push("Fresh-extraction install ZIP does not match the original.");
if (!(await sameBytes(freshSource, sourceFirst))) failures.push("Fresh-extraction source ZIP does not match the original.");
if (!(await sameBytes(freshDocumentation, documentationFirst))) failures.push("Fresh-extraction documentation ZIP does not match the original package-stage archive.");

await mkdir(dist, { recursive: true });
await writeFile(validationLogPath, `${validationSections.join("\n\n")}\n`);
await writeFile(freshLogPath, `${freshSections.join("\n\n")}\n`);

const machineReport = {
  schemaVersion: 1,
  moduleId: manifest.id,
  version: manifest.version,
  contentVersion: catalog.version,
  verifiedAt: new Date().toISOString(),
  automated: {
    npmCi: true,
    tests: true,
    format: true,
    lint: true,
    staticValidation: true,
    archiveIntegrity: true,
    deterministicRepackage: true,
    freshExtractionRebuild: true,
    documentationArchive: true,
    providerLifecycleRegistration: true,
    runtimeCatalogParity: true,
    identityMigration: true,
    coreNamespaceMigration: true,
    runythOrderApiCompatibility: true,
    nonEmptyCompendiumPacks: true,
    singleFileBrowserRuntime: true,
    exactManifestRuntimePathPresent: true,
    allDeclaredRuntimeAssetsPresent: true,
    secondaryRuntimeImportsEliminated: true,
    subclassDiscoveryContract: true,
    customAssassinStrikeRemoved: true,
    namingContract: true,
    corePatchPromptIncluded: true,
  },
  liveFoundry: {
    preReleaseLiveEvidenceReviewed: true,
    postPatchPerformedByBuilder: false,
    requiredChecklist: "docs/MANUAL_LIVE_TESTS.md",
  },
  files: {
    installArchive: installName,
    sourceArchive: sourceName,
    documentationArchive: documentationName,
    validationLog: `${prefix}-validation.log`,
    freshExtractionLog: `${prefix}-fresh-extraction-validation.log`,
  },
  sha256: {
    install: await digest(installPath),
    source: await digest(sourcePath),
  },
  failures,
};
await writeFile(resolve(dist, `${prefix}-release-verification.json`), `${JSON.stringify(machineReport, null, 2)}\n`);

const human = `# Runyth Order: Class Assassin 1424 v${manifest.version} — Build and validation report

## Result

${failures.length ? "Automated release verification failed." : "All automated release gates passed."}

## Pre-release evidence addressed

- removed the separate Assassin Strike attack and damage workflow that produced a Midi-QOL activity-chain mismatch;
- retained the normal weapon attack and native Critical Hit damage option after GM confirmation of explicit Surprise;
- corrected the foundation dependency and API lookup from the retired \`runyth-rules-core\` identity to \`runyth-order\`;
- moved canonical source metadata to \`flags.runyth-order.source\` with an explicit compatibility migration;
- replaced the empty provisional LevelDB packs with deterministic v2 NeDB source packs that Foundry V13 migrates to native LevelDB;
- retained fresh-install Rogue subclass discovery through pack metadata, source enablement, exact public index fields, and startup verification;
- retained the single-file browser bundle but now ships it at the exact manifest path \`src/main.mjs\`, matching the path Foundry requests;
- validates every manifest-declared ES module, script, stylesheet, language file, compendium path, discovered module-local template/reference, and explicitly required runtime asset before ZIP creation and against the finished install archive.

## Verified automatically

- clean dependency installation with \`npm ci --ignore-scripts\`;
- unit and contract tests;
- formatting and lint checks;
- manifest, localization, source metadata, Advancement, UUID, and API scans;
- absence of removed Assassin Strike runtime files and provider capability;
- subclass pack type, ownership, identifier, class identifier, and deterministic D&D 5e metadata;
- deterministic NeDB pack generation, JSON-line round-trip validation, and non-empty pack counts;
- deterministic single-file browser runtime generation with no static \`import\` or \`export\` declarations;
- install archive contains the generated \`src/main.mjs\` at the exact manifest path and no other editable \`src/\` modules;
- every manifest-declared and discovered runtime asset exists in the built tree and finished install ZIP;
- archive root and inventory integrity;
- byte-identical repeated packaging for install, source, and documentation ZIPs;
- clean source extraction followed by complete rebuild and repackaging;
- byte-identical primary ZIPs from clean extraction;
- synchronous, verified, fail-closed provider lifecycle registration;
- generated runtime-catalog parity with the canonical catalog;
- legacy \`runyth-assassin\` identity migration and current-identity idempotency;
- Runyth Order naming metadata and inclusion of the Rules Core naming prompt.

## Live-test scope

The supplied pre-release live log was reviewed and is documented in \`docs/LIVE_TEST_FINDINGS.md\`. No post-fix Foundry browser test was performed in this build environment. The exact GM confirmation checklist is in \`docs/MANUAL_LIVE_TESTS.md\`.

## Identity and versioning

- Display title: ${manifest.title}
- Module/provider ID: ${manifest.id}
- Provider/runtime release: ${manifest.version}
- Canonical pack content: ${catalog.version}
- Legacy identity migrated from: \`runyth-assassin\`
- Registered provider migrations: 2

## Compatibility

- Foundry VTT: exactly 13.351
- D&D 5e: exactly 5.3.3
- Runyth Order API: exactly 1.0.0
- Runyth Order module: minimum 1.0.3; verified 1.0.4; compatible later patches retaining API 1.0.0
`;
await writeFile(resolve(dist, `${prefix}-build-and-validation-report.md`), human);

const checksumFiles = [
  installName,
  sourceName,
  "module.json",
  `${prefix}-module.json`,
  `${prefix}-module-standalone.json`,
  `${prefix}-build-report.json`,
  `${prefix}-release-verification.json`,
  `${prefix}-build-and-validation-report.md`,
  `${prefix}-validation.log`,
  `${prefix}-fresh-extraction-validation.log`,
];
await writeFile(
  resolve(dist, `${prefix}-SHA256SUMS.txt`),
  `${(await Promise.all(checksumFiles.map(async (name) => `${await digest(resolve(dist, name))}  ${name}`))).join("\n")}\n`,
);

await createDocumentationBundle({ root, dist });
const documentationFinalFirst = await readFile(documentationPath);
await createDocumentationBundle({ root, dist });
if (!(await sameBytes(documentationPath, documentationFinalFirst))) {
  failures.push("Final documentation archive is not byte-identical across repeated generation.");
}

const documentationEntriesFinal = await listZip(documentationPath);
for (const required of [
  `${documentationRoot}/release/${prefix}-release-verification.json`,
  `${documentationRoot}/release/${prefix}-build-and-validation-report.md`,
  `${documentationRoot}/release/${prefix}-validation.log`,
  `${documentationRoot}/release/${prefix}-fresh-extraction-validation.log`,
]) {
  if (!documentationEntriesFinal.includes(required)) failures.push(`Final documentation archive is missing ${required}.`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Release verification passed: ${installEntries.length} install entries, ${sourceEntries.length} source entries, ${documentationEntriesFinal.length} documentation entries, byte-identical clean rebuild.`,
  );
}
