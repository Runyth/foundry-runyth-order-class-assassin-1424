// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function selectControllingUser({ actor, token = null, users = [] }) {
  const active = users.filter((user) => user?.active);
  const tokenUser = token?.controlledBy?.find?.((id) => active.some((user) => user.id === id));
  if (tokenUser) return tokenUser;
  const activeOwner = active.find((user) => !user.isGM && actor?.testUserPermission?.(user, "OWNER"));
  if (activeOwner) return activeOwner.id;
  const activeGm = active.find((user) => user.isGM);
  return activeGm?.id ?? null;
}

export function isPrimaryAuthority(users = [], currentUserId = null) {
  const gm = users.filter((user) => user?.active && user?.isGM).sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
  return gm ? gm.id === currentUserId : false;
}
