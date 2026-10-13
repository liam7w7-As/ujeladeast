import { useSyncExternalStore } from 'react';
import { createPwaInstallStore } from '../lib/pwaInstall';

const pwaInstall = createPwaInstallStore(window);

export function usePwaInstall() {
  return { ...useSyncExternalStore(pwaInstall.subscribe, pwaInstall.snapshot), ...pwaInstall };
}
