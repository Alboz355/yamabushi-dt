import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: helpRequests, error } = await supabase
      .from("help_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching help requests:", error)
      return NextResponse.json({ error: "Failed to fetch help requests" }, { status: 500 })
    }

    return NextResponse.json(helpRequests)
  } catch (error) {
    console.error("Error in help requests API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
