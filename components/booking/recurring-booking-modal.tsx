"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, Repeat, X } from "lucide-react"
import { format, addWeeks } from "date-fns"
import { fr } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface RecurringBookingModalProps {
  isOpen: boolean
  onClose: () => void
  course: any
  user: any
}

export function RecurringBookingModal({ isOpen, onClose, course, user }: RecurringBookingModalProps) {
  const [duration, setDuration] = useState("4") // weeks
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const durationOptions = [
    { value: "2", label: "2 semaines" },
    { value: "4", label: "1 mois (4 semaines)" },
    { value: "8", label: "2 mois (8 semaines)" },
    { value: "12", label: "3 mois (12 semaines)" },
  ]

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString)
    return date.getDay()
  }

  const generateRecurringDates = () => {
    const startDate = new Date(course.date)
    const weeks = Number.parseInt(duration)
    const dates = []

    for (let i = 0; i < weeks; i++) {
      const recurringDate = addWeeks(startDate, i)
      dates.push(format(recurringDate, "yyyy-MM-dd"))
    }

    return dates
  }

  const handleCreateRecurring = async () => {
    if (!user) {
      toast.error("Vous devez être connecté")
      return
    }

    setLoading(true)

    try {
      const dayOfWeek = getDayOfWeek(course.date)
      const timeSlot = `${course.startTime}-${course.endTime}`
      const startDate = new Date(course.date)
      const endDate = addWeeks(startDate, Number.parseInt(duration))

      // Create recurring booking record
      const { error: recurringError } = await supabase.from("recurring_bookings").insert({
        user_id: user.id,
        course_pattern: course.id.replace(/\d{4}-\d{2}-\d{2}/, "*-*-*"), // Replace date with wildcards
        discipline_name: course.discipline.name,
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })

      if (recurringError) {
        console.error("[v0] Error creating recurring booking:", recurringError)
        toast.error("Erreur lors de la création de la planification récurrente")
        return
      }

      // Generate individual course attendance records
      const recurringDates = generateRecurringDates()
      const attendanceRecords = []

      for (const date of recurringDates) {
        // Generate course ID for this specific date
        const dateParts = date.split("-")
        const courseIdParts = course.id.split("-")
        const newCourseId = `${courseIdParts[0]}-${dateParts[0]}-${dateParts[1]}-${dateParts[2]}-${courseIdParts[4]}-${courseIdParts[5]}-${courseIdParts[6]}`

        attendanceRecords.push({
          course_id: newCourseId,
          user_id: user.id,
          course_name: course.discipline.name,
          course_date: date,
          course_time: course.startTime,
        })
      }

      // Insert all attendance records
      const { error: attendanceError } = await supabase.from("course_attendance").upsert(attendanceRecords, {
        onConflict: "course_id,user_id",
      })

      if (attendanceError) {
        console.error("[v0] Error creating recurring attendance:", attendanceError)
        toast.error("Erreur lors de la planification des cours")
        return
      }

      toast.success(`Planification récurrente créée ! ${recurringDates.length} cours planifiés.`)
      onClose()

      // Refresh the page to show updated courses
      window.location.reload()
    } catch (error) {
      console.error("[v0] Error in recurring booking:", error)
      toast.error("Erreur lors de la planification récurrente")
    } finally {
      setLoading(false)
    }
  }

  const previewDates = generateRecurringDates()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Planification Récurrente
          </DialogTitle>
          <DialogDescription>Planifiez automatiquement votre présence à ce cours chaque semaine</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{course.discipline.emoji}</span>
              <div>
                <div className="font-semibold">{course.discipline.name}</div>
                <div className="text-sm text-muted-foreground">avec {course.instructor}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(course.date), "EEEE", { locale: fr })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {course.startTime} - {course.endTime}
              </div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Durée de la planification</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Aperçu des cours planifiés ({previewDates.length})</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 bg-muted/20 rounded-lg p-3">
              {previewDates.map((date, index) => (
                <div key={date} className="text-sm flex items-center justify-between">
                  <span>{format(new Date(date), "EEEE d MMMM", { locale: fr })}</span>
                  <span className="text-muted-foreground">{course.startTime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleCreateRecurring} disabled={loading} className="flex-1">
              <Repeat className="h-4 w-4 mr-2" />
              {loading ? "Planification..." : "Planifier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
