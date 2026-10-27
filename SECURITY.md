# Security policy

Report security-sensitive defects privately through GitHub's private vulnerability reporting for this repository at:

```text
https://github.com/Runyth/foundry-runyth-order-class-assassin-1424/security/advisories/new
```

Use that route before opening any public issue. Do not include world exports, access tokens, private keys, or player information in a public issue.

## Supported release

The newest `1.x` release receives security fixes. Compatibility is limited to the Foundry and D&D 5e versions declared in `module.json`.

## Trust boundary

This module is installed code. Foundry executes it with the permissions available to the logged-in client. It does not fetch remote executable content, evaluate descriptor strings as JavaScript, or store credentials.

Release source archives must contain only reconstructed, credential-free Git metadata. Do not publish a developer checkout, a private key, or a local Git configuration. Archived commits must verify with the published key in `keys/release-signing.asc`.
