# Release process

The repository produces three deterministic ZIP archives for version 1.0.7:

1. `runyth-order-class-assassin-1424-v1.0.7.zip`;
2. `runyth-order-class-assassin-1424-source-v1.0.7.zip`;
3. `runyth-order-class-assassin-1424-documentation-v1.0.7.zip`.

Run:

```text
npm ci
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
