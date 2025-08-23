"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MyBookingsListProps {
  bookings: any[]
  userId: string
}

export function MyBookingsList({ bookings, userId }: MyBookingsListProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCancelBooking = async (bookingId: string, sessionId: string) => {
    setIsLoading(bookingId)

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)

      if (bookingError) throw bookingError

      // Decrease session capacity
      const { data: session } = await supabase
        .from("class_sessions")
        .select("actual_capacity")
        .eq("id", sessionId)
        .single()

      if (session) {
        const { error: updateError } = await supabase
          .from("class_sessions")
          .update({
            actual_capacity: Math.max(0, (session.actual_capacity || 1) - 1),
          })
          .eq("id", sessionId)

        if (updateError) throw updateError
      }

      router.refresh()
    } catch (error) {
      console.error("Error cancelling booking:", error)
    } finally {
      setIsLoading(null)
    }
  }

  const now = new Date()
  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "confirmed" && new Date(booking.class_sessions?.session_date) >= now,
  )
  const pastBookings = bookings.filter((booking) => new Date(booking.class_sessions?.session_date) < now)
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled")

  const BookingCard = ({ booking, showCancelButton = false }: { booking: any; showCancelButton?: boolean }) => {
    const session = booking.class_sessions
    const classInfo = session?.classes
    const discipline = classInfo?.disciplines
    const instructor = classInfo?.instructors?.profiles

    return (
      <Card key={booking.id} className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{classInfo?.name}</CardTitle>
              <CardDescription>
                {instructor ? `${instructor.first_name} ${instructor.last_name}` : "Instructeur TBD"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `${discipline?.color_code}20`,
                  color: discipline?.color_code,
                }}
              >
                {discipline?.name}
              </Badge>
              <Badge
                variant={
                  booking.status === "confirmed"
                    ? "default"
                    : booking.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
              >
                {booking.status === "confirmed"
                  ? "Confirmé"
                  : booking.status === "cancelled"
                    ? "Annulé"
                    : booking.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">
                {session?.session_date
                  ? new Date(session.session_date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Date TBD"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Heure:</span>
              <p className="font-medium">
                {session?.start_time?.slice(0, 5)} - {session?.end_time?.slice(0, 5)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Durée:</span>
              <p className="font-medium">{classInfo?.duration_minutes} minutes</p>
            </div>
            <div>
              <span className="text-muted-foreground">Prix:</span>
              <p className="font-medium text-primary">{classInfo?.price ? `${classInfo.price}€` : "Gratuit"}</p>
            </div>
          </div>

          {showCancelButton && (
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isLoading === booking.id}>
                    {isLoading === booking.id ? "Annulation..." : "Annuler la réservation"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler la réservation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir annuler cette réservation ? Cette action ne peut pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleCancelBooking(booking.id, session.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Oui, annuler
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (bookings.length === 0) {
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
            <h3 className="font-serif text-xl text-primary mb-2">Aucune réservation</h3>
            <p className="text-muted-foreground mb-4">Vous n'avez pas encore réservé de cours.</p>
            <Button asChild>
              <Link href="/booking">Réserver un cours</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="upcoming" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upcoming">À venir ({upcomingBookings.length})</TabsTrigger>
        <TabsTrigger value="past">Passés ({pastBookings.length})</TabsTrigger>
        <TabsTrigger value="cancelled">Annulés ({cancelledBookings.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="space-y-4">
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Aucun cours à venir.</p>
                <Button asChild>
                  <Link href="/booking">Réserver un cours</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          upcomingBookings.map((booking) => <BookingCard key={booking.id} booking={booking} showCancelButton />)
        )}
      </TabsContent>

      <TabsContent value="past" className="space-y-4">
        {pastBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Aucun cours passé.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          pastBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
        )}
      </TabsContent>

      <TabsContent value="cancelled" className="space-y-4">
        {cancelledBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Aucune réservation annulée.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          cancelledBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
        )}
      </TabsContent>
    </Tabs>
  )
}
