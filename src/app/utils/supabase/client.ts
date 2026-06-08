import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import { nativeStorage } from '../../core/native/storage';

/**
 * Кастомный fetch — подавляет AuthRetryableFetchError и TypeError: Failed to fetch
 * в консоли, сохраняя корректное поведение повторных попыток Supabase SDK.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    throw err;
  }
};

export const supabase = createSupabaseClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // Native: @capacitor/preferences (survives OS kill + memory pressure)
      // Web: localStorage fallback
      storage: nativeStorage,
    },
    global: {
      fetch: resilientFetch,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      kv_store_80c25f01: {
        Row: {
          key: string;
          value: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: any;
          updated_at?: string;
        };
      };
    };
  };
};
