import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import { nativeStorage } from '../../core/native/storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl === 'https://.supabase.co') {
  console.error('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PROJECT_ID is missing!');
}
if (!supabaseKey) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY is missing!');
}

export const supabase = createSupabaseClient(
  supabaseUrl,
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: nativeStorage,
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
