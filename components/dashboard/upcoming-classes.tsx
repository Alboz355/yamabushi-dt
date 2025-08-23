import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface UpcomingClassesProps {
  bookings: any[]
}

export function UpcomingClasses({ bookings }: UpcomingClassesProps) {
  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Prochains cours</CardTitle>
          <CardDescription>Vos cours réservés à venir</CardDescription>
        </CardHeader>
        <CardContent>
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-muted-foreground mb-4">Aucun cours réservé</p>
            <Button asChild>
              <Link href="/booking">Réserver un cours</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary">Prochains cours</CardTitle>
        <CardDescription>Vos cours réservés à venir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking) => {
            const session = booking.class_sessions
            const classInfo = session?.classes
            const discipline = classInfo?.disciplines
            const instructor = classInfo?.instructors?.profiles

            return (
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{classInfo?.name}</h4>
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: `${discipline?.color_code}20`, color: discipline?.color_code }}
                    >
                      {discipline?.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {instructor ? `${instructor.first_name} ${instructor.last_name}` : "Instructeur TBD"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {session?.session_date ? new Date(session.session_date).toLocaleDateString("fr-FR") : "Date TBD"}
                    </span>
                    <span>{session?.start_time ? session.start_time.slice(0, 5) : "Heure TBD"}</span>
                  </div>
                </div>
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                  {booking.status === "confirmed" ? "Confirmé" : booking.status}
                </Badge>
              </div>
            )
          })}

          <div className="pt-4">
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/booking">Voir toutes mes réservations</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
