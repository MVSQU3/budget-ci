/**
 * Le serveur garde la ligne sauf si `updatedAt` entrant est strictement plus récent.
 * À égalité, la copie distante fait foi.
 */
export function shouldApplyRemote(
  local: { updatedAt: string } | undefined,
  remoteUpdatedAt: string,
): boolean {
  if (!local) return true;
  return remoteUpdatedAt >= local.updatedAt;
}
