// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function currentUserIsAuthority(actor = null) {
  const active = (game.users?.filter?.((user) => user.active) ?? []).sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const gm = active.find((user) => user.isGM);
  if (gm) return gm.id === game.user?.id;
  const owner = active.find((user) => actor?.testUserPermission?.(user, "OWNER"));
  return owner?.id === game.user?.id;
}
