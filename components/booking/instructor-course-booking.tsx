"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, Users, UserCheck } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface InstructorCourseBookingProps {
  courseId: string
  courseName: string
  courseDate: string
  courseTime: string
  instructor: string
  location: string
  maxParticipants?: number
  currentParticipants?: number
  isBooked?: boolean
  onBookingChange?: () => void
}

export default function InstructorCourseBooking({
  courseId,
  courseName,
  courseDate,
  courseTime,
  instructor,
  location,
  maxParticipants,
  currentParticipants = 0,
  isBooked = false,
  onBookingChange,
}: InstructorCourseBookingProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleBooking = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour réserver ce cours",
          variant: "destructive",
        })
        return
      }

      if (isBooked) {
        // Cancel booking
        const { error } = await supabase
          .from("instructor_course_registrations")
          .delete()
          .eq("course_id", courseId.replace("instructor-", "").split("-")[0])
          .eq("user_id", user.id)
          .eq("session_date", courseDate)

        if (error) throw error

        // Update unified_bookings
        await supabase
          .from("unified_bookings")
          .update({
            user_id: null,
            status: "available",
          })
          .eq("course_id", courseId)

        toast({
          title: "Réservation annulée",
          description: "Votre réservation a été annulée avec succès",
        })
      } else {
        // Make booking
        const { error } = await supabase.from("instructor_course_registrations").insert({
          course_id: courseId.replace("instructor-", "").split("-")[0],
          user_id: user.id,
          session_date: courseDate,
          status: "registered",
        })

        if (error) throw error

        // Update unified_bookings
        await supabase
          .from("unified_bookings")
          .update({
            user_id: user.id,
            status: "booked",
          })
          .eq("course_id", courseId)

        toast({
          title: "Réservation confirmée",
          description: "Vous êtes inscrit(e) à ce cours !",
        })
      }

      onBookingChange?.()
    } catch (error) {
      console.error("Error handling booking:", error)
      toast({
        title: "Erreur",
        description: "Impossible de traiter votre réservation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isFull = maxParticipants && currentParticipants >= maxParticipants

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{courseName}</h3>
        <span className="text-sm text-green-600 font-medium">Gratuit</span>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(courseDate), "EEEE d MMMM yyyy", { locale: fr })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{courseTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span>Instructeur: {instructor}</span>
        </div>
        {maxParticipants && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {currentParticipants}/{maxParticipants} participants
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={handleBooking}
        disabled={loading || (isFull && !isBooked)}
        className={`w-full ${
          isBooked ? "bg-red-500 hover:bg-red-600" : isFull ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {loading ? "Chargement..." : isBooked ? "Annuler ma réservation" : isFull ? "Complet" : "J'y serai !"}
      </Button>
    </div>
  )
}
