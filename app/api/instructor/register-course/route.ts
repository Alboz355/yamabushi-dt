import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { courseId, sessionDate } = await request.json()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is already registered for this course session
    const { data: existingRegistration } = await supabase
      .from("instructor_course_registrations")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .eq("session_date", sessionDate)
      .single()

    if (existingRegistration) {
      return NextResponse.json({ error: "Already registered for this session" }, { status: 400 })
    }

    // Register user for the course
    const { data, error } = await supabase
      .from("instructor_course_registrations")
      .insert({
        course_id: courseId,
        user_id: user.id,
        session_date: sessionDate,
        status: "registered",
      })
      .select()
      .single()

    if (error) throw error

    // Update unified_bookings to mark as booked
    await supabase
      .from("unified_bookings")
      .update({
        user_id: user.id,
        status: "booked",
      })
      .eq("course_id", `instructor-${courseId}-${sessionDate}`)

    return NextResponse.json({ success: true, registration: data })
  } catch (error) {
    console.error("Error registering for course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
