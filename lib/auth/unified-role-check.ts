import { createClient } from "@/lib/supabase/server"

export interface UserRole {
  role: "user" | "admin" | "instructor"
  isAdmin: boolean
  isInstructor: boolean
  email: string
}

export async function getUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("[v0] UNIFIED: No authenticated user found")
      return null
    }

    // Check hardcoded admin first (most reliable)
    if (user.email === "admin@admin.com") {
      console.log("[v0] UNIFIED: Hardcoded admin detected:", user.email)
      return {
        role: "admin",
        isAdmin: true,
        isInstructor: false,
        email: user.email,
      }
    }

    // Try database role lookup with error handling
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!profileError && profile && profile.role) {
        console.log("[v0] UNIFIED: Database role found:", profile.role, "for user:", user.email)
        return {
          role: profile.role as "user" | "admin" | "instructor",
          isAdmin: profile.role === "admin",
          isInstructor: profile.role === "instructor",
          email: user.email,
        }
      } else {
        console.log("[v0] UNIFIED: Database role query failed or no role found:", profileError?.message)
      }
    } catch (dbError) {
      console.error("[v0] UNIFIED: Database role check error:", dbError)
    }

    // Fallback to regular user
    console.log("[v0] UNIFIED: Defaulting to regular user role for:", user.email)
    return {
      role: "user",
      isAdmin: false,
      isInstructor: false,
      email: user.email,
    }
  } catch (error) {
    console.error("[v0] UNIFIED: Error in getUserRole:", error)
    return null
  }
}

export async function requireAdmin(): Promise<UserRole> {
  const userRole = await getUserRole()
  if (!userRole || !userRole.isAdmin) {
    throw new Error("Access denied: Admin privileges required")
  }
  return userRole
}

export async function requireInstructor(): Promise<UserRole> {
  const userRole = await getUserRole()
  if (!userRole || !userRole.isInstructor) {
    throw new Error("Access denied: Instructor privileges required")
  }
  return userRole
}
