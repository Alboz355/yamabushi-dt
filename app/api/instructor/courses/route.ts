import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today" // today, upcoming, all

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

    let dateFilter = {}
    const today = new Date().toISOString().split("T")[0]

    if (period === "today") {
      dateFilter = { session_date: today }
    } else if (period === "upcoming") {
      dateFilter = { session_date: { gte: today } }
    }

    // Get class sessions with participants
    const { data: sessions, error } = await supabase
      .from("class_sessions")
      .select(`
        *,
        classes:class_id (
          name,
          description,
          max_capacity,
          discipline_id,
          disciplines:discipline_id (
            name,
            color_code
          )
        ),
        bookings (
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
            belt_level,
            membership_status
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
      .eq("instructor_id", instructor.id)
      .match(dateFilter)
      .order("session_date")
      .order("start_time")

    if (error) {
      console.error("Error fetching instructor courses:", error)
      return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error("Error in instructor courses API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { class_id, session_date, start_time, end_time, notes, max_capacity } = body

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

    // Create new class session
    const { data: session, error } = await supabase
      .from("class_sessions")
      .insert({
        class_id,
        instructor_id: instructor.id,
        session_date,
        start_time,
        end_time,
        notes,
        actual_capacity: max_capacity || 20,
        status: "scheduled",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating class session:", error)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "create",
      p_resource_type: "class_session",
      p_resource_id: session.id,
      p_description: `Created new class session`,
      p_metadata: { class_id, session_date, start_time, end_time },
    })

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Error creating class session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
