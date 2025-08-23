"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MessageSquare, Star, User, Calendar, BookOpen, TrendingUp, Award } from "lucide-react"

interface InstructorNote {
  id: string
  notes: string
  progress_rating: number
  techniques_practiced: string[]
  areas_for_improvement: string
  strengths_observed: string
  created_at: string
  instructor: {
    profile: {
      first_name: string
      last_name: string
      profile_image_url: string
    }
  }
  class_session: {
    session_date: string
    class: {
      name: string
      level: string
      discipline: {
        name: string
      }
    }
  }
}

interface InstructorNotesProps {
  userId: string
}

export function InstructorNotes({ userId }: InstructorNotesProps) {
  const [notes, setNotes] = useState<InstructorNote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("recent")
  const supabase = createClient()

  useEffect(() => {
    loadInstructorNotes()
  }, [userId])

  const loadInstructorNotes = async () => {
    try {
      const { data: notesData } = await supabase
        .from("instructor_session_notes")
        .select(`
          *,
          instructor:instructors(
            profile:profiles(first_name, last_name, profile_image_url)
          ),
          class_session:class_sessions(
            session_date,
            class:classes(
              name, level,
              discipline:disciplines(name)
            )
          )
        `)
        .eq("member_id", userId)
        .order("created_at", { ascending: false })

      setNotes(notesData || [])
    } catch (error) {
      console.error("Error loading instructor notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAverageRating = () => {
    if (notes.length === 0) return 0
    const sum = notes.reduce((acc, note) => acc + note.progress_rating, 0)
    return Math.round((sum / notes.length) * 10) / 10
  }

  const getRecentNotes = () => {
    return notes.slice(0, 10)
  }

  const getNotesByDiscipline = () => {
    const disciplineGroups = notes.reduce(
      (acc, note) => {
        const discipline = note.class_session.class.discipline.name
        if (!acc[discipline]) {
          acc[discipline] = []
        }
        acc[discipline].push(note)
        return acc
      },
      {} as Record<string, InstructorNote[]>,
    )

    return Object.entries(disciplineGroups).map(([discipline, disciplineNotes]) => ({
      discipline,
      notes: disciplineNotes,
      averageRating: disciplineNotes.reduce((acc, note) => acc + note.progress_rating, 0) / disciplineNotes.length,
      totalNotes: disciplineNotes.length,
    }))
  }

  const getAllTechniques = () => {
    const techniques = new Set<string>()
    notes.forEach((note) => {
      note.techniques_practiced.forEach((technique) => techniques.add(technique))
    })
    return Array.from(techniques)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <MessageSquare className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Chargement des notes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes des Instructeurs
          </CardTitle>
          <CardDescription>Commentaires et évaluations de vos instructeurs</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune note d'instructeur pour le moment</p>
          <p className="text-sm text-muted-foreground mt-2">
            Vos instructeurs ajouteront des notes sur votre progression après les cours
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes des Instructeurs
        </CardTitle>
        <CardDescription>
          {notes.length} note{notes.length > 1 ? "s" : ""} • Évaluation moyenne: {getAverageRating()}/5
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Récentes</TabsTrigger>
            <TabsTrigger value="disciplines">Par Discipline</TabsTrigger>
            <TabsTrigger value="techniques">Techniques</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            <div className="space-y-4">
              {getRecentNotes().map((note) => (
                <div key={note.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={note.instructor.profile.profile_image_url || "/placeholder.svg"} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {note.instructor.profile.first_name} {note.instructor.profile.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {note.class_session.class.discipline.name} - {note.class_session.class.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {renderStars(note.progress_rating)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(note.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">{note.notes}</p>

                    {note.techniques_practiced.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Techniques pratiquées:</p>
                        <div className="flex flex-wrap gap-1">
                          {note.techniques_practiced.map((technique, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {technique}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {note.strengths_observed && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded border-l-2 border-green-500">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Points forts:</p>
                        <p className="text-xs text-green-600 dark:text-green-300">{note.strengths_observed}</p>
                      </div>
                    )}

                    {note.areas_for_improvement && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded border-l-2 border-blue-500">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">À améliorer:</p>
                        <p className="text-xs text-blue-600 dark:text-blue-300">{note.areas_for_improvement}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="disciplines" className="space-y-4">
            <div className="space-y-4">
              {getNotesByDiscipline().map((disciplineGroup) => (
                <div key={disciplineGroup.discipline} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{disciplineGroup.discipline}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{disciplineGroup.totalNotes} notes</Badge>
                      {renderStars(Math.round(disciplineGroup.averageRating))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {disciplineGroup.notes.slice(0, 3).map((note) => (
                      <div key={note.id} className="text-sm p-2 bg-muted rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {note.instructor.profile.first_name} {note.instructor.profile.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "d MMM", { locale: fr })}
                          </span>
                        </div>
                        <p className="text-xs">{note.notes}</p>
                      </div>
                    ))}
                    {disciplineGroup.notes.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{disciplineGroup.notes.length - 3} autres notes...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="techniques" className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Techniques Pratiquées ({getAllTechniques().length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getAllTechniques().map((technique, index) => {
                    const count = notes.filter((note) => note.techniques_practiced.includes(technique)).length
                    return (
                      <Badge key={index} variant="outline" className="text-sm">
                        {technique} ({count})
                      </Badge>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Évolution des Évaluations
                </h4>
                <div className="space-y-2">
                  {notes.slice(0, 5).map((note, index) => (
                    <div key={note.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(note.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {note.class_session.class.discipline.name}
                        </span>
                      </div>
                      {renderStars(note.progress_rating)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
