import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    console.log("[SERVER] [v0] Loading invoices for user:", params.userId)

    // Create admin client with service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get invoices for the specific user
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        amount,
        status,
        month,
        year,
        due_date,
        paid_at,
        created_at,
        subscription_id,
        member_id
      `)
      .eq("member_id", params.userId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    if (invoicesError) {
      console.error("[SERVER] [v0] Error loading user invoices:", invoicesError)
      return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 })
    }

    console.log("[SERVER] [v0] Successfully loaded", invoices?.length || 0, "invoices for user:", params.userId)

    return NextResponse.json({
      invoices: invoices || [],
      count: invoices?.length || 0,
    })
  } catch (error) {
    console.error("[SERVER] [v0] Error in user invoices API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
