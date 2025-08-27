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
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { fr } from "date-fns/locale"
import { Users, CheckCircle, XCircle, Clock, Calendar, BookOpen, MessageSquare, Star, ArrowLeft } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface ClassSession {
  id: string
  session_date: string
  start_time: string
  end_time: string
  status: string
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
    profile: {
      first_name: string
      last_name: string
      profile_image_url: string
    }
  }>
}

interface ProgressNote {
  id: string
  member_id: string
  notes: string
  progress_rating: number
  techniques_practiced: string[]
  areas_for_improvement: string
  strengths_observed: string
  created_at: string
  profile: {
    first_name: string
    last_name: string
  }
}

export default function InstructorPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>({ first_name: "Instructeur", last_name: "" })
  const [loading, setLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<ClassSession[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSession[]>([])
  const [recentNotes, setRecentNotes] = useState<ProgressNote[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  const [activeTab, setActiveTab] = useState("today")

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

      // Check hardcoded instructors first (if any)
      const hardcodedInstructors = ["instructor@instructor.com"] // Add hardcoded instructor emails if needed
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
          console.error("Admin API error, checking profiles table:", apiError)
          // Fallback to profiles table query
          const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single()
          isInstructor = profileData?.role === "instructor"
        }
      }

      if (!isInstructor) {
        router.push("/dashboard")
        return
      }

      // Get profile data for display
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setUser(user)
      setProfile(profileData || { first_name: "Instructeur", last_name: "" })
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
      // Get instructor record
      const { data: instructorData } = await supabase.from("instructors").select("id").eq("profile_id", userId).single()

      if (!instructorData) return

      const today = new Date().toISOString().split("T")[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      // Load today's classes
      const { data: todayClassesData } = await supabase
        .from("class_sessions")
        .select(`
          *,
          class:classes(
            name, level,
            discipline:disciplines(name)
          )
        `)
        .eq("instructor_id", instructorData.id)
        .eq("session_date", today)
        .order("start_time")

      // Load upcoming classes (next 7 days)
      const { data: upcomingClassesData } = await supabase
        .from("class_sessions")
        .select(`
          *,
          class:classes(
            name, level,
            discipline:disciplines(name)
          )
        `)
        .eq("instructor_id", instructorData.id)
        .gte("session_date", tomorrow)
        .lte("session_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("session_date")
        .order("start_time")

      // Load recent progress notes
      const { data: notesData } = await supabase
        .from("instructor_session_notes")
        .select(`
          *,
          profile:profiles(first_name, last_name)
        `)
        .eq("instructor_id", instructorData.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setTodayClasses(todayClassesData || [])
      setUpcomingClasses(upcomingClassesData || [])
      setRecentNotes(notesData || [])

      // Load participants for each class
      for (const classSession of [...(todayClassesData || []), ...(upcomingClassesData || [])]) {
        await loadClassParticipants(classSession.id)
      }
    } catch (error) {
      console.error("Error loading instructor data:", error)
    }
  }

  const loadClassParticipants = async (classSessionId: string) => {
    try {
      const { data: participantsData } = await supabase
        .from("attendance")
        .select(`
          *,
          profile:profiles(first_name, last_name, profile_image_url)
        `)
        .eq("class_session_id", classSessionId)

      // Update the class with participants
      setTodayClasses((prev) =>
        prev.map((cls) => (cls.id === classSessionId ? { ...cls, participants: participantsData || [] } : cls)),
      )
      setUpcomingClasses((prev) =>
        prev.map((cls) => (cls.id === classSessionId ? { ...cls, participants: participantsData || [] } : cls)),
      )
    } catch (error) {
      console.error("Error loading participants:", error)
    }
  }

  const markAttendance = async (attendanceId: string, status: "present" | "absent") => {
    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          status,
          check_in_time: status === "present" ? new Date().toISOString() : null,
        })
        .eq("id", attendanceId)

      if (error) throw error

      // Reload class participants
      if (selectedClass) {
        await loadClassParticipants(selectedClass.id)
      }

      toast({
        title: "Présence mise à jour",
        description: `Membre marqué comme ${status === "present" ? "présent" : "absent"}`,
      })
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la présence",
        variant: "destructive",
      })
    }
  }

  const submitProgressNote = async () => {
    try {
      if (!profile || !noteForm.member_id || !noteForm.notes) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        })
        return
      }

      const { data: instructorData } = await supabase
        .from("instructors")
        .select("id")
        .eq("profile_id", user?.id)
        .single()

      if (!instructorData) return

      const { error } = await supabase.from("instructor_session_notes").insert({
        instructor_id: instructorData.id,
        class_session_id: selectedClass?.id,
        member_id: noteForm.member_id,
        notes: noteForm.notes,
        progress_rating: noteForm.progress_rating,
        techniques_practiced: noteForm.techniques_practiced
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
        areas_for_improvement: noteForm.areas_for_improvement,
        strengths_observed: noteForm.strengths_observed,
      })

      if (error) throw error

      // Reset form
      setNoteForm({
        member_id: "",
        notes: "",
        progress_rating: 3,
        techniques_practiced: "",
        areas_for_improvement: "",
        strengths_observed: "",
      })

      // Reload notes
      await loadInstructorData(user?.id || "")

      toast({
        title: "Note ajoutée",
        description: "La note de progression a été enregistrée avec succès",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement...</p>
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
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Interface Instructeur</h1>
          <p className="text-muted-foreground">
            Bonjour {profile?.first_name} {profile?.last_name}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="upcoming">À venir</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {todayClasses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun cours prévu aujourd'hui</p>
                </CardContent>
              </Card>
            ) : (
              todayClasses.map((classSession) => {
                const stats = getAttendanceStats(classSession.participants || [])
                return (
                  <Card key={classSession.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader onClick={() => setSelectedClass(classSession)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{classSession.class.discipline.name}</CardTitle>
                          <CardDescription>
                            {classSession.class.name} - {classSession.class.level}
                          </CardDescription>
                        </div>
                        <Badge variant={classSession.status === "completed" ? "default" : "secondary"}>
                          {classSession.start_time}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{stats.total} participants</span>
                        </div>
                        {stats.total > 0 && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>
                              {stats.present}/{stats.total} présents
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingClasses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun cours à venir cette semaine</p>
                </CardContent>
              </Card>
            ) : (
              upcomingClasses.map((classSession) => (
                <Card key={classSession.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader onClick={() => setSelectedClass(classSession)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{classSession.class.discipline.name}</CardTitle>
                        <CardDescription>
                          {classSession.class.name} - {classSession.class.level}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{classSession.start_time}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(classSession.session_date)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{classSession.participants?.length || 0} participants inscrits</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {recentNotes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune note récente</p>
                </CardContent>
              </Card>
            ) : (
              recentNotes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {note.profile.first_name} {note.profile.last_name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < note.progress_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <CardDescription>
                      {format(new Date(note.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{note.notes}</p>
                    {note.techniques_practiced && note.techniques_practiced.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">Techniques:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {note.techniques_practiced.map((technique, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {technique}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
