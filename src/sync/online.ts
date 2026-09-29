/** Vrai seulement si l'appareil annonce une connexion utilisable. */
export async function isDeviceOnline(): Promise<boolean> {
  try {
    const Network = await import('expo-network');
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    return true;
  }
}
