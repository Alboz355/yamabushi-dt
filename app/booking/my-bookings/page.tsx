import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MyBookingsList } from "@/components/booking/my-bookings-list"

export default async function MyBookingsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Get user's bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      class_sessions (
        *,
        classes (
          name,
          description,
          duration_minutes,
          price,
          disciplines (name, color_code),
          instructors (
            profiles (first_name, last_name)
          )
        )
      )
    `)
    .eq("member_id", data.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Mes réservations</h1>
          <p className="text-muted-foreground">Gérez vos cours réservés</p>
        </div>

        <MyBookingsList bookings={bookings || []} userId={data.user.id} />
      </div>
    </div>
  )
}
