# Testing

Automated tests cover provider registration, the accepted `runyth-order` module identity, exact public API version compatibility, canonical source namespaces, both migrations, content progression, Actor synchronization, validation, automation state, subclass discovery, deterministic pack round trips, localization, deterministic single-file browser bundling, and archive quality gates.

The pack gate rejects:

- empty packs;
- invalid Foundry document IDs;
- duplicate document IDs;
- malformed JSON lines;
- mismatched round-trip content;
- old provisional custom LevelDB tooling;
- browser runtime bundles with unresolved secondary imports or missing formerly transitive modules.

Pre-release live testing of the pre-rename module supplied the console evidence that led to the 1.0.4 workflow changes. The 1.0.5 API and empty-pack defects are derived from the later supplied startup log. The 1.0.6 runtime-ESM packaging defect is derived from the supplied patch prompt reporting `net::ERR_FAILED` for secondary modules. The 1.0.7 manifest/archive integrity defect is derived from the supplied patch prompt reporting an HTTP 404 for the declared `src/main.mjs` entry. The build environment does not contain a Foundry browser, so no post-fix live result is claimed.

Use `MANUAL_LIVE_TESTS.md` for final qualification.
