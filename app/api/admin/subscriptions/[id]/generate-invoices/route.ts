import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Generating invoices for subscription:", params.id)

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", params.id)
      .single()

    if (subError || !subscription) {
      console.error("[v0] Subscription not found:", subError)
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    console.log("[v0] Found subscription:", subscription)

    // Calculate invoice details based on subscription
    const startDate = new Date(subscription.start_date)
    const endDate = new Date(subscription.end_date)
    const invoices = []

    if (subscription.payment_method === "monthly") {
      // Generate monthly invoices
      const monthlyAmount = Math.round(subscription.price / 12)
      const currentDate = new Date(startDate)

      while (currentDate < endDate) {
        const invoiceMonth = currentDate.getMonth() + 1
        const invoiceYear = currentDate.getFullYear()

        // Check if invoice already exists
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("id")
          .eq("member_id", subscription.member_id)
          .eq("month", invoiceMonth)
          .eq("year", invoiceYear)
          .single()

        if (!existingInvoice) {
          const dueDate = new Date(currentDate)
          dueDate.setDate(5) // Due on the 5th of each month

          invoices.push({
            member_id: subscription.member_id,
            amount: monthlyAmount,
            due_date: dueDate.toISOString().split("T")[0],
            status: "pending",
            month: invoiceMonth,
            year: invoiceYear,
            subscription_id: subscription.id,
          })
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    } else if (subscription.payment_method === "annual" || subscription.payment_method === "one_time") {
      // Generate single annual invoice
      const invoiceMonth = startDate.getMonth() + 1
      const invoiceYear = startDate.getFullYear()

      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("member_id", subscription.member_id)
        .eq("month", invoiceMonth)
        .eq("year", invoiceYear)
        .single()

      if (!existingInvoice) {
        const dueDate = new Date(startDate)
        dueDate.setDate(5) // Due on the 5th of the start month

        invoices.push({
          member_id: subscription.member_id,
          amount: subscription.price,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
          month: invoiceMonth,
          year: invoiceYear,
          subscription_id: subscription.id,
        })
      }
    }

    console.log("[v0] Generated invoices to create:", invoices)

    // Insert invoices
    if (invoices.length > 0) {
      const { data: createdInvoices, error: invoiceError } = await supabase.from("invoices").insert(invoices).select()

      if (invoiceError) {
        console.error("[v0] Error creating invoices:", invoiceError)
        return NextResponse.json({ error: "Failed to create invoices" }, { status: 500 })
      }

      console.log("[v0] Successfully created invoices:", createdInvoices)
      return NextResponse.json({
        message: "Invoices generated successfully",
        invoices: createdInvoices,
        count: createdInvoices.length,
      })
    } else {
      return NextResponse.json({
        message: "No new invoices to generate",
        invoices: [],
        count: 0,
      })
    }
  } catch (error) {
    console.error("[v0] Error generating invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
