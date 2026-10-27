// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { CATALOG } from "./catalog-data.mjs";

let catalog = CATALOG;

export function getCatalog() {
  return catalog;
}

export function setCatalogForTests(value) {
  catalog = value;
}
