import { createClient } from "@/lib/supabase/server"

export async function getUserRole(): Promise<"user" | "admin" | "instructor" | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return null

  const adminEmails = ["admin@admin.com"]
  if (adminEmails.includes(user.email || "")) {
    console.log("[v0] SERVER: Admin detected by email:", user.email)
    return "admin"
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.log("[v0] SERVER: Profile query failed, using email fallback for user:", user.email)
    return "user"
  }

  if (!profile) return "user"

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
