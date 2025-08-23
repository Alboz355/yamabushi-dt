import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error("[v0] Error fetching auth users:", authError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles").select("*")

    if (profilesError) {
      console.error("[v0] Error fetching profiles:", profilesError)
    }

    const { data: subscriptions, error: subsError } = await supabaseAdmin.from("subscriptions").select("*")

    if (subsError) {
      console.error("[v0] Error fetching subscriptions:", subsError)
    }

    const { data: invoices, error: invoicesError } = await supabaseAdmin.from("invoices").select("*")

    if (invoicesError) {
      console.error("[v0] Error fetching invoices:", invoicesError)
    }

    const enrichedUsers = authUsers.users.map((user) => {
      const profile = profiles?.find((p) => p.id === user.id)
      const userSubscriptions = subscriptions?.filter((s) => s.member_id === user.id) || []
      const userInvoices = invoices?.filter((i) => i.member_id === user.id) || []

      // Calculate subscription status
      const activeSubscription = userSubscriptions.find((s) => s.status === "active")
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      // Check if current month invoice is paid
      const currentMonthInvoice = userInvoices.find(
        (i) => i.month === currentMonth && i.year === currentYear && i.status === "paid",
      )

      return {
        id: user.id,
        email: user.email,
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        phone: profile?.phone || "",
        role: profile?.role || "user",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        subscription_status: activeSubscription?.status || "none",
        subscription_plan: activeSubscription?.plan_type || "none",
        subscription_expires_at: activeSubscription?.end_date || null,
        monthly_payment_status: currentMonthInvoice ? "paid" : "unpaid",
        total_invoices: userInvoices.length,
        unpaid_invoices: userInvoices.filter((i) => i.status === "pending").length,
      }
    })

    console.log(`[v0] Successfully loaded ${enrichedUsers.length} users from admin API`)

    return NextResponse.json({
      users: enrichedUsers,
      total_invoices: invoices?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Admin users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
