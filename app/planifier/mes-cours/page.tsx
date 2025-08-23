"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Clock, MapPin, User, X, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface PlannedCourse {
  id: string
  course_id: string
  course_name: string
  course_date: string
  course_time: string
  discipline?: string
  instructor?: string
  location?: string
  status?: string
  created_at: string
}

export default function MesCoursPage() {
  const [plannedCourses, setPlannedCourses] = useState<PlannedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    setUser(user)
    loadPlannedCourses(user.id)
  }

  const loadPlannedCourses = async (userId: string) => {
    console.log("[v0] Loading planned courses for user:", userId)

    try {
      const { data, error } = await supabase
        .from("course_attendance")
        .select("*")
        .eq("user_id", userId)
        .order("course_date", { ascending: true })
        .order("course_time", { ascending: true })

      if (error) {
        console.error("[v0] Error loading planned courses:", error)
        toast.error("Erreur lors du chargement des cours planifiés")
        return
      }

      console.log("[v0] Raw planned courses data:", data)

      // Process courses to add missing information for Yamabushi courses
      const processedCourses =
        data?.map((course) => {
          if (course.course_id?.startsWith("yamabushi-")) {
            const parts = course.course_id.split("-")
            if (parts.length >= 6) {
              const dayIndex = Number.parseInt(parts[4])
              const courseIndex = Number.parseInt(parts[5])
              const levelIndex = Number.parseInt(parts[6])

              const disciplines = ["Karaté", "Judo", "Aikido", "Kendo", "Jiu-Jitsu", "Muay Thai", "Boxe"]
              const instructors = [
                "Sensei Tanaka",
                "Sensei Yamamoto",
                "Sensei Sato",
                "Sensei Watanabe",
                "Sensei Suzuki",
                "Sensei Takahashi",
                "Sensei Nakamura",
              ]
              const levels = ["Débutant", "Intermédiaire", "Avancé"]

              return {
                ...course,
                discipline: disciplines[courseIndex % disciplines.length],
                instructor: instructors[courseIndex % instructors.length],
                location: "Dojo Principal",
                course_name: `${disciplines[courseIndex % disciplines.length]} - Niveau ${levels[levelIndex % levels.length]}`,
                status: "confirmed",
              }
            }
          }

          return {
            ...course,
            discipline: course.discipline || "Arts Martiaux",
            instructor: course.instructor || "Instructeur",
            location: course.location || "Dojo",
            status: course.status || "confirmed",
          }
        }) || []

      console.log("[v0] Processed planned courses:", processedCourses)
      setPlannedCourses(processedCourses)
    } catch (error) {
      console.error("[v0] Error loading planned courses:", error)
      toast.error("Erreur lors du chargement des cours planifiés")
    } finally {
      setLoading(false)
    }
  }

  const cancelCourse = async (courseId: string, courseName: string) => {
    console.log("[v0] Cancelling course:", courseId)

    try {
      const { error } = await supabase.from("course_attendance").delete().eq("id", courseId).eq("user_id", user.id)

      if (error) {
        console.error("[v0] Error cancelling course:", error)
        toast.error("Erreur lors de l'annulation du cours")
        return
      }

      console.log("[v0] Course cancelled successfully")
      toast.success(`Cours "${courseName}" annulé avec succès`)

      // Reload courses
      loadPlannedCourses(user.id)
    } catch (error) {
      console.error("[v0] Error cancelling course:", error)
      toast.error("Erreur lors de l'annulation du cours")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    if (timeString.includes(":")) {
      return timeString.substring(0, 5)
    }
    return timeString
  }

  const isUpcoming = (dateString: string) => {
    const courseDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return courseDate >= today
  }

  const upcomingCourses = plannedCourses.filter((course) => isUpcoming(course.course_date))
  const pastCourses = plannedCourses.filter((course) => !isUpcoming(course.course_date))

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement de vos cours planifiés...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Dashboard
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes Cours Planifiés</h1>
        <p className="text-muted-foreground">Gérez vos cours planifiés et annulez facilement si nécessaire</p>
      </div>

      {plannedCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun cours planifié</h3>
            <p className="text-muted-foreground text-center mb-4">
              Vous n'avez pas encore planifié de cours. Commencez par explorer nos cours disponibles.
            </p>
            <Button asChild>
              <a href="/booking">Planifier un cours</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcomingCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-green-600" />
                Cours à venir ({upcomingCourses.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingCourses.map((course) => (
                  <Card key={course.id} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{course.course_name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary">{course.discipline}</Badge>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelCourse(course.id, course.course_name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(course.course_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(course.course_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{course.location}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✓ Planifié
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelCourse(course.id, course.course_name)}
                          className="text-destructive hover:text-destructive"
                        >
                          Annuler
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-6 w-6 text-muted-foreground" />
                Cours passés ({pastCourses.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastCourses.map((course) => (
                  <Card key={course.id} className="border-l-4 border-l-gray-300 opacity-75">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{course.course_name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary">{course.discipline}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(course.course_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(course.course_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{course.location}</span>
                      </div>
                      <Separator />
                      <Badge variant="outline" className="text-muted-foreground">
                        Terminé
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
