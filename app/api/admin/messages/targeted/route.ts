import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { title, content, targetType, priority } = await request.json()

    // Create service role client to bypass RLS
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get all users using service role to avoid RLS
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")

    if (usersError) {
      throw usersError
    }

    let targetUsers = users || []

    // Filter users based on target type
    if (targetType === "active_members") {
      // Get users with active subscriptions
      const { data: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("member_id")
        .eq("status", "active")

      const activeUserIds = activeSubscriptions?.map((sub) => sub.member_id) || []
      targetUsers = users?.filter((user) => activeUserIds.includes(user.id)) || []
    } else if (targetType === "inactive_members") {
      // Get users without active subscriptions
      const { data: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("member_id")
        .eq("status", "active")

      const activeUserIds = activeSubscriptions?.map((sub) => sub.member_id) || []
      targetUsers = users?.filter((user) => !activeUserIds.includes(user.id)) || []
    } else if (targetType === "instructors") {
      // Get instructors
      const { data: instructors } = await supabase.from("instructors").select("profile_id")

      const instructorIds = instructors?.map((inst) => inst.profile_id) || []
      targetUsers = users?.filter((user) => instructorIds.includes(user.id)) || []
    }

    // Create message records for each target user
    const messagePromises = targetUsers.map((user) =>
      supabase.from("club_messages").insert({
        title,
        content,
        priority,
        user_email: user.email,
        user_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        created_at: new Date().toISOString(),
      }),
    )

    await Promise.all(messagePromises)

    return NextResponse.json({
      success: true,
      recipientCount: targetUsers.length,
    })
  } catch (error) {
    console.error("Error sending targeted message:", error)
    return NextResponse.json({ error: "Failed to send targeted message" }, { status: 500 })
  }
}
