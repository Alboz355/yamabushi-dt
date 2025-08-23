"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { Users, UserPlus, Settings, Award, BookOpen, Trash2 } from "lucide-react"

interface Instructor {
  id: string
  profile_id: string
  bio: string
  years_experience: number
  certifications: string[]
  specialties: string[]
  is_active: boolean
  created_at: string
  profile: {
    first_name: string
    last_name: string
    email: string
    phone: string
    role: string
  }
}

interface InstructorClass {
  id: string
  instructor_id: string
  class_id: string
  assigned_at: string
  is_active: boolean
  class: {
    name: string
    level: string
    discipline: {
      name: string
    }
  }
}

export function InstructorManagement() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [instructorClasses, setInstructorClasses] = useState<InstructorClass[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null)
  const [newInstructor, setNewInstructor] = useState({
    profile_id: "",
    bio: "",
    years_experience: 0,
    certifications: [""],
    specialties: [""],
    is_active: true,
  })
  const supabase = createClient()

  useEffect(() => {
    loadInstructorData()
  }, [])

  const loadInstructorData = async () => {
    try {
      // Load instructors with profile information
      const { data: instructorsData } = await supabase
        .from("instructors")
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone, role)
        `)
        .order("created_at", { ascending: false })

      // Load available users who can become instructors
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .in("role", ["user", "instructor"])
        .order("first_name")

      // Load available classes
      const { data: classesData } = await supabase
        .from("classes")
        .select(`
          id, name, level,
          discipline:disciplines(name)
        `)
        .eq("is_active", true)
        .order("name")

      // Load instructor class assignments
      const { data: assignmentsData } = await supabase
        .from("instructor_class_assignments")
        .select(`
          *,
          class:classes(
            name, level,
            discipline:disciplines(name)
          )
        `)
        .eq("is_active", true)

      setInstructors(instructorsData || [])
      setAvailableUsers(usersData || [])
      setAvailableClasses(classesData || [])
      setInstructorClasses(assignmentsData || [])
    } catch (error) {
      console.error("Error loading instructor data:", error)
    } finally {
      setLoading(false)
    }
  }

  const promoteToInstructor = async (profileId: string) => {
    try {
      // Update user role to instructor
      const { error: roleError } = await supabase.from("profiles").update({ role: "instructor" }).eq("id", profileId)

      if (!roleError) {
        loadInstructorData()
      }
    } catch (error) {
      console.error("Error promoting to instructor:", error)
    }
  }

  const updateInstructor = async (instructorId: string, updates: Partial<Instructor>) => {
    try {
      const { error } = await supabase
        .from("instructors")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", instructorId)

      if (!error) {
        loadInstructorData()
      }
    } catch (error) {
      console.error("Error updating instructor:", error)
    }
  }

  const assignClassToInstructor = async (instructorId: string, classId: string) => {
    try {
      const { error } = await supabase.from("instructor_class_assignments").insert({
        instructor_id: instructorId,
        class_id: classId,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
      })

      if (!error) {
        loadInstructorData()
      }
    } catch (error) {
      console.error("Error assigning class:", error)
    }
  }

  const removeClassAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("instructor_class_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId)

      if (!error) {
        loadInstructorData()
      }
    } catch (error) {
      console.error("Error removing class assignment:", error)
    }
  }

  const deactivateInstructor = async (instructorId: string) => {
    try {
      // Deactivate instructor
      await supabase.from("instructors").update({ is_active: false }).eq("id", instructorId)

      // Remove instructor role
      const instructor = instructors.find((i) => i.id === instructorId)
      if (instructor) {
        await supabase.from("profiles").update({ role: "user" }).eq("id", instructor.profile_id)
      }

      loadInstructorData()
    } catch (error) {
      console.error("Error deactivating instructor:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Instructeurs</h2>
          <p className="text-muted-foreground">Gérez les instructeurs et leurs permissions</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Promouvoir Instructeur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promouvoir un Membre en Instructeur</DialogTitle>
              <DialogDescription>Sélectionnez un membre pour le promouvoir au rôle d'instructeur</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user">Sélectionner un membre</Label>
                <Select onValueChange={(value) => promoteToInstructor(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter((user) => user.role === "user")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="instructors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="instructors">Instructeurs</TabsTrigger>
          <TabsTrigger value="assignments">Assignations de Cours</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="instructors" className="space-y-4">
          <div className="grid gap-4">
            {instructors.map((instructor) => (
              <Card key={instructor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {instructor.profile.first_name} {instructor.profile.last_name}
                        <Badge variant={instructor.is_active ? "default" : "secondary"}>
                          {instructor.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {instructor.profile.email} • {instructor.years_experience} ans d'expérience
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedInstructor(instructor.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Gérer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deactivateInstructor(instructor.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Bio</Label>
                      <p className="text-sm text-muted-foreground">{instructor.bio}</p>
                    </div>
                    {instructor.specialties && instructor.specialties.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Spécialités</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {instructor.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {instructor.certifications && instructor.certifications.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Certifications</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {instructor.certifications.map((cert, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignations de Cours</CardTitle>
              <CardDescription>Gérez les cours assignés à chaque instructeur</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instructors.map((instructor) => {
                  const assignments = instructorClasses.filter((ic) => ic.instructor_id === instructor.id)
                  return (
                    <div key={instructor.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          {instructor.profile.first_name} {instructor.profile.last_name}
                        </h4>
                        <Select onValueChange={(classId) => assignClassToInstructor(instructor.id, classId)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Assigner un cours..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClasses
                              .filter((cls) => !assignments.some((a) => a.class_id === cls.id))
                              .map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.discipline.name} - {cls.name} ({cls.level})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        {assignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between bg-muted p-2 rounded">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span className="text-sm">
                                {assignment.class.discipline.name} - {assignment.class.name} ({assignment.class.level})
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeClassAssignment(assignment.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {assignments.length === 0 && (
                          <p className="text-sm text-muted-foreground">Aucun cours assigné</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions des Instructeurs</CardTitle>
              <CardDescription>Les instructeurs ont automatiquement ces permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Voir les Participants</p>
                    <p className="text-sm text-muted-foreground">
                      Accès à la liste des participants de leurs cours assignés
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Award className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Valider la Présence</p>
                    <p className="text-sm text-muted-foreground">Marquer la présence des membres après les cours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Ajouter des Notes de Progression</p>
                    <p className="text-sm text-muted-foreground">
                      Documenter les progrès et observations sur les élèves
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
