"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Users, CheckCircle, XCircle, Clock, Phone, Mail, Calendar, UserCheck, UserX } from "lucide-react"

interface Participant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  profile_image_url?: string
  belt_level?: string
  membership_status: string
  booking_status: string
  attendance_status?: string
  attendance_notes?: string
}

interface ClassSession {
  id: string
  session_date: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  classes: {
    name: string
    description?: string
    max_capacity: number
    disciplines: {
      name: string
      color_code: string
    }
  }
  participants: Participant[]
}

interface CourseManagementProps {
  period: "today" | "upcoming" | "all"
}

export function CourseManagement({ period }: CourseManagementProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendanceUpdating, setAttendanceUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSessions()
  }, [period])

  const loadSessions = async () => {
    try {
      const response = await fetch(`/api/instructor/courses?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch sessions")

      const data = await response.json()
      const formattedSessions = data.sessions.map((session: any) => ({
        ...session,
        participants:
          session.bookings?.map((booking: any) => ({
            id: booking.profiles.id,
            first_name: booking.profiles.first_name,
            last_name: booking.profiles.last_name,
            email: booking.profiles.email,
            phone: booking.profiles.phone,
            profile_image_url: booking.profiles.profile_image_url,
            belt_level: booking.profiles.belt_level,
            membership_status: booking.profiles.membership_status,
            booking_status: booking.status,
            attendance_status: session.attendance?.find((att: any) => att.member_id === booking.profiles.id)?.status,
            attendance_notes: session.attendance?.find((att: any) => att.member_id === booking.profiles.id)?.notes,
          })) || [],
      }))

      setSessions(formattedSessions)
    } catch (error) {
      console.error("Error loading sessions:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les cours",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAttendance = async (sessionId: string, memberId: string, status: string, notes?: string) => {
    setAttendanceUpdating(memberId)
    try {
      const response = await fetch(`/api/instructor/courses/${sessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, status, notes }),
      })

      if (!response.ok) throw new Error("Failed to update attendance")

      toast({
        title: "Succès",
        description: "Présence mise à jour",
      })

      loadSessions()
    } catch (error) {
      console.error("Error updating attendance:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la présence",
        variant: "destructive",
      })
    } finally {
      setAttendanceUpdating(null)
    }
  }

  const getAttendanceColor = (status?: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"
      case "absent":
        return "bg-red-100 text-red-800"
      case "late":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMembershipColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      case "suspended":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun cours trouvé</h3>
              <p className="text-muted-foreground">
                {period === "today" ? "Aucun cours prévu aujourd'hui" : "Aucun cours à venir"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        sessions.map((session) => (
          <Card
            key={session.id}
            className="border-l-4"
            style={{ borderLeftColor: session.classes.disciplines.color_code }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.classes.name}</CardTitle>
                  <CardDescription>
                    {new Date(session.session_date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    • {session.start_time} - {session.end_time}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {session.participants.length}/{session.classes.max_capacity} participants
                  </Badge>
                  <Badge className={getAttendanceColor(session.status)}>{session.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({session.participants.length})
                  </h4>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                        Gérer Présences
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Gestion des Présences - {selectedSession?.classes.name}</DialogTitle>
                        <DialogDescription>
                          {selectedSession &&
                            new Date(selectedSession.session_date).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}{" "}
                          • {selectedSession?.start_time} - {selectedSession?.end_time}
                        </DialogDescription>
                      </DialogHeader>

                      {selectedSession && (
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Participant</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Niveau</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Présence</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedSession.participants.map((participant) => (
                                <TableRow key={participant.id}>
                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <Avatar>
                                        <AvatarImage src={participant.profile_image_url || "/placeholder.svg"} />
                                        <AvatarFallback>
                                          {participant.first_name[0]}
                                          {participant.last_name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium">
                                          {participant.first_name} {participant.last_name}
                                        </div>
                                        <Badge
                                          className={getMembershipColor(participant.membership_status)}
                                          variant="outline"
                                        >
                                          {participant.membership_status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {participant.email}
                                      </div>
                                      {participant.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {participant.phone}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{participant.belt_level || "Débutant"}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getAttendanceColor(participant.booking_status)}>
                                      {participant.booking_status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {participant.attendance_status ? (
                                      <Badge className={getAttendanceColor(participant.attendance_status)}>
                                        {participant.attendance_status === "present" && (
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {participant.attendance_status === "absent" && (
                                          <XCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {participant.attendance_status === "late" && <Clock className="h-3 w-3 mr-1" />}
                                        {participant.attendance_status}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Non marqué</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 hover:text-green-700 bg-transparent"
                                        disabled={attendanceUpdating === participant.id}
                                        onClick={() => updateAttendance(selectedSession.id, participant.id, "present")}
                                      >
                                        <UserCheck className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-yellow-600 hover:text-yellow-700 bg-transparent"
                                        disabled={attendanceUpdating === participant.id}
                                        onClick={() => updateAttendance(selectedSession.id, participant.id, "late")}
                                      >
                                        <Clock className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 bg-transparent"
                                        disabled={attendanceUpdating === participant.id}
                                        onClick={() => updateAttendance(selectedSession.id, participant.id, "absent")}
                                      >
                                        <UserX className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {session.participants.length > 0 ? (
                  <div className="flex -space-x-2">
                    {session.participants.slice(0, 8).map((participant) => (
                      <Avatar key={participant.id} className="border-2 border-background">
                        <AvatarImage src={participant.profile_image_url || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {participant.first_name[0]}
                          {participant.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {session.participants.length > 8 && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-background text-xs font-medium">
                        +{session.participants.length - 8}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucun participant inscrit</p>
                )}

                {session.notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{session.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
