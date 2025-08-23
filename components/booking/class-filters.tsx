"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

interface ClassFiltersProps {
  disciplines: Array<{ id: string; name: string; color_code: string }>
}

export function ClassFilters({ disciplines }: ClassFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    searchParams.get("date") ? new Date(searchParams.get("date")!) : undefined,
  )

  const currentDiscipline = searchParams.get("discipline")
  const currentLevel = searchParams.get("level")

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/booking?${params.toString()}`)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    updateFilter("date", date ? date.toISOString().split("T")[0] : null)
  }

  const clearFilters = () => {
    setSelectedDate(undefined)
    router.push("/booking")
  }

  const levels = [
    { value: "beginner", label: "Débutant" },
    { value: "intermediate", label: "Intermédiaire" },
    { value: "advanced", label: "Avancé" },
    { value: "all_levels", label: "Tous niveaux" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Filter */}
          <div>
            <h4 className="font-medium mb-3">Date</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          {/* Discipline Filter */}
          <div>
            <h4 className="font-medium mb-3">Discipline</h4>
            <div className="space-y-2">
              {disciplines.map((discipline) => (
                <Button
                  key={discipline.id}
                  variant={currentDiscipline === discipline.name ? "default" : "outline"}
                  className="w-full justify-start bg-transparent"
                  onClick={() =>
                    updateFilter("discipline", currentDiscipline === discipline.name ? null : discipline.name)
                  }
                >
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: discipline.color_code }} />
                  {discipline.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <h4 className="font-medium mb-3">Niveau</h4>
            <div className="space-y-2">
              {levels.map((level) => (
                <Button
                  key={level.value}
                  variant={currentLevel === level.value ? "default" : "outline"}
                  className="w-full justify-start bg-transparent"
                  onClick={() => updateFilter("level", currentLevel === level.value ? null : level.value)}
                >
                  {level.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(currentDiscipline || currentLevel || selectedDate) && (
            <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
