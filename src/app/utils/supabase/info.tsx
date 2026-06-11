/* Credentials — читаются из env vars (injected at build time by Vite) */

export const projectId: string =
  import.meta.env.VITE_SUPABASE_PROJECT_ID || 'fipbpyjoydyqfvcfrwcm'

export const publicAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpcGJweWpveWR5cWZ2Y2Zyd2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NzUzNDksImV4cCI6MjA4MjE1MTM0OX0.lxY_KarupmyN6H2Yv1lzexabNEv5NsI4YJFDAWRbCeE'
