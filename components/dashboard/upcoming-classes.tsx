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
          <CardTitle className="font-serif text-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Cours à venir
          </CardTitle>
          <CardDescription>Vos prochains cours confirmés</CardDescription>
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
            <p className="text-muted-foreground mb-4">Aucun cours planifié</p>
            <Button asChild>
              <Link href="/booking">Planifier un cours</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getDaysUntil = (dateString: string) => {
    const courseDate = new Date(dateString)
    const today = new Date()
    const diffTime = courseDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const displayedBookings = bookings.slice(0, 2)
  const hasMoreBookings = bookings.length > 2

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Cours à venir
        </CardTitle>
        <CardDescription>Vos prochains cours confirmés ({bookings.length})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedBookings.map((booking) => {
            const daysUntil = booking.course_date ? getDaysUntil(booking.course_date) : null

            return (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h4 className="font-semibold">{booking.course_name || booking.discipline}</h4>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {booking.discipline}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{booking.instructor || "Instructeur TBD"}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {booking.course_date ? new Date(booking.course_date).toLocaleDateString("fr-FR") : "Date TBD"}
                    </span>
                    <span>{booking.course_time ? booking.course_time.slice(0, 5) : "Heure TBD"}</span>
                    <span>📍 {booking.club_location || "Yamabushi Academy"}</span>
                    {daysUntil !== null && (
                      <Badge variant="outline" className="text-xs">
                        {daysUntil === 0
                          ? "Aujourd'hui"
                          : daysUntil === 1
                            ? "Demain"
                            : daysUntil > 1
                              ? `Dans ${daysUntil} jours`
                              : "Passé"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="default" className="bg-green-600">
                    ✓ Planifié
                  </Badge>
                </div>
              </div>
            )
          })}

          <div className="pt-4 space-y-2">
            {hasMoreBookings && (
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/planifier/mes-cours">Voir tout ({bookings.length} cours)</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/booking">Gérer mes planifications</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
