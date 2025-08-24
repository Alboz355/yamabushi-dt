import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { userId } = params
    const body = await request.json()
    const { specialties, bio, certifications, years_experience } = body

    console.log("[v0] Starting instructor promotion for user:", userId)

    // Get current user to verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminProfile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single()

    if (adminProfile?.role !== "admin") {
      console.log("[v0] User is not admin:", adminProfile?.role)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] Admin verification successful, proceeding with promotion")

    // Step 1: Update user role using safe function
    const { data: roleUpdateResult, error: roleUpdateError } = await adminSupabase.rpc("safe_update_user_role", {
      user_id: userId,
      new_role: "instructor",
    })

    if (roleUpdateError) {
      console.error("[v0] Error updating user role:", roleUpdateError)
      return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
    }

    if (!roleUpdateResult) {
      console.error("[v0] Role update returned false - user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Role updated successfully")

    // Step 2: Create or update instructor record using safe function
    const { data: instructorId, error: instructorError } = await adminSupabase.rpc("safe_create_instructor", {
      user_id: userId,
      instructor_bio: bio || "Nouvel instructeur",
      instructor_specialties: specialties || [],
      instructor_certifications: certifications || [],
      instructor_years_experience: years_experience || 0,
    })

    if (instructorError) {
      console.error("[v0] Error creating instructor record:", instructorError)
      // Rollback role change
      await adminSupabase.rpc("safe_update_user_role", {
        user_id: userId,
        new_role: "user",
      })
      return NextResponse.json({ error: "Failed to create instructor record" }, { status: 500 })
    }

    console.log("[v0] Instructor record created/updated with ID:", instructorId)

    // Step 3: Log the activity (non-critical)
    try {
      await adminSupabase.from("activity_logs").insert({
        user_id: user.id,
        user_role: "admin",
        action_type: "promote",
        resource_type: "user_role",
        resource_id: userId,
        description: `Promoted user to instructor role`,
        metadata: {
          promoted_user_id: userId,
          instructor_id: instructorId,
          specialties: specialties || [],
          bio: bio || "Nouvel instructeur",
          certifications: certifications || [],
          years_experience: years_experience || 0,
        },
      })
      console.log("[v0] Activity logged successfully")
    } catch (logError) {
      // Log error but don't fail the promotion
      console.error("[v0] Error logging activity (non-critical):", logError)
    }

    console.log("[v0] Instructor promotion completed successfully")

    return NextResponse.json({
      success: true,
      message: "User successfully promoted to instructor",
      instructor_id: instructorId,
    })
  } catch (error) {
    console.error("[v0] Error promoting user to instructor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
