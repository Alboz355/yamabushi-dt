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

    const adminEmails = ["admin@admin.com"]
    const isAdmin = adminEmails.includes(user.email || "")

    if (!isAdmin) {
      console.log("[v0] User is not admin:", user.email)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] Admin verification successful, proceeding with promotion")

    const { error: roleUpdateError } = await adminSupabase
      .from("profiles")
      .update({ role: "instructor" })
      .eq("id", userId)

    if (roleUpdateError) {
      console.error("[v0] Error updating user role:", roleUpdateError)
      return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
    }

    console.log("[v0] Role updated successfully")

    const { data: existingInstructor } = await adminSupabase
      .from("instructors")
      .select("id")
      .eq("profile_id", userId)
      .single()

    let instructorData
    if (existingInstructor) {
      // Update existing instructor record
      const { data: updatedInstructor, error: updateError } = await adminSupabase
        .from("instructors")
        .update({
          bio: bio || "Nouvel instructeur",
          specialties: specialties || [],
          certifications: certifications || [],
          years_experience: years_experience || 0,
          is_active: true,
        })
        .eq("profile_id", userId)
        .select("id")
        .single()

      if (updateError) {
        console.error("[v0] Error updating instructor record:", updateError)
        await adminSupabase.from("profiles").update({ role: "user" }).eq("id", userId)
        return NextResponse.json({ error: "Failed to update instructor record" }, { status: 500 })
      }

      instructorData = updatedInstructor
      console.log("[v0] Instructor record updated with ID:", instructorData?.id)
    } else {
      // Create new instructor record
      const { data: newInstructor, error: instructorError } = await adminSupabase
        .from("instructors")
        .insert({
          profile_id: userId,
          bio: bio || "Nouvel instructeur",
          specialties: specialties || [],
          certifications: certifications || [],
          years_experience: years_experience || 0,
          is_active: true,
        })
        .select("id")
        .single()

      if (instructorError) {
        console.error("[v0] Error creating instructor record:", instructorError)
        await adminSupabase.from("profiles").update({ role: "user" }).eq("id", userId)
        return NextResponse.json({ error: "Failed to create instructor record" }, { status: 500 })
      }

      instructorData = newInstructor
      console.log("[v0] Instructor record created with ID:", instructorData?.id)
    }

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
          instructor_id: instructorData?.id,
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
      instructor_id: instructorData?.id,
    })
  } catch (error) {
    console.error("[v0] Error promoting user to instructor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
