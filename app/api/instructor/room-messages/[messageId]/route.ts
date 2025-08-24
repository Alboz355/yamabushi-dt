import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const supabase = createClient()
    const { messageId } = params
    const body = await request.json()
    const { title, message, message_type, priority, expires_at, is_active } = body

    // Get current user and verify instructor role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify instructor owns this message
    const { data: existingMessage } = await supabase
      .from("room_messages")
      .select(`
        instructor_id,
        instructors:instructor_id (
          profile_id
        )
      `)
      .eq("id", messageId)
      .single()

    if (!existingMessage || existingMessage.instructors?.profile_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update message
    const { data: updatedMessage, error } = await supabase
      .from("room_messages")
      .update({
        title,
        message,
        message_type,
        priority,
        expires_at,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single()

    if (error) {
      console.error("Error updating room message:", error)
      return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "update",
      p_resource_type: "room_message",
      p_resource_id: messageId,
      p_description: `Updated room message: ${title}`,
      p_metadata: { message_type, priority, is_active },
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error("Error updating room message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const supabase = createClient()
    const { messageId } = params

    // Get current user and verify instructor role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify instructor owns this message
    const { data: existingMessage } = await supabase
      .from("room_messages")
      .select(`
        title,
        instructor_id,
        instructors:instructor_id (
          profile_id
        )
      `)
      .eq("id", messageId)
      .single()

    if (!existingMessage || existingMessage.instructors?.profile_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete message
    const { error } = await supabase.from("room_messages").delete().eq("id", messageId)

    if (error) {
      console.error("Error deleting room message:", error)
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
    }

    // Log the activity
    await supabase.rpc("log_activity", {
      p_user_id: user.id,
      p_user_role: "instructor",
      p_action_type: "delete",
      p_resource_type: "room_message",
      p_resource_id: messageId,
      p_description: `Deleted room message: ${existingMessage.title}`,
      p_metadata: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting room message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
