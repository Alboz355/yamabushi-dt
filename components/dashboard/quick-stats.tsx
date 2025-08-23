import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuickStatsProps {
  userId: string
}

export async function QuickStats({ userId }: QuickStatsProps) {
  const supabase = await createClient()

  // Get stats
  const [{ count: totalBookings }, { count: upcomingBookings }, { count: attendedClasses }] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("member_id", userId),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("member_id", userId)
      .eq("status", "confirmed")
      .gte("class_sessions.session_date", new Date().toISOString().split("T")[0]),
    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("member_id", userId)
      .eq("status", "present"),
  ])

  const stats = [
    {
      title: "Cours planifiés", // replaced "Cours réservés" with "Cours planifiés"
      value: totalBookings || 0,
      description: "Total des planifications", // replaced "Total des réservations" with "Total des planifications"
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "text-primary",
    },
    {
      title: "Cours à venir",
      value: upcomingBookings || 0,
      description: "Prochaines sessions",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "text-accent",
    },
    {
      title: "Cours suivis",
      value: attendedClasses || 0,
      description: "Sessions complétées",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "text-chart-5",
    },
  ]

  return (
    <>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className={stat.color}>{stat.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
