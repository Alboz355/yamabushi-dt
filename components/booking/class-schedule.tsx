"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookingModal } from "./booking-modal"
import { useState } from "react"

interface ClassScheduleProps {
  sessions: any[]
  userId: string
}

export function ClassSchedule({ sessions, userId }: ClassScheduleProps) {
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleBookClass = (session: any) => {
    setSelectedSession(session)
    setIsModalOpen(true)
  }

  const groupSessionsByDate = (sessions: any[]) => {
    const grouped: { [key: string]: any[] } = {}
    sessions.forEach((session) => {
      const date = session.session_date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(session)
    })
    return grouped
  }

  const groupedSessions = groupSessionsByDate(sessions)

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-muted-foreground mx-auto mb-4"
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
            <h3 className="font-serif text-xl text-primary mb-2">Aucun cours disponible</h3>
            <p className="text-muted-foreground">
              Aucun cours ne correspond à vos critères de recherche. Essayez de modifier vos filtres.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedSessions).map(([date, dateSessions]) => (
        <Card key={date}>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="font-serif text-primary text-lg md:text-xl">
              {new Date(date).toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {dateSessions.map((session) => {
                const classInfo = session.classes
                const discipline = classInfo?.disciplines
                const instructor = classInfo?.instructors?.profiles
                const availableSpots = classInfo?.max_capacity - (session.actual_capacity || 0)

                return (
                  <Card key={session.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base md:text-lg truncate">{classInfo?.name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">
                            {instructor ? `${instructor.first_name} ${instructor.last_name}` : "Instructeur TBD"}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs flex-shrink-0"
                          style={{
                            backgroundColor: `${discipline?.color_code}20`,
                            color: discipline?.color_code,
                          }}
                        >
                          {discipline?.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{classInfo?.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>
                            {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>{availableSpots} places disponibles</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-semibold text-base md:text-lg text-primary">
                          {classInfo?.price ? `${classInfo.price}€` : "Gratuit"}
                        </span>
                        <Button
                          onClick={() => handleBookClass(session)}
                          disabled={availableSpots <= 0}
                          size="sm"
                          className={`${availableSpots <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {availableSpots <= 0 ? "Complet" : "Réserver"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <BookingModal
        session={selectedSession}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </div>
  )
}
