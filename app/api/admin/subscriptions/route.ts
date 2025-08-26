import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET() {
  try {
    console.log("[v0] Loading subscriptions with user data...")

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })

    if (subscriptionsError) {
      console.error("[v0] Error loading subscriptions:", subscriptionsError)
      return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 })
    }

    const memberIds = [...new Set(subscriptions?.map((sub) => sub.member_id).filter(Boolean))] || []

    let profiles = []
    if (memberIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, created_at")
        .in("id", memberIds)

      if (profilesError) {
        console.error("[v0] Error loading profiles:", profilesError)
        // Continue without profiles data instead of failing
      } else {
        profiles = profilesData || []
      }
    }

    const transformedSubscriptions =
      subscriptions?.map((sub) => {
        const userProfile = profiles.find((profile) => profile.id === sub.member_id)
        return {
          ...sub,
          user_id: sub.member_id, // Map member_id to user_id for frontend compatibility
          amount: sub.price || 0, // Map price to amount for frontend compatibility
          payment_frequency: sub.payment_method || "monthly", // Map payment_method to payment_frequency
          user: userProfile || {
            id: sub.member_id,
            email: "Unknown",
            first_name: "Unknown",
            last_name: "User",
            role: "user",
            created_at: null,
          },
        }
      }) || []

    console.log(`[v0] Successfully loaded ${transformedSubscriptions.length} subscriptions`)

    return NextResponse.json({
      subscriptions: transformedSubscriptions,
    })
  } catch (error) {
    console.error("[v0] Error in subscriptions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, plan_type, payment_frequency, amount, duration_months, notes } = body

    console.log("[v0] Creating/updating subscription for user:", user_id)

    // Calculate end date based on duration
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + duration_months)

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          member_id: user_id, // Use member_id column
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          plan_type,
          payment_method: payment_frequency, // Map to correct column
          price: amount, // Use price column instead of amount
          auto_renew: payment_frequency === "monthly", // Set auto_renew based on frequency
        },
        {
          onConflict: "member_id", // Specify the unique constraint column
        },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating/updating subscription:", error)
      return NextResponse.json({ error: "Failed to create/update subscription" }, { status: 500 })
    }

    console.log("[v0] Subscription created/updated successfully:", subscription.id)

    return NextResponse.json({
      message: "Subscription created/updated successfully",
      subscription,
    })
  } catch (error) {
    console.error("[v0] Error in create subscription API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
