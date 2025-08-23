import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { action } = await request.json()
    console.log("[SERVER] [v0] Invoice action:", action, "for invoice:", params.invoiceId)

    // Create admin client with service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    let updateData: any = {}

    if (action === "cancel") {
      updateData = { status: "cancelled" }
    } else if (action === "refund") {
      updateData = { status: "refunded", paid_at: null }
    }

    const { data, error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", params.invoiceId)
      .select()
      .single()

    if (error) {
      console.error("[SERVER] [v0] Error updating invoice:", error)
      return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
    }

    console.log("[SERVER] [v0] Successfully updated invoice:", params.invoiceId, "with action:", action)

    return NextResponse.json({ invoice: data })
  } catch (error) {
    console.error("[SERVER] [v0] Error in invoice update API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
