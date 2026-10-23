import { useSyncExternalStore } from 'react';
import { appearance } from '../lib/appearance';

export function useAppearance() {
  return { ...useSyncExternalStore(appearance.subscribe, appearance.getSnapshot, appearance.getSnapshot), setPreference: appearance.setPreference };
}
