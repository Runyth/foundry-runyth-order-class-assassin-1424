# Release process

Public release source archives are produced only by the public CI workflow. That workflow reconstructs credential-free Git metadata and does not persist checkout credentials. Do not publish a developer checkout or a locally built source ZIP.

The repository produces three deterministic ZIP archives:

1. `runyth-order-class-assassin-1424-v<version>-mod.zip`;
2. `runyth-order-class-assassin-1424-v<version>-src.zip`;
3. `runyth-order-class-assassin-1424-v<version>-doc.zip`.

Run:

```text
npm ci --ignore-scripts
npm run format:check
npm run lint
npm run catalog:check
npm run content:hash:check
npm test
npm run validate
npm run build
npm run package
npm run release:verify
```

The verifier packages twice, rebuilds from a clean source extraction, checks archive inventories, the single-file runtime entry, absence of install-time `src/` modules, and pack counts, and requires byte-identical results. Release reports must state that no post-fix Foundry browser test was performed unless a real live world was used.
