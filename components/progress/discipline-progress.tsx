"use client"

import { useState } from "react"
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
import { useRouter } from "next/navigation"
import { TechniqueTracker } from "./technique-tracker"

interface DisciplineProgressProps {
  userId: string
  disciplines: any[]
  progressRecords: any[]
}

const beltLevels = {
  "Brazilian Jiu-Jitsu": [
    "Ceinture Blanche",
    "Ceinture Bleue",
    "Ceinture Violette",
    "Ceinture Marron",
    "Ceinture Noire",
  ],
  Grappling: ["Débutant", "Intermédiaire", "Avancé", "Expert"],
  Boxing: ["Débutant", "Intermédiaire", "Avancé", "Compétition"],
  Kickboxing: ["Débutant", "Intermédiaire", "Avancé", "Compétition"],
}

export function DisciplineProgress({ userId, disciplines, progressRecords }: DisciplineProgressProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentBelt: "",
    nextBeltTarget: "",
    goals: "",
  })
  const router = useRouter()
  const supabase = createClient()

  const handleAddProgress = (discipline: any) => {
    setSelectedDiscipline(discipline)
    const existingProgress = progressRecords.find((p) => p.discipline_id === discipline.id)
    if (existingProgress) {
      setFormData({
        currentBelt: existingProgress.current_belt || "",
        nextBeltTarget: existingProgress.next_belt_target || "",
        goals: existingProgress.goals || "",
      })
    } else {
      setFormData({
        currentBelt: "",
        nextBeltTarget: "",
        goals: "",
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveProgress = async () => {
    if (!selectedDiscipline) return

    setIsLoading(true)
    try {
      const existingProgress = progressRecords.find((p) => p.discipline_id === selectedDiscipline.id)

      if (existingProgress) {
        // Update existing progress
        const { error } = await supabase
          .from("member_progress")
          .update({
            current_belt: formData.currentBelt,
            next_belt_target: formData.nextBeltTarget,
            goals: formData.goals,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id)

        if (error) throw error
      } else {
        // Create new progress record
        const { error } = await supabase.from("member_progress").insert({
          member_id: userId,
          discipline_id: selectedDiscipline.id,
          current_belt: formData.currentBelt,
          next_belt_target: formData.nextBeltTarget,
          goals: formData.goals,
        })

        if (error) throw error
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving progress:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBeltProgress = (currentBelt: string, disciplineName: string) => {
    const levels = beltLevels[disciplineName as keyof typeof beltLevels] || []
    const currentIndex = levels.indexOf(currentBelt)
    return currentIndex >= 0 ? ((currentIndex + 1) / levels.length) * 100 : 0
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Progression par discipline</CardTitle>
          <CardDescription>Votre niveau et objectifs dans chaque discipline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {disciplines.map((discipline) => {
              const progress = progressRecords.find((p) => p.discipline_id === discipline.id)
              const beltProgress = progress ? getBeltProgress(progress.current_belt, discipline.name) : 0

              return (
                <Card key={discipline.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{discipline.name}</CardTitle>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: discipline.color_code }} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {progress ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Niveau actuel</span>
                            <Badge variant="secondary">{progress.current_belt || "Non défini"}</Badge>
                          </div>
                          <Progress value={beltProgress} className="h-2" />
                        </div>

                        {progress.next_belt_target && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Objectif: </span>
                            <span className="font-medium">{progress.next_belt_target}</span>
                          </div>
                        )}

                        {progress.goals && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Objectifs personnels: </span>
                            <p className="text-foreground mt-1">{progress.goals}</p>
                          </div>
                        )}

                        {progress.belt_earned_date && (
                          <div className="text-xs text-muted-foreground">
                            Ceinture obtenue le {new Date(progress.belt_earned_date).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Aucune progression enregistrée</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => handleAddProgress(discipline)}
                    >
                      {progress ? "Modifier" : "Ajouter"} la progression
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-primary">Progression - {selectedDiscipline?.name}</DialogTitle>
                <DialogDescription>Mettez à jour votre niveau et vos objectifs</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentBelt">Niveau actuel</Label>
                  <select
                    id="currentBelt"
                    className="w-full p-2 border rounded-md"
                    value={formData.currentBelt}
                    onChange={(e) => setFormData({ ...formData, currentBelt: e.target.value })}
                  >
                    <option value="">Sélectionner un niveau</option>
                    {selectedDiscipline &&
                      (beltLevels[selectedDiscipline.name as keyof typeof beltLevels] || []).map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextBeltTarget">Objectif de niveau</Label>
                  <select
                    id="nextBeltTarget"
                    className="w-full p-2 border rounded-md"
                    value={formData.nextBeltTarget}
                    onChange={(e) => setFormData({ ...formData, nextBeltTarget: e.target.value })}
                  >
                    <option value="">Sélectionner un objectif</option>
                    {selectedDiscipline &&
                      (beltLevels[selectedDiscipline.name as keyof typeof beltLevels] || []).map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Objectifs personnels</Label>
                  <Textarea
                    id="goals"
                    placeholder="Décrivez vos objectifs et ce que vous souhaitez améliorer..."
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                  Annuler
                </Button>
                <Button onClick={handleSaveProgress} disabled={isLoading}>
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {progressRecords.map((progress) => {
        const discipline = disciplines.find((d) => d.id === progress.discipline_id)
        if (!discipline || !progress.current_belt) return null

        return (
          <TechniqueTracker
            key={`${discipline.id}-${progress.current_belt}`}
            userId={userId}
            discipline={discipline}
            currentBelt={progress.current_belt}
          />
        )
      })}
    </div>
  )
}
