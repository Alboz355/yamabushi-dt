import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    // Get instructor's room messages
    const { data: messages, error } = await supabase
      .from("room_messages")
      .select("*")
      .eq("instructor_id", instructor.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching room messages:", error)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error("Error in room messages API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { room_name, title, message, message_type, priority, expires_at } = body

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

    // Create room message
    const { data: roomMessage, error } = await supabase
      .from("room_messages")
      .insert({
        instructor_id: instructor.id,
        room_name,
        title,
        message,
        message_type: message_type || "info",
        priority: priority || 1,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating room message:", error)
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "create",
      p_resource_type: "room_message",
      p_resource_id: roomMessage.id,
      p_description: `Created room message: ${title}`,
      p_metadata: { room_name, message_type, priority },
    })

    return NextResponse.json({ message: roomMessage })
  } catch (error) {
    console.error("Error creating room message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
