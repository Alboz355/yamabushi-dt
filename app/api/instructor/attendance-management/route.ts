import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Get current user and verify instructor role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get instructor info
    const { data: instructor } = await supabase.from("instructors").select("id").eq("profile_id", user.id).single()

    if (!instructor) {
      return NextResponse.json({ error: "Not an instructor" }, { status: 403 })
    }

    // Get session with participants who clicked "J'y serai"
    const { data: session, error } = await supabase
      .from("class_sessions")
      .select(`
        *,
        classes:class_id (
          name,
          description,
          max_capacity
        ),
        bookings!inner (
          id,
          status,
          created_at,
          member_id,
          profiles:member_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            profile_image_url,
            belt_level
          )
        ),
        attendance (
          id,
          status,
          check_in_time,
          check_out_time,
          notes,
          member_id
        )
      `)
      .eq("id", sessionId)
      .eq("instructor_id", instructor.id)
      .single()

    if (error) {
      console.error("Error fetching session:", error)
      return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
    }

    // Format the response to include attendance status for each participant
    const participants = session.bookings.map((booking: any) => {
      const attendance = session.attendance?.find((att: any) => att.member_id === booking.member_id)
      return {
        ...booking,
        attendance_status: attendance?.status || "pending",
        attendance_notes: attendance?.notes || "",
        check_in_time: attendance?.check_in_time || null,
        confirmed_by_instructor: attendance?.status === "confirmed" || attendance?.status === "rejected",
      }
    })

    return NextResponse.json({
      session: {
        ...session,
        participants,
      },
    })
  } catch (error) {
    console.error("Error in attendance management API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { session_id, member_id, action, notes } = body // action: "confirm" or "reject"

    // Get current user and verify instructor role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get instructor info
    const { data: instructor } = await supabase.from("instructors").select("id").eq("profile_id", user.id).single()

    if (!instructor) {
      return NextResponse.json({ error: "Not an instructor" }, { status: 403 })
    }

    // Verify the session belongs to this instructor
    const { data: session } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("instructor_id", instructor.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 })
    }

    // Update or create attendance record
    const attendanceStatus = action === "confirm" ? "confirmed" : "rejected"

    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("class_session_id", session_id)
      .eq("member_id", member_id)
      .single()

    if (existingAttendance) {
      // Update existing attendance
      const { error: updateError } = await supabase
        .from("attendance")
        .update({
          status: attendanceStatus,
          notes: notes || "",
          check_in_time: action === "confirm" ? new Date().toISOString() : null,
        })
        .eq("id", existingAttendance.id)

      if (updateError) {
        console.error("Error updating attendance:", updateError)
        return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 })
      }
    } else {
      // Create new attendance record
      const { error: insertError } = await supabase.from("attendance").insert({
        class_session_id: session_id,
        member_id: member_id,
        status: attendanceStatus,
        notes: notes || "",
        check_in_time: action === "confirm" ? new Date().toISOString() : null,
      })

      if (insertError) {
        console.error("Error creating attendance:", insertError)
        return NextResponse.json({ error: "Failed to create attendance" }, { status: 500 })
      }
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "update",
      p_resource_type: "attendance",
      p_resource_id: session_id,
      p_description: `${action === "confirm" ? "Confirmed" : "Rejected"} attendance for member`,
      p_metadata: { member_id, action, session_id },
    })

    return NextResponse.json({
      success: true,
      message: `Attendance ${action === "confirm" ? "confirmed" : "rejected"}`,
    })
  } catch (error) {
    console.error("Error managing attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
