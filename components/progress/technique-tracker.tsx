"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle, Circle, Star, Target, BookOpen } from "lucide-react"
import { toast } from "sonner"

interface TechniqueTrackerProps {
  userId: string
  discipline: any
  currentBelt: string
}

interface Technique {
  id: string
  technique_name: string
  technique_description: string
  difficulty_level: number
  is_required: boolean
  is_mastered?: boolean
  mastered_date?: string
  instructor_validated?: boolean
  notes?: string
}

export function TechniqueTracker({ userId, discipline, currentBelt }: TechniqueTrackerProps) {
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const supabase = createClient()

  useEffect(() => {
    loadTechniques()
  }, [discipline.id, currentBelt])

  const loadTechniques = async () => {
    try {
      setLoading(true)

      // Load techniques for current belt level
      const { data: beltTechniques, error: techniquesError } = await supabase
        .from("belt_techniques")
        .select("*")
        .eq("discipline_id", discipline.id)
        .eq("belt_level", currentBelt)
        .order("difficulty_level", { ascending: true })

      if (techniquesError) {
        console.error("Error loading techniques:", techniquesError)
        return
      }

      // Load user's mastery status for these techniques
      const techniqueIds = beltTechniques?.map((t) => t.id) || []
      const { data: memberTechniques, error: masteryError } = await supabase
        .from("member_techniques")
        .select("*")
        .eq("member_id", userId)
        .in("technique_id", techniqueIds)

      if (masteryError) {
        console.error("Error loading mastery data:", masteryError)
      }

      // Combine technique data with mastery status
      const combinedTechniques =
        beltTechniques?.map((technique) => {
          const mastery = memberTechniques?.find((m) => m.technique_id === technique.id)
          return {
            ...technique,
            is_mastered: mastery?.is_mastered || false,
            mastered_date: mastery?.mastered_date,
            instructor_validated: mastery?.instructor_validated || false,
            notes: mastery?.notes || "",
          }
        }) || []

      setTechniques(combinedTechniques)
    } catch (error) {
      console.error("Error in loadTechniques:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTechniqueMastery = async (technique: Technique) => {
    try {
      const newMasteryStatus = !technique.is_mastered

      const { error } = await supabase.from("member_techniques").upsert(
        {
          member_id: userId,
          technique_id: technique.id,
          is_mastered: newMasteryStatus,
          mastered_date: newMasteryStatus ? new Date().toISOString().split("T")[0] : null,
          instructor_validated: false, // Reset validation when status changes
          notes: technique.notes || "",
        },
        {
          onConflict: "member_id,technique_id",
        },
      )

      if (error) {
        console.error("Error updating technique mastery:", error)
        toast.error("Erreur lors de la mise à jour")
        return
      }

      // Update local state
      setTechniques((prev) =>
        prev.map((t) =>
          t.id === technique.id
            ? {
                ...t,
                is_mastered: newMasteryStatus,
                mastered_date: newMasteryStatus ? new Date().toISOString().split("T")[0] : undefined,
                instructor_validated: false,
              }
            : t,
        ),
      )

      toast.success(newMasteryStatus ? "Technique maîtrisée !" : "Technique non maîtrisée")
    } catch (error) {
      console.error("Error in toggleTechniqueMastery:", error)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const openNotesModal = (technique: Technique) => {
    setSelectedTechnique(technique)
    setNotes(technique.notes || "")
    setIsModalOpen(true)
  }

  const saveNotes = async () => {
    if (!selectedTechnique) return

    try {
      const { error } = await supabase.from("member_techniques").upsert(
        {
          member_id: userId,
          technique_id: selectedTechnique.id,
          is_mastered: selectedTechnique.is_mastered,
          mastered_date: selectedTechnique.mastered_date,
          instructor_validated: selectedTechnique.instructor_validated,
          notes: notes,
        },
        {
          onConflict: "member_id,technique_id",
        },
      )

      if (error) {
        console.error("Error saving notes:", error)
        toast.error("Erreur lors de la sauvegarde")
        return
      }

      // Update local state
      setTechniques((prev) => prev.map((t) => (t.id === selectedTechnique.id ? { ...t, notes } : t)))

      setIsModalOpen(false)
      toast.success("Notes sauvegardées !")
    } catch (error) {
      console.error("Error in saveNotes:", error)
      toast.error("Erreur lors de la sauvegarde")
    }
  }

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-green-500"
      case 2:
        return "bg-blue-500"
      case 3:
        return "bg-yellow-500"
      case 4:
        return "bg-orange-500"
      case 5:
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1:
        return "Facile"
      case 2:
        return "Moyen"
      case 3:
        return "Difficile"
      case 4:
        return "Avancé"
      case 5:
        return "Expert"
      default:
        return "Non défini"
    }
  }

  const masteredCount = techniques.filter((t) => t.is_mastered).length
  const requiredCount = techniques.filter((t) => t.is_required).length
  const masteredRequiredCount = techniques.filter((t) => t.is_required && t.is_mastered).length
  const progressPercentage = requiredCount > 0 ? (masteredRequiredCount / requiredCount) * 100 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Techniques - {currentBelt}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Chargement des techniques...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (techniques.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Techniques - {currentBelt}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">Aucune technique définie pour ce niveau dans cette discipline.</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Techniques - {currentBelt}
          </CardTitle>
          <CardDescription>Suivez votre progression dans les techniques de {discipline.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span className="font-medium">
                {masteredCount}/{techniques.length} techniques
              </span>
            </div>
            <Progress value={(masteredCount / techniques.length) * 100} className="h-2" />

            <div className="flex justify-between text-sm">
              <span>Techniques requises</span>
              <span className="font-medium">
                {masteredRequiredCount}/{requiredCount} maîtrisées
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Techniques List */}
          <Accordion type="single" collapsible className="w-full">
            {techniques.map((technique) => (
              <AccordionItem key={technique.id} value={technique.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="flex items-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTechniqueMastery(technique)
                      }}
                    >
                      {technique.is_mastered ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={technique.is_mastered ? "line-through text-muted-foreground" : ""}>
                          {technique.technique_name}
                        </span>
                        {technique.is_required && (
                          <Badge variant="secondary" className="text-xs">
                            Requis
                          </Badge>
                        )}
                        {technique.instructor_validated && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getDifficultyColor(technique.difficulty_level)}`} />
                      <span className="text-xs text-muted-foreground">
                        {getDifficultyLabel(technique.difficulty_level)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">{technique.technique_description}</p>

                    {technique.mastered_date && (
                      <div className="text-xs text-muted-foreground">
                        Maîtrisée le {new Date(technique.mastered_date).toLocaleDateString("fr-FR")}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openNotesModal(technique)}>
                        {technique.notes ? "Modifier notes" : "Ajouter notes"}
                      </Button>
                    </div>

                    {technique.notes && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Notes personnelles:</div>
                        <div className="text-sm">{technique.notes}</div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Notes Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notes - {selectedTechnique?.technique_name}</DialogTitle>
            <DialogDescription>Ajoutez vos notes personnelles sur cette technique</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes personnelles</Label>
              <Textarea
                id="notes"
                placeholder="Vos observations, difficultés, conseils..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveNotes}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
