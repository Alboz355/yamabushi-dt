import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const userRole = searchParams.get("user_role") // 'admin', 'instructor', or 'all'
    const actionType = searchParams.get("action_type") // 'create', 'update', 'delete', etc.
    const resourceType = searchParams.get("resource_type") // 'user', 'class', 'message', etc.
    const userId = searchParams.get("user_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const search = searchParams.get("search")

    // Get current user and verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminProfile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single()

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let query = adminSupabase.from("activity_logs").select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          email,
          profile_image_url
        )
      `)

    // Apply filters
    if (userRole && userRole !== "all") {
      query = query.eq("user_role", userRole)
    }

    if (actionType && actionType !== "all") {
      query = query.eq("action_type", actionType)
    }

    if (resourceType && resourceType !== "all") {
      query = query.eq("resource_type", resourceType)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo)
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,user_role.ilike.%${search}%,action_type.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count } = await query.select("*", { count: "exact", head: true })

    // Get paginated results
    const { data: logs, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Error fetching activity logs:", error)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error in activity logs API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
