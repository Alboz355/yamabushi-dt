import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const {
      name,
      description,
      discipline_id,
      level,
      max_capacity,
      duration_minutes,
      price,
      sessions, // Array of session dates and times
    } = body

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

    // Create the class
    const { data: newClass, error: classError } = await supabase
      .from("classes")
      .insert({
        name,
        description,
        discipline_id,
        level,
        max_capacity,
        duration_minutes,
        price,
        instructor_id: instructor.id,
        is_active: true,
      })
      .select()
      .single()

    if (classError) {
      console.error("Error creating class:", classError)
      return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
    }

    // Create class sessions if provided
    if (sessions && sessions.length > 0) {
      const sessionInserts = sessions.map((session: any) => ({
        class_id: newClass.id,
        instructor_id: instructor.id,
        session_date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        status: "scheduled",
        actual_capacity: max_capacity,
      }))

      const { error: sessionsError } = await supabase.from("class_sessions").insert(sessionInserts)

      if (sessionsError) {
        console.error("Error creating sessions:", sessionsError)
        // Don't fail the entire request, just log the error
      }
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "create",
      p_resource_type: "class",
      p_resource_id: newClass.id,
      p_description: `Created new class: ${name}`,
      p_metadata: { discipline_id, level, max_capacity, sessions_count: sessions?.length || 0 },
    })

    return NextResponse.json({ class: newClass })
  } catch (error) {
    console.error("Error creating class:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

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

    // Get disciplines for the form
    const { data: disciplines, error: disciplinesError } = await supabase.from("disciplines").select("*").order("name")

    if (disciplinesError) {
      console.error("Error fetching disciplines:", disciplinesError)
      return NextResponse.json({ error: "Failed to fetch disciplines" }, { status: 500 })
    }

    // Get instructor's classes
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select(`
        *,
        disciplines:discipline_id (
          name,
          color_code
        ),
        class_sessions (
          id,
          session_date,
          start_time,
          end_time,
          status,
          bookings (
            id,
            status,
            profiles:member_id (
              first_name,
              last_name
            )
          )
        )
      `)
      .eq("instructor_id", instructor.id)
      .order("created_at", { ascending: false })

    if (classesError) {
      console.error("Error fetching classes:", classesError)
      return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
    }

    return NextResponse.json({ disciplines, classes })
  } catch (error) {
    console.error("Error in create-course API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
