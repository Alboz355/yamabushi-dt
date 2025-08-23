"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, User, TrendingUp } from "lucide-react"

interface CourseRecommendation {
  course_id: string
  course_name: string
  discipline_name: string
  course_date: string
  course_time: string
  instructor: string
  club_name: string
  recommendation_score: number
  reason: string
}

interface CourseRecommendationsProps {
  userId: string
}

export function CourseRecommendations({ userId }: CourseRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const { data, error } = await supabase.rpc("get_user_course_recommendations", {
          user_uuid: userId,
        })

        if (error) {
          console.error("[v0] Error loading recommendations:", error)
          return
        }

        setRecommendations(data || [])
      } catch (error) {
        console.error("[v0] Error loading recommendations:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [userId, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cours recommandés
          </CardTitle>
          <CardDescription>Basés sur vos préférences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cours recommandés
          </CardTitle>
          <CardDescription>Basés sur vos préférences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Participez à quelques cours pour recevoir des recommandations personnalisées !
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Cours recommandés
        </CardTitle>
        <CardDescription>Basés sur vos préférences d'entraînement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.slice(0, 3).map((rec) => (
            <div key={rec.course_id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{rec.discipline_name}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(rec.course_date).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rec.course_time.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {rec.instructor}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Score: {rec.recommendation_score}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
              <Button size="sm" variant="outline" className="w-full text-xs bg-transparent">
                Réserver ce cours
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
