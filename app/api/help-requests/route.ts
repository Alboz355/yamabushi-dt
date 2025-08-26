import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { subject, category, message, user_email, user_name } = await request.json()

    if (!subject || !category || !message || !user_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create service role client
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Insert help request
    const { data: helpRequest, error: helpError } = await supabase
      .from("help_requests")
      .insert({
        subject,
        category,
        message,
        user_email,
        user_name,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (helpError) {
      console.error("Error creating help request:", helpError)
      return NextResponse.json({ error: "Failed to create help request" }, { status: 500 })
    }

    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("role", "admin")

    if (adminError) {
      console.error("Error fetching admin users:", adminError)
    }

    // Create admin notifications for each admin
    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map((admin) => ({
        title: `Nouvelle demande d'aide: ${subject}`,
        message: `${user_name || user_email} a envoyé une demande d'aide dans la catégorie "${category}".`,
        type: "help_request",
        reference_id: helpRequest.id,
        recipient_email: admin.email,
        created_at: new Date().toISOString(),
      }))

      const { error: notificationError } = await supabase.from("admin_notifications").insert(notifications)

      if (notificationError) {
        console.error("Error creating admin notifications:", notificationError)
      }
    }

    return NextResponse.json({ success: true, id: helpRequest.id })
  } catch (error) {
    console.error("Error in help request API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
