import { useState, useCallback, useEffect } from 'react';
import { nativeStorage } from '../native/storage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    nativeStorage.getItem(key).then(item => {
      if (item !== null) {
        try { setStoredValue(JSON.parse(item) as T); } catch {}
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        nativeStorage.setItem(key, JSON.stringify(next)).catch(e =>
          console.warn(`[useLocalStorage] Failed to save "${key}":`, e)
        );
        return next;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    nativeStorage.removeItem(key).catch(() => {});
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
