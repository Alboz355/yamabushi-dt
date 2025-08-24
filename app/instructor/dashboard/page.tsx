"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, MessageSquare, Clock, Plus, Settings } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useTranslation } from "@/lib/i18n/context"
import { CourseManagement } from "@/components/instructor/course-management"
import { RoomMessaging } from "@/components/instructor/room-messaging"

interface ClassSession {
  id: string
  class_name: string
  session_date: string
  start_time: string
  end_time: string
  max_capacity: number
  actual_capacity: number
  participants: Array<{
    id: string
    first_name: string
    last_name: string
    profile_image_url?: string
    attendance_status?: string
  }>
}

interface RoomMessage {
  id: string
  title: string
  message: string
  message_type: string
  priority: number
  created_at: string
  room_name: string
}

export default function InstructorDashboard() {
  const { t } = useTranslation()
  const [todayClasses, setTodayClasses] = useState<ClassSession[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSession[]>([])
  const [recentMessages, setRecentMessages] = useState<RoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorInfo, setInstructorInfo] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadInstructorData()
  }, [])

  const loadInstructorData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get instructor info
      const { data: instructor } = await supabase
        .from("instructors")
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq("profile_id", user.id)
        .single()

      setInstructorInfo(instructor)

      // Get today's classes
      const today = new Date().toISOString().split("T")[0]
      const { data: todaySessions } = await supabase
        .from("class_sessions")
        .select(`
          *,
          classes:class_id (
            name,
            max_capacity
          ),
          bookings (
            id,
            member_id,
            status,
            profiles:member_id (
              first_name,
              last_name,
              profile_image_url
            )
          )
        `)
        .eq("instructor_id", instructor?.id)
        .eq("session_date", today)
        .order("start_time")

      // Get upcoming classes (next 7 days)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const { data: upcomingSessions } = await supabase
        .from("class_sessions")
        .select(`
          *,
          classes:class_id (
            name,
            max_capacity
          ),
          bookings (
            id,
            member_id,
            status,
            profiles:member_id (
              first_name,
              last_name,
              profile_image_url
            )
          )
        `)
        .eq("instructor_id", instructor?.id)
        .gt("session_date", today)
        .lte("session_date", nextWeek.toISOString().split("T")[0])
        .order("session_date")
        .order("start_time")

      // Get recent room messages
      const { data: messages } = await supabase
        .from("room_messages")
        .select("*")
        .eq("instructor_id", instructor?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5)

      setTodayClasses(todaySessions || [])
      setUpcomingClasses(upcomingSessions || [])
      setRecentMessages(messages || [])
    } catch (error) {
      console.error("[v0] Error loading instructor data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return "border-l-red-500"
    if (priority >= 3) return "border-l-yellow-500"
    return "border-l-blue-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-serif font-bold text-primary">YAMABUSHI</div>
              <div className="text-sm text-muted-foreground">{t("instructor.dashboard.title")}</div>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={instructorInfo?.profiles?.profile_image_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {instructorInfo?.profiles?.first_name?.[0]}
                  {instructorInfo?.profiles?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">
                  {instructorInfo?.profiles?.first_name} {instructorInfo?.profiles?.last_name}
                </div>
                <div className="text-muted-foreground">Instructeur</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours Aujourd'hui</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{todayClasses.length}</div>
              <p className="text-xs text-muted-foreground">
                {todayClasses.reduce((sum, cls) => sum + cls.bookings?.length || 0, 0)} participants total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours à Venir</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{upcomingClasses.length}</div>
              <p className="text-xs text-muted-foreground">7 prochains jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Actifs</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{recentMessages.length}</div>
              <p className="text-xs text-muted-foreground">Messages de salle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de Présence</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">87%</div>
              <p className="text-xs text-muted-foreground">Moyenne mensuelle</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="upcoming">À Venir</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Cours d'Aujourd'hui</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Cours
              </Button>
            </div>

            <CourseManagement period="today" />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Cours à Venir</h2>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Gérer Planning
              </Button>
            </div>

            <CourseManagement period="upcoming" />
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Gestion des Participants</h2>
            </div>

            <CourseManagement period="all" />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <RoomMessaging />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
