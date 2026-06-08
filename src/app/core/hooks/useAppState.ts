import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { isNative } from '../native/capacitor';

/**
 * Tracks whether the native app is in the foreground (active) or background.
 * On web, always returns true (always "active").
 */
export function useAppState() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isNative) return;

    const listenerPromise = App.addListener('appStateChange', (state) => {
      setIsActive(state.isActive);
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, []);

  return isActive;
}
