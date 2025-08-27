"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface CourseBookingButtonProps {
  courseId: string
  sessionDate: string
  isBooked?: boolean
  onBookingChange?: () => void
}

export function CourseBookingButton({
  courseId,
  sessionDate,
  isBooked = false,
  onBookingChange,
}: CourseBookingButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handleBooking = async () => {
    setLoading(true)
    try {
      // Extract instructor course ID from course_id format: "instructor-{id}-{date}"
      const instructorCourseId = courseId.replace("instructor-", "").split("-")[0]

      const response = await fetch("/api/instructor/register-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: instructorCourseId,
          sessionDate,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to register")
      }

      toast({
        title: "Inscription réussie !",
        description: "Vous êtes maintenant inscrit(e) à ce cours.",
      })

      onBookingChange?.()
    } catch (error) {
      console.error("Booking error:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de s'inscrire au cours",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (isBooked) {
    return (
      <Button variant="outline" disabled className="w-full bg-transparent">
        ✓ Inscrit(e)
      </Button>
    )
  }

  return (
    <Button onClick={handleBooking} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
      {loading ? "Inscription..." : "J'y serai"}
    </Button>
  )
}
