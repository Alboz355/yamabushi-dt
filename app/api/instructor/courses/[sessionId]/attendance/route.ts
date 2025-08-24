import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const supabase = createClient()
    const { sessionId } = params
    const body = await request.json()
    const { member_id, status, notes } = body

    // Get current user and verify instructor role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify instructor owns this session
    const { data: session } = await supabase
      .from("class_sessions")
      .select(`
        instructor_id,
        instructors:instructor_id (
          profile_id
        )
      `)
      .eq("id", sessionId)
      .single()

    if (!session || session.instructors?.profile_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update or create attendance record
    const { data: attendance, error } = await supabase
      .from("attendance")
      .upsert({
        class_session_id: sessionId,
        member_id,
        status,
        notes,
        check_in_time: status === "present" ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error updating attendance:", error)
      return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 })
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "update",
      p_resource_type: "attendance",
      p_resource_id: attendance.id,
      p_description: `Marked attendance as ${status}`,
      p_metadata: { member_id, session_id: sessionId, status, notes },
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
