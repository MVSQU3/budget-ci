/**
 * La synchro ne part que si l'utilisateur l'a activée et que l'appareil est en ligne.
 * `online` n'est pas consulté quand la synchro est coupée : aucun appel réseau.
 */
export async function runGuardedSync(input: {
  enabled: boolean;
  online: () => Promise<boolean>;
  sync: () => Promise<void>;
}): Promise<'skipped' | 'synced'> {
  if (!input.enabled) return 'skipped';
  const online = await input.online();
  if (!online) return 'skipped';
  await input.sync();
  return 'synced';
}
