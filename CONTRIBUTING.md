# Contributing

This repository follows the Runyth provider contract. Changes must preserve stable provider entry IDs, source metadata, deterministic archives, English/German localization parity, and the exact compatibility matrix.

The project licence is `AGPL-3.0-or-later`. Keep the `SPDX-License-Identifier` header at the top of source files.

Use `master` as the default branch.

Run before opening a pull request:

```text
npm ci --ignore-scripts
npm run check
```

Use the repository’s capitalized Conventional Commit style, for example `Fix: Restore subclass picker discovery`.

Do not include credentials, world exports, or player information in issues or pull requests.
