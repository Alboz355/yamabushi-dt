"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Star, Eye, Repeat } from "lucide-react"
import { format, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import { BottomNav } from "@/components/mobile/bottom-nav"
import { toast } from "sonner"
import { RecurringBookingModal } from "@/components/booking/recurring-booking-modal"

export default function BookingPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [attendanceData, setAttendanceData] = useState({})
  const [filters, setFilters] = useState({
    discipline: "all",
    club: "all",
    date: format(new Date(), "yyyy-MM-dd"),
  })
  const [recurringModal, setRecurringModal] = useState({ isOpen: false, course: null })

  const supabase = createClient()

  const yamabushiDisciplines = [
    {
      id: "1",
      name: "Kickboxing",
      emoji: "🦵",
      description: "Boxe avec coups de pieds",
      color: "#ef4444",
      courseCount: 56,
    },
    { id: "2", name: "JJB", emoji: "🇧🇷", description: "Jiu-Jitsu Brésilien", color: "#3b82f6", courseCount: 42 },
    { id: "3", name: "Muay Thai", emoji: "🇹🇭", description: "Boxe thaïlandaise", color: "#ec4899", courseCount: 36 },
    {
      id: "4",
      name: "Grappling",
      emoji: "🤼",
      description: "Lutte au sol sans kimono",
      color: "#22c55e",
      courseCount: 35,
    },
    { id: "5", name: "MMA", emoji: "⚔️", description: "Arts martiaux mixtes", color: "#d946ef", courseCount: 23 },
    {
      id: "6",
      name: "Boxe anglaise",
      emoji: "🥊",
      description: "Boxe traditionnelle",
      color: "#f97316",
      courseCount: 14,
    },
    {
      id: "7",
      name: "Cross Training",
      emoji: "🏋️",
      description: "Entraînement fonctionnel",
      color: "#eab308",
      courseCount: 11,
    },
    { id: "8", name: "Jiu-Jitsu", emoji: "🥋", description: "Art martial japonais", color: "#06b6d4", courseCount: 7 },
    { id: "9", name: "Cardio Boxing", emoji: "💪", description: "Boxe fitness", color: "#8b5cf6", courseCount: 4 },
    {
      id: "10",
      name: "Lutte",
      emoji: "🤼‍♂️",
      description: "Sport de combat olympique",
      color: "#a855f7",
      courseCount: 4,
    },
    {
      id: "11",
      name: "Musculation",
      emoji: "💪",
      description: "Renforcement musculaire",
      color: "#f43f5e",
      courseCount: 3,
    },
    { id: "12", name: "Judo", emoji: "🥋", description: "Art martial olympique", color: "#6366f1", courseCount: 2 },
  ]

  const yamabushiClubs = [
    { id: "1", name: "Yamabushi Genève Centre", emoji: "🏢", address: "Rue du Rhône 65, 1207 Genève" },
    { id: "2", name: "Yamabushi Genève Plainpalais", emoji: "🏛️", address: "Plaine de Plainpalais 12, 1205 Genève" },
    { id: "3", name: "Yamabushi Lausanne", emoji: "🏔️", address: "Avenue de la Gare 33, 1003 Lausanne" },
    { id: "4", name: "Yamabushi Montreux", emoji: "🌊", address: "Grand-Rue 87, 1820 Montreux" },
  ]

  const yamabushiInstructors = [
    "Sensei Takeshi Yamamoto",
    "Coach Sarah Martinez",
    "Maître Jean-Luc Dubois",
    "Professor Carlos Silva",
    "Kru Somchai Jaidee",
    "Coach Mike Thompson",
    "Sensei Akira Tanaka",
    "Coach Elena Rossi",
    "Maître Pierre Moreau",
  ]

  useEffect(() => {
    loadUserAndCourses()
  }, [filters])

  useEffect(() => {
    if (!user) return

    console.log("[v0] Setting up real-time attendance subscription")

    const channel = supabase
      .channel("course_attendance_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_attendance",
        },
        (payload) => {
          console.log("[v0] Real-time attendance update:", payload)
          // Only refresh if we have courses loaded
          if (courses.length > 0) {
            const courseIds = courses.map((c) => c.id)
            loadAllAttendanceData(courseIds)
          }
        },
      )
      .subscribe()

    return () => {
      console.log("[v0] Cleaning up real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [user, courses.length]) // Depend on courses.length instead of courses array

  useEffect(() => {
    if (!user || courses.length === 0) return

    const refreshInterval = setInterval(() => {
      console.log("[v0] Auto-refreshing attendance data...")
      const courseIds = courses.map((c) => c.id)
      loadAllAttendanceData(courseIds)
    }, 60000) // Refresh every minute

    return () => clearInterval(refreshInterval)
  }, [user, courses])

  const loadUserAndCourses = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        redirect("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single()

      setUser(userData.user)
      setProfile(profileData)

      await loadYamabushiCourses()
    } catch (error) {
      console.error("[v0] Error loading user and courses:", error)
      setLoading(false)
    }
  }

  const getInstructorForCourse = (courseId, disciplineName) => {
    // Create a simple hash from courseId to ensure consistent instructor assignment
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      const char = courseId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get consistent index
    const instructorIndex = Math.abs(hash) % yamabushiInstructors.length
    return yamabushiInstructors[instructorIndex]
  }

  const getClubForCourse = (courseId) => {
    // Create a simple hash from courseId to ensure consistent club assignment
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      const char = courseId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get consistent index
    const clubIndex = Math.abs(hash) % yamabushiClubs.length
    return yamabushiClubs[clubIndex]
  }

  const loadYamabushiCourses = async () => {
    try {
      console.log("[v0] Loading Yamabushi courses...")

      // First, try to load real courses from database
      const { data: realCourses, error: coursesError } = await supabase
        .from("class_sessions")
        .select(`
          *,
          classes (
            *,
            disciplines (*),
            instructors (*)
          )
        `)
        .gte("session_date", format(new Date(filters.date), "yyyy-MM-dd"))
        .lte("session_date", format(addDays(new Date(filters.date), 6), "yyyy-MM-dd"))

      if (!coursesError && realCourses && realCourses.length > 0) {
        console.log("[v0] Using real database courses:", realCourses.length)
        // Use real courses from database
        const formattedCourses = realCourses.map((session) => ({
          id: session.id,
          discipline: {
            name: session.classes.disciplines.name,
            emoji: getEmojiForDiscipline(session.classes.disciplines.name),
            color: session.classes.disciplines.color_code || getColorForDiscipline(session.classes.disciplines.name),
          },
          date: session.session_date,
          startTime: session.start_time?.slice(0, 5) || "09:00",
          endTime: session.end_time?.slice(0, 5) || "10:30",
          instructor:
            session.classes.instructors?.profiles?.first_name +
              " " +
              session.classes.instructors?.profiles?.last_name || "Instructeur",
          club: yamabushiClubs[0], // Default club
          room: "Dojo Principal",
          rating: 4.5,
          expectedAttendance: 0,
          userAttending: false,
          attendanceLevel: 0,
        }))

        const courseIds = formattedCourses.map((course) => course.id)
        const attendanceResults = await loadAllAttendanceDataSync(courseIds)

        const coursesWithAttendance = formattedCourses.map((course) => ({
          ...course,
          expectedAttendance: attendanceResults[course.id]?.count || 0,
          userAttending: attendanceResults[course.id]?.userAttending || false,
          attendanceLevel: (attendanceResults[course.id]?.count || 0) / 20,
        }))

        setCourses(coursesWithAttendance)
        setLoading(false)
        return
      }

      // Fallback: Generate consistent Yamabushi courses with deterministic IDs
      console.log("[v0] Generating consistent Yamabushi courses...")
      const generatedCourses = []
      const selectedDate = new Date(filters.date)

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const courseDate = addDays(selectedDate, dayOffset)
        const dayOfWeek = courseDate.getDay()
        const dateString = format(courseDate, "yyyy-MM-dd")

        const schedulesByDay = {
          1: [
            { time: "07:00-08:30", disciplines: ["Cross Training", "Musculation"] },
            { time: "12:00-13:30", disciplines: ["Kickboxing", "Boxe anglaise"] },
            { time: "18:00-19:30", disciplines: ["JJB", "Grappling"] },
            { time: "19:45-21:15", disciplines: ["Muay Thai", "MMA"] },
          ],
          2: [
            { time: "12:00-13:30", disciplines: ["Cardio Boxing", "Cross Training"] },
            { time: "18:00-19:30", disciplines: ["Kickboxing", "Jiu-Jitsu"] },
            { time: "19:45-21:15", disciplines: ["JJB", "Grappling"] },
          ],
          3: [
            { time: "07:00-08:30", disciplines: ["Musculation", "Cross Training"] },
            { time: "18:00-19:30", disciplines: ["Muay Thai", "Boxe anglaise"] },
            { time: "19:45-21:15", disciplines: ["MMA", "Kickboxing"] },
          ],
          4: [
            { time: "12:00-13:30", disciplines: ["JJB", "Grappling"] },
            { time: "18:00-19:30", disciplines: ["Kickboxing", "Lutte"] },
            { time: "19:45-21:15", disciplines: ["Muay Thai", "Judo"] },
          ],
          5: [
            { time: "07:00-08:30", disciplines: ["Cross Training", "Cardio Boxing"] },
            { time: "18:00-19:30", disciplines: ["JJB", "MMA"] },
            { time: "19:45-21:15", disciplines: ["Kickboxing", "Boxe anglaise"] },
          ],
          6: [
            { time: "09:00-10:30", disciplines: ["Judo", "Jiu-Jitsu"] },
            { time: "10:45-12:15", disciplines: ["Kickboxing", "Muay Thai"] },
            { time: "14:00-15:30", disciplines: ["JJB", "Grappling"] },
            { time: "16:00-17:30", disciplines: ["MMA", "Cross Training"] },
          ],
          0: [
            { time: "10:00-11:30", disciplines: ["Cardio Boxing", "Musculation"] },
            { time: "11:45-13:15", disciplines: ["JJB", "Kickboxing"] },
          ],
        }

        const daySchedule = schedulesByDay[dayOfWeek] || []

        daySchedule.forEach((slot, slotIndex) => {
          slot.disciplines.forEach((disciplineName, discIndex) => {
            const discipline = yamabushiDisciplines.find((d) => d.name === disciplineName)
            if (!discipline) return

            const [startTime, endTime] = slot.time.split("-")
            const courseId = `yamabushi-${dateString}-${dayOfWeek}-${slotIndex}-${discIndex}`

            generatedCourses.push({
              id: courseId,
              discipline: {
                name: discipline.name,
                emoji: discipline.emoji,
                color: discipline.color,
              },
              date: dateString,
              startTime: startTime,
              endTime: endTime,
              instructor: getInstructorForCourse(courseId, discipline.name),
              club: getClubForCourse(courseId),
              room: ["Dojo Principal", "Salle de Boxe", "Espace Grappling", "Ring MMA"][
                Math.abs(courseId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 4
              ],
              rating: 4.2 + (Math.abs(courseId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 60) / 100,
              expectedAttendance: 0,
              userAttending: false,
              attendanceLevel: 0,
            })
          })
        })
      }

      console.log("[v0] Generated", generatedCourses.length, "Yamabushi courses")

      const courseIds = generatedCourses.map((course) => course.id)
      const attendanceResults = await loadAllAttendanceDataSync(courseIds)

      const coursesWithAttendance = generatedCourses.map((course) => ({
        ...course,
        expectedAttendance: attendanceResults[course.id]?.count || 0,
        userAttending: attendanceResults[course.id]?.userAttending || false,
        attendanceLevel: (attendanceResults[course.id]?.count || 0) / 20,
      }))

      // Apply filters
      const filteredCourses = coursesWithAttendance.filter((course) => {
        if (filters.discipline !== "all") {
          const selectedDiscipline = yamabushiDisciplines.find((d) => d.id === filters.discipline)
          if (selectedDiscipline && course.discipline.name !== selectedDiscipline.name) return false
        }
        if (filters.club !== "all" && course.club.id !== filters.club) return false
        return true
      })

      setCourses(filteredCourses)
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading Yamabushi courses:", error)
      setCourses([])
      setLoading(false)
    }
  }

  const getEmojiForDiscipline = (disciplineName) => {
    const discipline = yamabushiDisciplines.find(
      (d) =>
        d.name.toLowerCase().includes(disciplineName.toLowerCase()) ||
        disciplineName.toLowerCase().includes(d.name.toLowerCase()),
    )
    return discipline?.emoji || "🥋"
  }

  const getColorForDiscipline = (disciplineName) => {
    const discipline = yamabushiDisciplines.find(
      (d) =>
        d.name.toLowerCase().includes(disciplineName.toLowerCase()) ||
        disciplineName.toLowerCase().includes(d.name.toLowerCase()),
    )
    return discipline?.color || "#6366f1"
  }

  const loadAllAttendanceDataSync = async (courseIds) => {
    if (!courseIds || courseIds.length === 0) return {}

    try {
      console.log("[v0] Loading real attendance data for courses:", courseIds.length)

      const { data: attendanceRecords, error } = await supabase
        .from("course_attendance")
        .select("course_id, user_id")
        .in("course_id", courseIds)

      if (error) {
        console.log("[v0] Course attendance table not ready:", error.message)
        const emptyAttendanceData = {}
        courseIds.forEach((courseId) => {
          emptyAttendanceData[courseId] = {
            count: 0,
            userAttending: false,
          }
        })
        return emptyAttendanceData
      }

      const newAttendanceData = {}

      courseIds.forEach((courseId) => {
        const courseAttendance = attendanceRecords.filter((record) => record.course_id === courseId)
        newAttendanceData[courseId] = {
          count: courseAttendance.length,
          userAttending: user ? courseAttendance.some((record) => record.user_id === user.id) : false,
        }
      })

      console.log("[v0] Real attendance data loaded:", Object.keys(newAttendanceData).length, "courses")
      setAttendanceData(newAttendanceData)
      return newAttendanceData
    } catch (error) {
      console.error("[v0] Error loading attendance data:", error)
      return {}
    }
  }

  const loadAllAttendanceData = async (courseIds) => {
    const results = await loadAllAttendanceDataSync(courseIds)

    setCourses((prevCourses) =>
      prevCourses.map((course) => ({
        ...course,
        expectedAttendance: results[course.id]?.count || 0,
        userAttending: results[course.id]?.userAttending || false,
        attendanceLevel: (results[course.id]?.count || 0) / 20,
      })),
    )
  }

  const toggleAttendance = async (course) => {
    if (!user) {
      toast.error("Vous devez être connecté pour indiquer votre présence")
      return
    }

    try {
      console.log("[v0] Toggling real attendance for course:", course.id, "User attending:", course.userAttending)

      if (course.userAttending) {
        // Remove attendance
        const { error } = await supabase
          .from("course_attendance")
          .delete()
          .eq("course_id", course.id)
          .eq("user_id", user.id)

        if (error) {
          console.error("[v0] Error removing attendance:", error)
          toast.error("Erreur lors de la suppression de la présence")
          return
        }

        setCourses((prevCourses) =>
          prevCourses.map((c) =>
            c.id === course.id
              ? {
                  ...c,
                  userAttending: false,
                  expectedAttendance: Math.max(0, c.expectedAttendance - 1),
                  attendanceLevel: Math.max(0, c.expectedAttendance - 1) / 20,
                }
              : c,
          ),
        )

        toast.success("Présence annulée !")
        console.log("[v0] Real attendance removed successfully")
      } else {
        // Add attendance
        const { error } = await supabase.from("course_attendance").upsert(
          {
            course_id: course.id,
            user_id: user.id,
            course_name: course.discipline.name,
            course_date: course.date,
            course_time: course.startTime,
          },
          {
            onConflict: "course_id,user_id",
          },
        )

        if (error) {
          console.error("[v0] Error adding attendance:", error)
          toast.error("Erreur lors de l'ajout de la présence")
          return
        }

        setCourses((prevCourses) =>
          prevCourses.map((c) =>
            c.id === course.id
              ? {
                  ...c,
                  userAttending: true,
                  expectedAttendance: c.expectedAttendance + 1,
                  attendanceLevel: (c.expectedAttendance + 1) / 20,
                }
              : c,
          ),
        )

        const courseDate = new Date(course.date)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        courseDate.setHours(0, 0, 0, 0)

        if (courseDate <= today) {
          // Course is completed, update progression
          try {
            const { data: disciplineData } = await supabase
              .from("disciplines")
              .select("id")
              .eq("name", course.discipline.name)
              .single()

            if (disciplineData) {
              const { data: existingProgress } = await supabase
                .from("member_progress")
                .select("id")
                .eq("member_id", user.id)
                .eq("discipline_id", disciplineData.id)
                .single()

              if (!existingProgress) {
                // Only insert if no existing record
                const { error: progressError } = await supabase.from("member_progress").insert({
                  member_id: user.id,
                  discipline_id: disciplineData.id,
                  current_belt: "Blanc",
                  goals: `Progression en ${course.discipline.name}`,
                  instructor_notes: `Cours suivi le ${course.date}`,
                })

                if (!progressError) {
                  toast.success("Présence confirmée et ajoutée à votre progression ! 🎯")
                } else {
                  console.error("[v0] Error updating progression:", progressError)
                  toast.success("Présence confirmée ! 👋")
                }
              } else {
                // Update existing record
                const { error: progressError } = await supabase
                  .from("member_progress")
                  .update({
                    instructor_notes: `Dernier cours suivi le ${course.date}`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existingProgress.id)

                if (!progressError) {
                  toast.success("Présence confirmée et progression mise à jour ! 🎯")
                } else {
                  console.error("[v0] Error updating progression:", progressError)
                  toast.success("Présence confirmée ! 👋")
                }
              }
            } else {
              toast.success("Présence confirmée ! 👋")
            }
          } catch (progressError) {
            console.error("[v0] Error with progression update:", progressError)
            toast.success("Présence confirmée ! 👋")
          }
        } else {
          toast.success("Présence confirmée ! 👋")
        }

        console.log("[v0] Real attendance added successfully")
      }

      // The real-time subscription will sync any changes from other users
    } catch (error) {
      console.error("[v0] Error toggling real attendance:", error)
      toast.error("Erreur lors de la mise à jour de la présence")
    }
  }

  const openRecurringModal = (course) => {
    setRecurringModal({ isOpen: true, course })
  }

  const closeRecurringModal = () => {
    setRecurringModal({ isOpen: false, course: null })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🥋</div>
          <div className="text-xl font-semibold">Chargement des cours Yamabushi...</div>
          <div className="text-sm text-muted-foreground mt-2">Préparation des horaires réels...</div>
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">
        <DashboardHeader user={user} profile={profile} />
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold mb-4">Aucun cours disponible</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Il n'y a pas de cours programmés pour la période sélectionnée.
            </p>
            <p className="text-sm text-muted-foreground">
              Essayez de changer la date ou la discipline pour voir plus de cours.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">
      <DashboardHeader user={user} profile={profile} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
            👥 Présence aux Cours Yamabushi
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez l'affluence prévue pour nos cours et indiquez votre présence pour aider les autres membres
          </p>
        </div>

        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Eye className="h-6 w-6 text-primary" />
              Filtres de recherche
            </CardTitle>
            <CardDescription>
              Trouvez les cours qui vous intéressent et voyez combien de personnes y seront
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">🥊 Discipline</label>
                <Select
                  value={filters.discipline}
                  onValueChange={(value) => setFilters({ ...filters, discipline: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Toutes disciplines" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="all">🎯 Toutes ({yamabushiDisciplines.length})</SelectItem>
                    {yamabushiDisciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{discipline.emoji}</span>
                          <div>
                            <div className="font-medium">{discipline.name}</div>
                            <div className="text-xs text-muted-foreground">{discipline.courseCount} cours/semaine</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">🏢 Club</label>
                <Select value={filters.club} onValueChange={(value) => setFilters({ ...filters, club: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Tous clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌍 Tous clubs ({yamabushiClubs.length})</SelectItem>
                    {yamabushiClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{club.emoji}</span>
                          <div>
                            <div className="font-medium">{club.name}</div>
                            <div className="text-xs text-muted-foreground">{club.address}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">📅 Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    min={format(new Date(), "yyyy-MM-dd")}
                    max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                    className="w-full h-12 px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium"
                  />
                  <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              📋 Cours disponibles
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {courses.length}
              </Badge>
            </h2>
            <Badge variant="outline" className="text-xs">
              🔄 Temps réel
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="hover:shadow-xl transition-all duration-300 border-0 bg-white/90 backdrop-blur-sm overflow-hidden group"
              >
                <div className="h-2 w-full" style={{ backgroundColor: course.discipline.color }} />

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 mb-2">
                        <span className="text-2xl">{course.discipline.emoji}</span>
                        <div>
                          <div className="font-bold">{course.discipline.name}</div>
                          <div className="text-sm text-muted-foreground font-normal">avec {course.instructor}</div>
                        </div>
                      </CardTitle>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-xs px-2 py-1"
                          variant={
                            course.attendanceLevel > 0.8
                              ? "destructive"
                              : course.attendanceLevel > 0.5
                                ? "secondary"
                                : "default"
                          }
                        >
                          {course.attendanceLevel > 0.8
                            ? "🔴 Très fréquenté"
                            : course.attendanceLevel > 0.5
                              ? "🟡 Modérément fréquenté"
                              : "🟢 Peu fréquenté"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{course.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{format(new Date(course.date), "EEE d MMM", { locale: fr })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {course.startTime} - {course.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">{course.room}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span
                        className={`font-medium ${
                          course.attendanceLevel > 0.8
                            ? "text-red-600"
                            : course.attendanceLevel > 0.5
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {course.expectedAttendance} personnes prévues
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{course.club.emoji}</span>
                      <div>
                        <div className="font-medium">{course.club.name}</div>
                        <div className="text-xs text-muted-foreground">{course.club.address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">90 min</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRecurringModal(course)}
                        className="min-w-[100px] font-semibold"
                      >
                        <Repeat className="h-4 w-4 mr-1" />
                        Récurrent
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => toggleAttendance(course)}
                        className={`min-w-[140px] font-semibold transition-all duration-200 ${
                          course.userAttending ? "bg-green-600 hover:bg-green-700 scale-105" : ""
                        }`}
                        style={{
                          backgroundColor: course.userAttending ? undefined : course.discipline.color,
                        }}
                      >
                        {course.userAttending ? "✅ J'y serai !" : "👋 J'y serai !"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {recurringModal.course && (
        <RecurringBookingModal
          isOpen={recurringModal.isOpen}
          onClose={closeRecurringModal}
          course={recurringModal.course}
          user={user}
        />
      )}

      <BottomNav />
    </div>
  )
}
