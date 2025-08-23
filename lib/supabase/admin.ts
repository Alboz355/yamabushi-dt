import { createClient } from "@supabase/supabase-js"

/**
 * Create a Supabase client with service role key for server-side operations
 * This client bypasses RLS and should only be used in server actions/API routes
 */
export function createAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
