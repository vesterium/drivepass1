import { useState, useEffect } from 'react';
import { getNetworkStatus, addNetworkListener } from '../native/capacitor';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial state
    getNetworkStatus().then(setIsOnline);

    // Listen for changes (native or web)
    const cleanup = addNetworkListener(setIsOnline);
    return cleanup;
  }, []);

  return isOnline;
}
