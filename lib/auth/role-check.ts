import { createClient } from "@/lib/supabase/server"

export async function getUserRole(): Promise<"user" | "admin" | "instructor" | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) return "user"

  return profile.role as "user" | "admin" | "instructor"
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === "admin"
}

export async function requireAdmin() {
  const adminStatus = await isAdmin()
  if (!adminStatus) {
    throw new Error("Access denied: Admin privileges required")
  }
  return true
}
