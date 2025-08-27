"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  BookOpen,
  MessageSquare,
  Star,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  MapPin,
  Timer,
  Award,
  TrendingUp,
  BarChart3,
  PieChart,
  Bell,
  Settings,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { Checkbox } from "@/components/ui/checkbox"

interface ClassSession {
  id: string
  session_date: string
  start_time: string
  end_time: string
  status: string
  max_participants: number
  current_participants: number
  class: {
    name: string
    level: string
    discipline: {
      name: string
    }
  }
  participants: Array<{
    id: string
    user_id: string
    attendance_status: string
    confirmed: boolean
    profile: {
      first_name: string
      last_name: string
      profile_image_url: string
    }
  }>
}

interface CourseCreationForm {
  name: string
  discipline: string
  level: string
  description: string
  max_participants: number
  is_unlimited_participants: boolean
  location: string
  recurrence_type: "none" | "weekly" | "daily"
  recurrence_days: number[]
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  sessions: Array<{
    date: string
    start_time: string
    end_time: string
  }>
}

interface InstructorStats {
  totalCourses: number
  totalStudents: number
  averageRating: number
  completedSessions: number
  upcomingSessions: number
  monthlyRevenue: number
}

export default function InstructorPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>({ first_name: "Instructeur", last_name: "" })
  const [loading, setLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<ClassSession[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSession[]>([])
  const [myCourses, setMyCourses] = useState<any[]>([])
  const [recentNotes, setRecentNotes] = useState<any[]>([])
  const [stats, setStats] = useState<InstructorStats>({
    totalCourses: 0,
    totalStudents: 0,
    averageRating: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    monthlyRevenue: 0,
  })
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showCourseCreation, setShowCourseCreation] = useState(false)

  const [courseForm, setCourseForm] = useState<CourseCreationForm>({
    name: "",
    discipline: "",
    level: "Débutant",
    description: "",
    max_participants: 20,
    is_unlimited_participants: false,
    location: "Dojo Principal",
    recurrence_type: "none",
    recurrence_days: [],
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    sessions: [],
  })

  // Note form state
  const [noteForm, setNoteForm] = useState({
    member_id: "",
    notes: "",
    progress_rating: 3,
    techniques_practiced: "",
    areas_for_improvement: "",
    strengths_observed: "",
  })

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkInstructorAccess()
  }, [])

  const checkInstructorAccess = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      let isInstructor = false

      // Check hardcoded instructors first
      const hardcodedInstructors = ["instructor@instructor.com", "leartshabija0@gmail.com"]
      if (hardcodedInstructors.includes(user.email || "")) {
        isInstructor = true
      } else {
        // Use admin API to check instructor role
        try {
          const response = await fetch("/api/admin/users")
          if (response.ok) {
            const data = await response.json()
            const users = Array.isArray(data) ? data : data.users || []
            const userRecord = users.find((u: any) => u.email === user.email)
            isInstructor = userRecord?.role === "instructor"
          }
        } catch (apiError) {
          console.error("Admin API error:", apiError)
        }
      }

      if (!isInstructor) {
        router.push("/dashboard")
        return
      }

      setUser(user)
      await loadInstructorData(user.id)
    } catch (error) {
      console.error("Error checking instructor access:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const loadInstructorData = async (userId: string) => {
    try {
      console.log("[v0] Loading instructor data for user:", userId)

      // Get profile data
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData || { first_name: "Instructeur", last_name: "" })

      const { data: coursesData, error: coursesError } = await supabase
        .from("instructor_courses")
        .select("*")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false })

      if (coursesError) {
        console.error("Error loading courses:", coursesError)
        setMyCourses([])
      } else {
        console.log("[v0] Loaded courses:", coursesData?.length || 0)
        setMyCourses(coursesData || [])
      }

      const coursesWithRegistrations = []
      for (const course of coursesData || []) {
        const { data: registrations } = await supabase
          .from("instructor_course_registrations")
          .select(`
            *,
            profile:profiles(first_name, last_name, profile_image_url)
          `)
          .eq("course_id", course.id)

        coursesWithRegistrations.push({
          ...course,
          registrations: registrations || [],
        })
      }

      setMyCourses(coursesWithRegistrations)

      // Calculate statistics
      const totalCourses = coursesData?.length || 0
      const totalStudents = coursesWithRegistrations.reduce(
        (acc, course) => acc + (course.registrations?.length || 0),
        0,
      )

      setStats({
        totalCourses,
        totalStudents,
        averageRating: 4.8,
        completedSessions: 0,
        upcomingSessions: totalCourses,
        monthlyRevenue: totalCourses * 500,
      })

      toast({
        title: "Interface chargée",
        description: `${totalCourses} cours trouvés avec ${totalStudents} étudiants inscrits`,
      })
    } catch (error) {
      console.error("Error loading instructor data:", error)
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données instructeur",
        variant: "destructive",
      })
    }
  }

  const createCourse = async () => {
    try {
      console.log("[v0] Creating course with form data:", courseForm)

      if (!courseForm.name || !courseForm.discipline) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        })
        return
      }

      const { data: courseData, error: courseError } = await supabase
        .from("instructor_courses")
        .insert({
          title: courseForm.name,
          discipline: courseForm.discipline,
          description: courseForm.description,
          location: courseForm.location,
          max_participants: courseForm.is_unlimited_participants ? null : courseForm.max_participants,
          is_unlimited_participants: courseForm.is_unlimited_participants,
          instructor_id: user?.id,
          recurrence_type: courseForm.recurrence_type,
          recurrence_days: courseForm.recurrence_days,
          start_date: courseForm.start_date || new Date().toISOString().split("T")[0],
          end_date: courseForm.end_date || null,
          start_time: courseForm.start_time || "10:00",
          end_time: courseForm.end_time || "11:00",
          is_active: true,
        })
        .select()
        .single()

      if (courseError) {
        console.error("Course creation error:", courseError)
        throw courseError
      }

      console.log("[v0] Course created successfully:", courseData)

      const bookingsToCreate = []

      if (courseForm.recurrence_type === "weekly" && courseForm.recurrence_days.length > 0) {
        // Create recurring bookings for the next 3 months
        const startDate = new Date(courseForm.start_date)
        const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months
        const currentDate = new Date(startDate)

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay()

          if (courseForm.recurrence_days.includes(dayOfWeek)) {
            const sessionDate = currentDate.toISOString().split("T")[0]
            bookingsToCreate.push({
              course_id: `instructor-${courseData.id}-${sessionDate}`,
              course_name: courseForm.name,
              course_date: sessionDate,
              course_time: courseForm.start_time,
              instructor: `${profile.first_name} ${profile.last_name}`,
              club_name: "Yamabushi Academy",
              status: "available",
              user_id: null,
            })
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        // Single course booking
        bookingsToCreate.push({
          course_id: `instructor-${courseData.id}`,
          course_name: courseForm.name,
          course_date: courseForm.start_date,
          course_time: courseForm.start_time,
          instructor: `${profile.first_name} ${profile.last_name}`,
          club_name: "Yamabushi Academy",
          status: "available",
          user_id: null,
        })
      }

      // Insert bookings for client visibility
      if (bookingsToCreate.length > 0) {
        const { error: bookingsError } = await supabase.from("unified_bookings").insert(bookingsToCreate)

        if (bookingsError) {
          console.warn("Warning: Could not create booking entries:", bookingsError)
        } else {
          console.log("[v0] Created", bookingsToCreate.length, "booking entries")
        }
      }

      // Reset form and close dialog
      setCourseForm({
        name: "",
        discipline: "",
        level: "Débutant",
        description: "",
        max_participants: 20,
        is_unlimited_participants: false,
        location: "Dojo Principal",
        recurrence_type: "none",
        recurrence_days: [],
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        sessions: [],
      })
      setShowCourseCreation(false)

      // Reload data
      await loadInstructorData(user?.id || "")

      toast({
        title: "Succès",
        description: `Cours "${courseForm.name}" créé avec succès et visible dans "Planifier un cours"`,
      })
    } catch (error) {
      console.error("Error creating course:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le cours",
        variant: "destructive",
      })
    }
  }

  const confirmParticipant = async (registrationId: string, confirmed: boolean) => {
    try {
      const { error } = await supabase
        .from("instructor_course_registrations")
        .update({
          status: confirmed ? "confirmed" : "rejected",
          confirmed_by: user?.id,
          confirmed_at: confirmed ? new Date().toISOString() : null,
        })
        .eq("id", registrationId)

      if (error) throw error

      await loadInstructorData(user?.id || "")

      toast({
        title: confirmed ? "Participant confirmé" : "Participant refusé",
        description: `La présence a été ${confirmed ? "confirmée" : "refusée"}`,
      })
    } catch (error) {
      console.error("Error confirming participant:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier la confirmation",
        variant: "destructive",
      })
    }
  }

  const addSession = () => {
    setCourseForm({
      ...courseForm,
      sessions: [...courseForm.sessions, { date: "", start_time: "", end_time: "" }],
    })
  }

  const removeSession = (index: number) => {
    setCourseForm({
      ...courseForm,
      sessions: courseForm.sessions.filter((_, i) => i !== index),
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return "Aujourd'hui"
    if (isTomorrow(date)) return "Demain"
    if (isYesterday(date)) return "Hier"
    return format(date, "EEEE d MMMM", { locale: fr })
  }

  const getAttendanceStats = (participants: any[]) => {
    const present = participants.filter((p) => p.status === "present").length
    const total = participants.length
    return { present, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 }
  }

  const markAttendance = async (participantId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ attendance_status: status })
        .eq("user_id", participantId)

      if (error) throw error

      await loadInstructorData(user?.id || "")

      toast({
        title: "Statut de présence mis à jour",
        description: `Le participant a été marqué comme ${status}`,
      })
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de présence",
        variant: "destructive",
      })
    }
  }

  const submitProgressNote = async () => {
    try {
      if (!noteForm.member_id || !noteForm.notes) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("progress_notes").insert({
        member_id: noteForm.member_id,
        notes: noteForm.notes,
        progress_rating: noteForm.progress_rating,
        techniques_practiced: noteForm.techniques_practiced,
        areas_for_improvement: noteForm.areas_for_improvement,
        strengths_observed: noteForm.strengths_observed,
      })

      if (error) throw error

      toast({
        title: "Note enregistrée",
        description: "La note a été enregistrée avec succès",
      })

      setNoteForm({
        member_id: "",
        notes: "",
        progress_rating: 3,
        techniques_practiced: "",
        areas_for_improvement: "",
        strengths_observed: "",
      })
    } catch (error) {
      console.error("Error submitting progress note:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la note",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement de l'interface instructeur...</p>
        </div>
      </div>
    )
  }

  if (selectedClass) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{selectedClass.class.discipline.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedClass.class.name} - {selectedClass.class.level}
              </p>
            </div>
          </div>

          <Tabs defaultValue="attendance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendance">Présences</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Liste des Participants</CardTitle>
                  <CardDescription>
                    {formatDate(selectedClass.session_date)} • {selectedClass.start_time}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedClass.participants?.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={participant.profile.profile_image_url || "/placeholder.svg"} />
                          <AvatarFallback>
                            {participant.profile.first_name[0]}
                            {participant.profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {participant.profile.first_name} {participant.profile.last_name}
                          </p>
                          <Badge
                            variant={
                              participant.status === "present"
                                ? "default"
                                : participant.status === "absent"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {participant.status === "present"
                              ? "Présent"
                              : participant.status === "absent"
                                ? "Absent"
                                : "En attente"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={participant.status === "present" ? "default" : "outline"}
                          onClick={() => markAttendance(participant.id, "present")}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={participant.status === "absent" ? "destructive" : "outline"}
                          onClick={() => markAttendance(participant.id, "absent")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ajouter une Note</CardTitle>
                  <CardDescription>Documentez les progrès des élèves</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Élève</Label>
                    <Select
                      value={noteForm.member_id}
                      onValueChange={(value) => setNoteForm({ ...noteForm, member_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un élève..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedClass.participants?.map((participant) => (
                          <SelectItem key={participant.user_id} value={participant.user_id}>
                            {participant.profile.first_name} {participant.profile.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes générales *</Label>
                    <Textarea
                      placeholder="Observations sur la séance..."
                      value={noteForm.notes}
                      onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Évaluation (1-5 étoiles)</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant="ghost"
                          size="sm"
                          onClick={() => setNoteForm({ ...noteForm, progress_rating: rating })}
                        >
                          <Star
                            className={`h-5 w-5 ${rating <= noteForm.progress_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Techniques pratiquées</Label>
                    <Input
                      placeholder="Séparer par des virgules..."
                      value={noteForm.techniques_practiced}
                      onChange={(e) => setNoteForm({ ...noteForm, techniques_practiced: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Points forts observés</Label>
                    <Textarea
                      placeholder="Ce qui a bien fonctionné..."
                      value={noteForm.strengths_observed}
                      onChange={(e) => setNoteForm({ ...noteForm, strengths_observed: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Axes d'amélioration</Label>
                    <Textarea
                      placeholder="Points à travailler..."
                      value={noteForm.areas_for_improvement}
                      onChange={(e) => setNoteForm({ ...noteForm, areas_for_improvement: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Button onClick={submitProgressNote} className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enregistrer la Note
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interface Instructeur</h1>
            <p className="text-muted-foreground">
              Bonjour {profile?.first_name} {profile?.last_name} •{" "}
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCourseCreation(true)} className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Créer un Cours
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.totalCourses}</p>
              <p className="text-xs text-muted-foreground">Cours créés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Étudiants</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.averageRating}</p>
              <p className="text-xs text-muted-foreground">Note moyenne</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.upcomingSessions}</p>
              <p className="text-xs text-muted-foreground">Séances à venir</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.monthlyRevenue}€</p>
              <p className="text-xs text-muted-foreground">Revenus mensuels</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">A+</p>
              <p className="text-xs text-muted-foreground">Classement</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="courses">Mes Cours</TabsTrigger>
            <TabsTrigger value="students">Étudiants</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Cours Aujourd'hui
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myCourses.filter((course) =>
                    course.sessions?.some(
                      (session: any) =>
                        format(new Date(session.session_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
                    ),
                  ).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Aucun cours aujourd'hui</p>
                  ) : (
                    <div className="space-y-2">
                      {myCourses.map((course) =>
                        course.sessions
                          ?.filter(
                            (session: any) =>
                              format(new Date(session.session_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
                          )
                          .map((session: any) => (
                            <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium">{course.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {session.start_time} - {session.end_time}
                                </p>
                              </div>
                              <Badge>
                                {session.current_participants}/{session.max_participants}
                              </Badge>
                            </div>
                          )),
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications Récentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <UserCheck className="h-4 w-4 text-blue-500" />
                      <p className="text-sm">3 nouvelles inscriptions aujourd'hui</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <Star className="h-4 w-4 text-green-500" />
                      <p className="text-sm">Nouvelle évaluation 5 étoiles reçue</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-sm">Rappel: Cours dans 2 heures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mes Cours ({myCourses.length})</h2>
              <Button onClick={() => setShowCourseCreation(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Cours
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>{course.discipline}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          {course.start_time} - {course.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {course.registrations?.length || 0}
                          {course.max_participants ? `/${course.max_participants}` : " (illimité)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {course.location}
                        </span>
                        <span className="font-medium text-green-600">Gratuit</span>
                      </div>
                      <div className="pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full bg-transparent">
                              <Eye className="h-4 w-4 mr-2" />
                              Voir les Détails
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{course.title}</DialogTitle>
                              <DialogDescription>{course.description}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">
                                  Participants inscrits ({course.registrations?.length || 0})
                                </h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {course.registrations?.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">
                                      Aucune inscription pour le moment
                                    </p>
                                  ) : (
                                    course.registrations?.map((registration: any) => (
                                      <div
                                        key={registration.id}
                                        className="flex items-center justify-between p-3 border rounded"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage
                                              src={registration.profile?.profile_image_url || "/placeholder.svg"}
                                            />
                                            <AvatarFallback>
                                              {registration.profile?.first_name?.[0]}
                                              {registration.profile?.last_name?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="font-medium text-sm">
                                              {registration.profile?.first_name} {registration.profile?.last_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Inscrit le {format(new Date(registration.created_at), "dd/MM/yyyy")}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant={registration.status === "confirmed" ? "default" : "outline"}
                                            onClick={() => confirmParticipant(registration.id, true)}
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant={registration.status === "rejected" ? "destructive" : "outline"}
                                            onClick={() => confirmParticipant(registration.id, false)}
                                          >
                                            <XCircle className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Étudiants</CardTitle>
                <CardDescription>Suivez les progrès et gérez vos étudiants</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Fonctionnalité en développement - Gestion avancée des étudiants
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Statistiques des Cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">Graphiques et analyses détaillées à venir</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Répartition des Revenus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">Analyse financière détaillée à venir</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messagerie Instructeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Système de messagerie avec les étudiants à venir
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Course Creation Dialog */}
        <Dialog open={showCourseCreation} onOpenChange={setShowCourseCreation}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un Nouveau Cours</DialogTitle>
              <DialogDescription>
                Créez un cours qui sera automatiquement visible dans "Planifier un cours" pour les clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du cours *</Label>
                  <Input
                    placeholder="Ex: Karaté Débutant"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Discipline *</Label>
                  <Select
                    value={courseForm.discipline}
                    onChange={(value) => setCourseForm({ ...courseForm, discipline: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Karaté">Karaté</SelectItem>
                      <SelectItem value="Judo">Judo</SelectItem>
                      <SelectItem value="Taekwondo">Taekwondo</SelectItem>
                      <SelectItem value="Aikido">Aikido</SelectItem>
                      <SelectItem value="Boxe">Boxe</SelectItem>
                      <SelectItem value="MMA">MMA</SelectItem>
                      <SelectItem value="Yoga">Yoga</SelectItem>
                      <SelectItem value="Fitness">Fitness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Description du cours..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lieu</Label>
                  <Input
                    placeholder="Ex: Dojo Principal"
                    value={courseForm.location}
                    onChange={(e) => setCourseForm({ ...courseForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Participants maximum</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={courseForm.max_participants}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, max_participants: Number.parseInt(e.target.value) || 20 })
                      }
                      disabled={courseForm.is_unlimited_participants}
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="unlimited"
                        checked={courseForm.is_unlimited_participants}
                        onChange={(checked) =>
                          setCourseForm({ ...courseForm, is_unlimited_participants: checked as boolean })
                        }
                      />
                      <Label htmlFor="unlimited" className="text-sm">
                        Sans limite
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Type de récurrence</Label>
                <Select
                  value={courseForm.recurrence_type}
                  onChange={(value: "none" | "weekly" | "daily") =>
                    setCourseForm({ ...courseForm, recurrence_type: value, recurrence_days: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Cours unique</SelectItem>
                    <SelectItem value="weekly">Chaque semaine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {courseForm.recurrence_type === "weekly" && (
                <div>
                  <Label>Jours de la semaine</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { value: 1, label: "Lundi" },
                      { value: 2, label: "Mardi" },
                      { value: 3, label: "Mercredi" },
                      { value: 4, label: "Jeudi" },
                      { value: 5, label: "Vendredi" },
                      { value: 6, label: "Samedi" },
                      { value: 0, label: "Dimanche" },
                    ].map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={courseForm.recurrence_days.includes(day.value)}
                          onChange={(checked) => {
                            if (checked) {
                              setCourseForm({
                                ...courseForm,
                                recurrence_days: [...courseForm.recurrence_days, day.value],
                              })
                            } else {
                              setCourseForm({
                                ...courseForm,
                                recurrence_days: courseForm.recurrence_days.filter((d) => d !== day.value),
                              })
                            }
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {courseForm.recurrence_type !== "none" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={courseForm.start_date}
                      onChange={(e) => setCourseForm({ ...courseForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Date de fin (optionnel)</Label>
                    <Input
                      type="date"
                      value={courseForm.end_date}
                      onChange={(e) => setCourseForm({ ...courseForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {courseForm.recurrence_type !== "none" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Heure de début</Label>
                    <Input
                      type="time"
                      value={courseForm.start_time}
                      onChange={(e) => setCourseForm({ ...courseForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Heure de fin</Label>
                    <Input
                      type="time"
                      value={courseForm.end_time}
                      onChange={(e) => setCourseForm({ ...courseForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCourseCreation(false)}>
                  Annuler
                </Button>
                <Button onClick={createCourse}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le Cours
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
