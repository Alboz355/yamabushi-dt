import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    console.log("[v0] Starting instructor demotion for user:", params.userId)

    // Verify admin authentication using email
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create service role client
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get current user from token to verify admin status
    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: userError,
    } = await adminSupabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Verify admin status using email
    const adminEmails = ["admin@admin.com"]
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("[v0] Admin verification successful, proceeding with demotion")

    // Use the private function to safely demote instructor
    const { data: demotionResult, error: demotionError } = await adminSupabase.rpc("demote_instructor", {
      user_id: params.userId,
    })

    if (demotionError) {
      console.log("[v0] Error demoting instructor:", demotionError)
      // Fallback to direct operations if RPC fails

      // Update role to user
      const { error: roleError } = await adminSupabase.from("profiles").update({ role: "user" }).eq("id", params.userId)

      if (roleError) {
        console.log("[v0] Error updating role:", roleError)
        return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
      }

      // Remove from instructors table
      const { error: instructorError } = await adminSupabase
        .from("instructors")
        .delete()
        .eq("profile_id", params.userId)

      if (instructorError) {
        console.log("[v0] Error removing instructor record:", instructorError)
        return NextResponse.json({ error: "Failed to remove instructor record" }, { status: 500 })
      }
    }

    console.log("[v0] Instructor demotion completed successfully")

    return NextResponse.json({
      success: true,
      message: "User successfully demoted from instructor",
    })
  } catch (error) {
    console.error("[v0] Error in instructor demotion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
