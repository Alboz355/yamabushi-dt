"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Calendar, Clock, Users, BookOpen, Euro, X, Eye, UserCheck, UserX } from "lucide-react"

interface Discipline {
  id: string
  name: string
  color_code: string
}

interface ClassSession {
  date: string
  start_time: string
  end_time: string
}

interface CreatedClass {
  id: string
  name: string
  description: string
  level: string
  max_capacity: number
  price: number
  disciplines: {
    name: string
    color_code: string
  }
  class_sessions: Array<{
    id: string
    session_date: string
    start_time: string
    end_time: string
    status: string
    bookings: Array<{
      id: string
      status: string
      profiles: {
        first_name: string
        last_name: string
      }
    }>
  }>
}

export function CourseCreation() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [createdClasses, setCreatedClasses] = useState<CreatedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discipline_id: "",
    level: "beginner",
    max_capacity: 20,
    duration_minutes: 60,
    price: 25,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch("/api/instructor/create-course")
      if (!response.ok) throw new Error("Failed to fetch data")

      const data = await response.json()
      setDisciplines(data.disciplines)
      setCreatedClasses(data.classes)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addSession = () => {
    setSessions([...sessions, { date: "", start_time: "", end_time: "" }])
  }

  const removeSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index))
  }

  const updateSession = (index: number, field: keyof ClassSession, value: string) => {
    const updatedSessions = sessions.map((session, i) => (i === index ? { ...session, [field]: value } : session))
    setSessions(updatedSessions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/instructor/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sessions: sessions.filter((s) => s.date && s.start_time && s.end_time),
        }),
      })

      if (!response.ok) throw new Error("Failed to create course")

      toast({
        title: "Succès",
        description: "Cours créé avec succès",
      })

      setShowCreateDialog(false)
      setFormData({
        name: "",
        description: "",
        discipline_id: "",
        level: "beginner",
        max_capacity: 20,
        duration_minutes: 60,
        price: 25,
      })
      setSessions([])
      loadData()
    } catch (error) {
      console.error("Error creating course:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le cours",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">Création de Cours</h2>
          <p className="text-muted-foreground">Créez et gérez vos cours personnalisés</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer un Cours
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un Nouveau Cours</DialogTitle>
              <DialogDescription>Remplissez les informations pour créer votre cours personnalisé</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du Cours</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Karaté Avancé, Judo Débutant..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discipline">Discipline</Label>
                  <Select
                    value={formData.discipline_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, discipline_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplines.map((discipline) => (
                        <SelectItem key={discipline.id} value={discipline.id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: discipline.color_code }} />
                            <span>{discipline.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez votre cours, les objectifs, le contenu..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Capacité Max</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.max_capacity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, max_capacity: Number.parseInt(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="30"
                    max="180"
                    step="15"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, duration_minutes: Number.parseInt(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Séances Programmées</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSession}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une Séance
                  </Button>
                </div>

                {sessions.map((session, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={session.date}
                          onChange={(e) => updateSession(index, "date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Heure de début</Label>
                        <Input
                          type="time"
                          value={session.start_time}
                          onChange={(e) => updateSession(index, "start_time", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Heure de fin</Label>
                        <Input
                          type="time"
                          value={session.end_time}
                          onChange={(e) => updateSession(index, "end_time", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSession(index)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer le Cours</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {createdClasses.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun cours créé</h3>
                <p className="text-muted-foreground mb-4">Créez votre premier cours personnalisé</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un Cours
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          createdClasses.map((course) => (
            <Card key={course.id} className="border-l-4" style={{ borderLeftColor: course.disciplines.color_code }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{course.name}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge style={{ backgroundColor: course.disciplines.color_code, color: "white" }}>
                      {course.disciplines.name}
                    </Badge>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.max_capacity} places max</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.price}€</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.class_sessions.length} séances</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Séances programmées</h4>
                  {course.class_sessions.map((session) => (
                    <Card key={session.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {new Date(session.session_date).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.start_time} - {session.end_time}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge
                            className={
                              session.status === "scheduled"
                                ? "bg-blue-100 text-blue-800"
                                : session.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {session.status}
                          </Badge>
                          <div className="text-sm">
                            <span className="font-medium">{session.bookings.length}</span> inscrit(s)
                          </div>
                          <AttendanceManagementDialog sessionId={session.id} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function AttendanceManagementDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadParticipants = async () => {
    if (!open) return

    setLoading(true)
    try {
      const response = await fetch(`/api/instructor/attendance-management?session_id=${sessionId}`)
      if (!response.ok) throw new Error("Failed to fetch participants")

      const data = await response.json()
      setParticipants(data.session.participants)
    } catch (error) {
      console.error("Error loading participants:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les participants",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceAction = async (memberId: string, action: "confirm" | "reject") => {
    try {
      const response = await fetch("/api/instructor/attendance-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          member_id: memberId,
          action,
        }),
      })

      if (!response.ok) throw new Error("Failed to update attendance")

      toast({
        title: "Succès",
        description: `Présence ${action === "confirm" ? "confirmée" : "refusée"}`,
      })

      loadParticipants()
    } catch (error) {
      console.error("Error updating attendance:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la présence",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadParticipants()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Gérer Présences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestion des Présences</DialogTitle>
          <DialogDescription>
            Confirmez ou refusez la présence des participants qui ont cliqué "J'y serai"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">Chargement...</div>
        ) : (
          <div className="space-y-4">
            {participants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun participant inscrit pour cette séance</p>
            ) : (
              participants.map((participant) => (
                <Card key={participant.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">
                          {participant.profiles.first_name} {participant.profiles.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Inscrit le {new Date(participant.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={
                          participant.attendance_status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : participant.attendance_status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {participant.attendance_status === "confirmed"
                          ? "Confirmé"
                          : participant.attendance_status === "rejected"
                            ? "Refusé"
                            : "En attente"}
                      </Badge>
                      {!participant.confirmed_by_instructor && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 bg-transparent"
                            onClick={() => handleAttendanceAction(participant.member_id, "confirm")}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                            onClick={() => handleAttendanceAction(participant.member_id, "reject")}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
