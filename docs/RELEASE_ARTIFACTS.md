# Release artifacts

Each release provides three primary ZIP files.

## Installable ZIP

Contains only runtime-required files under the module root directory:

```text
runyth-order-class-assassin-1424/
```

It can be extracted into Foundry's `Data/modules/` directory.

## Source ZIP

Contains editable runtime source, canonical pack JSON, deterministic compendium tooling, tests, CI, documentation, templates, styles, declarations, lockfile, and release tooling. It reproduces the installable archive.

## Documentation ZIP

Contains:

- README, changelog, licensing, security, and contribution documents;
- all `docs/`;
- all prompts;
- public TypeScript declarations;
- the authoritative and standalone manifests;
- machine-readable build and release reports;
- human-readable validation report;
- validation and fresh-extraction logs;
- checksum evidence.

This third archive replaces the need to download those release-evidence files one by one.

## Determinism

All three archives use sorted paths, fixed timestamps, fixed permissions, and deterministic compression. `npm run release:verify` packages them repeatedly and compares their bytes.

## Runtime asset integrity

Version 1.0.7 validates the install tree and final install ZIP against an exact runtime asset inventory. The inventory includes every local path declared by `module.json`, explicit requirements from `runtime-assets.json`, module-local template/resource references found in the generated browser entry, and local stylesheet assets. Packaging fails if any required asset is missing or appears at a different path.
