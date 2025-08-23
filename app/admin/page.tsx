import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role-check"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const role = await getUserRole()
  if (role !== "admin") {
    redirect("/dashboard")
  }

  // Get admin statistics
  const { data: totalUsers } = await supabase.from("profiles").select("id", { count: "exact" })

  const { data: totalAttendance } = await supabase.from("course_attendance").select("id", { count: "exact" })

  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact" })
    .eq("status", "active")

  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <AdminDashboard
      user={user}
      stats={{
        totalUsers: totalUsers?.length || 0,
        totalAttendance: totalAttendance?.length || 0,
        activeSubscriptions: activeSubscriptions?.length || 0,
        recentUsers: recentUsers || [],
      }}
    />
  )
}
