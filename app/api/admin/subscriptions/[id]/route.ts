import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { plan_type, payment_frequency, amount, duration_months } = body
    const subscriptionId = params.id

    console.log("[v0] Updating subscription:", subscriptionId)

    // Get current subscription to calculate new end date
    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("start_date")
      .eq("id", subscriptionId)
      .single()

    if (!currentSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Calculate new end date
    const startDate = new Date(currentSub.start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + duration_months)

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .update({
        plan_type,
        payment_method: payment_frequency, // Use payment_method column instead of payment_frequency
        price: amount, // Use price column instead of amount
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating subscription:", error)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    console.log("[v0] Subscription updated successfully")

    return NextResponse.json({
      message: "Subscription updated successfully",
      subscription,
    })
  } catch (error) {
    console.error("[v0] Error in update subscription API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subscriptionId = params.id

    console.log("[v0] Deleting subscription:", subscriptionId)

    // Delete subscription
    const { error } = await supabase.from("subscriptions").delete().eq("id", subscriptionId)

    if (error) {
      console.error("[v0] Error deleting subscription:", error)
      return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
    }

    console.log("[v0] Subscription deleted successfully")

    return NextResponse.json({
      message: "Subscription deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error in delete subscription API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
