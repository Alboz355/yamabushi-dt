"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface BookingModalProps {
  session: any
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function BookingModal({ session, isOpen, onClose, userId }: BookingModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  if (!session) return null

  const classInfo = session.classes
  const discipline = classInfo?.disciplines
  const instructor = classInfo?.instructors?.profiles
  const availableSpots = classInfo?.max_capacity - (session.actual_capacity || 0)

  const handleBooking = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if user already has a booking for this session
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("member_id", userId)
        .eq("class_session_id", session.id)
        .single()

      if (existingBooking) {
        setError("Vous avez déjà planifié ce cours")
        setIsLoading(false)
        return
      }

      // Create the booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        member_id: userId,
        class_session_id: session.id,
        status: "confirmed",
        payment_status: "pending",
      })

      if (bookingError) throw bookingError

      // Update session capacity
      const { error: updateError } = await supabase
        .from("class_sessions")
        .update({
          actual_capacity: (session.actual_capacity || 0) + 1,
        })
        .eq("id", session.id)

      if (updateError) throw updateError

      // Success - close modal and refresh
      onClose()
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Une erreur s'est produite lors de la planification")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary text-lg md:text-xl">Confirmer la planification</DialogTitle>
          <DialogDescription className="text-sm">
            Vérifiez les détails de votre planification avant de confirmer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-semibold text-sm md:text-base">{classInfo?.name}</h4>
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${discipline?.color_code}20`,
                  color: discipline?.color_code,
                }}
              >
                {discipline?.name}
              </Badge>
            </div>

            <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Instructeur:</span>
                <span>{instructor ? `${instructor.first_name} ${instructor.last_name}` : "TBD"}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {new Date(session.session_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Heure:</span>
                <span>
                  {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Durée:</span>
                <span>{classInfo?.duration_minutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Places disponibles:</span>
                <span>{availableSpots}</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm md:text-base">Prix:</span>
                <span className="font-bold text-lg md:text-xl text-primary">
                  {classInfo?.price ? `${classInfo.price}€` : "Gratuit"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-xs md:text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto bg-transparent">
            Annuler
          </Button>
          <Button onClick={handleBooking} disabled={isLoading || availableSpots <= 0} className="w-full sm:w-auto">
            {isLoading ? "Planification..." : "Confirmer la planification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
