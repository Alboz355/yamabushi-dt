import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RecentActivityProps {
  userId: string
}

export async function RecentActivity({ userId }: RecentActivityProps) {
  const supabase = await createClient()

  // Get recent attendance
  const { data: recentAttendance } = await supabase
    .from("attendance")
    .select(`
      *,
      class_sessions (
        session_date,
        classes (
          name,
          disciplines (name, color_code)
        )
      )
    `)
    .eq("member_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary">Activité récente</CardTitle>
        <CardDescription>Vos dernières sessions d'entraînement</CardDescription>
      </CardHeader>
      <CardContent>
        {!recentAttendance || recentAttendance.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-muted-foreground mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-muted-foreground">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAttendance.map((attendance) => {
              const session = attendance.class_sessions
              const classInfo = session?.classes
              const discipline = classInfo?.disciplines

              return (
                <div key={attendance.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: discipline?.color_code || "#be123c" }}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{classInfo?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session?.session_date
                        ? new Date(session.session_date).toLocaleDateString("fr-FR")
                        : "Date inconnue"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {attendance.status === "present"
                      ? "Présent"
                      : attendance.status === "late"
                        ? "En retard"
                        : "Absent"}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
