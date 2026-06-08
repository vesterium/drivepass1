import { Preferences } from '@capacitor/preferences';
import { isNative } from './capacitor';

/**
 * Capacitor-aware storage adapter for Supabase auth sessions.
 *
 * On native (iOS/Android): uses @capacitor/preferences (UserDefaults / SharedPreferences)
 * which survives app termination, memory pressure, and OS-level storage clearing.
 *
 * On web: falls back to localStorage transparently.
 */
export const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) return localStorage.getItem(key);
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return localStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) { localStorage.setItem(key, value); return; }
    try {
      await Preferences.set({ key, value });
    } catch {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isNative) { localStorage.removeItem(key); return; }
    try {
      await Preferences.remove({ key });
    } catch {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (!isNative) { localStorage.clear(); return; }
    try {
      await Preferences.clear();
    } catch {
      localStorage.clear();
    }
  },
};
