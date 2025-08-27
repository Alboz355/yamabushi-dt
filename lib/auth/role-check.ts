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
    console.log("[v0] SERVER: Hardcoded admin detected:", user.email)
    return "admin"
  }

  // Try database lookup with RLS error handling
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.log("[v0] SERVER: Profile query failed for user:", user.email, "Error:", profileError.message)
    const { data: instructor, error: instructorError } = await supabase
      .from("instructors")
      .select("profile_id")
      .eq("profile_id", user.id)
      .single()

    if (!instructorError && instructor) {
      console.log("[v0] SERVER: Instructor detected via instructors table:", user.email)
      return "instructor"
    }

    return "user"
  }

  if (!profile) return "user"

  console.log("[v0] SERVER: User role from database:", profile.role, "for user:", user.email)
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
