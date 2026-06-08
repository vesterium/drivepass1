/* Credentials — читаются из .env (секреты НЕ хранятся в коде) */

export const projectId: string =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? ""

export const publicAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
