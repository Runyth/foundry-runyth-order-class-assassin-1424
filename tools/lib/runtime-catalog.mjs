// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function renderRuntimeCatalog(catalog) {
  return `// SPDX-License-Identifier: AGPL-3.0-or-later\n// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.\n// Generated from packs/catalog.json. Run npm run catalog:generate after editing the catalog.\nexport const CATALOG = Object.freeze(${JSON.stringify(catalog, null, 2)});\n`;
}
