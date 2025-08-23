"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ProgressGoalsProps {
  userId: string
  progressRecords: any[]
}

export function ProgressGoals({ userId, progressRecords }: ProgressGoalsProps) {
  // Calculate achievements based on progress records
  const achievements = [
    {
      title: "Premier pas",
      description: "Commencer votre première discipline",
      completed: progressRecords.length > 0,
      icon: "🥋",
    },
    {
      title: "Explorateur",
      description: "Pratiquer 2 disciplines différentes",
      completed: progressRecords.length >= 2,
      icon: "🌟",
    },
    {
      title: "Polyvalent",
      description: "Pratiquer 3 disciplines différentes",
      completed: progressRecords.length >= 3,
      icon: "🏆",
    },
    {
      title: "Maître complet",
      description: "Pratiquer toutes les disciplines",
      completed: progressRecords.length >= 4,
      icon: "👑",
    },
  ]

  // Calculate next belt goals
  const nextBeltGoals = progressRecords
    .filter((record) => record.next_belt_target)
    .map((record) => ({
      discipline: record.disciplines?.name,
      current: record.current_belt,
      target: record.next_belt_target,
      colorCode: record.disciplines?.color_code,
    }))

  const completedAchievements = achievements.filter((a) => a.completed).length
  const totalAchievements = achievements.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Réalisations</CardTitle>
          <CardDescription>Vos accomplissements dans l'académie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span>
                {completedAchievements}/{totalAchievements}
              </span>
            </div>
            <Progress value={(completedAchievements / totalAchievements) * 100} className="h-2" />
          </div>

          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  achievement.completed ? "bg-accent/5 border-accent/20" : "bg-muted/20"
                }`}
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
                {achievement.completed && <Badge variant="secondary">Obtenu</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Objectifs de ceinture</CardTitle>
          <CardDescription>Vos prochains objectifs par discipline</CardDescription>
        </CardHeader>
        <CardContent>
          {nextBeltGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucun objectif défini</p>
              <p className="text-xs mt-1">Définissez vos objectifs dans la section progression</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nextBeltGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.colorCode }} />
                      <span className="font-medium text-sm">{goal.discipline}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Objectif
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>{goal.current || "Niveau actuel"}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium text-foreground">{goal.target}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Conseils</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="font-medium text-primary mb-1">Régularité</p>
              <p className="text-muted-foreground">
                Pratiquez régulièrement pour progresser plus rapidement dans vos disciplines.
              </p>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg">
              <p className="font-medium text-accent mb-1">Diversité</p>
              <p className="text-muted-foreground">
                Explorez différentes disciplines pour développer un profil martial complet.
              </p>
            </div>
            <div className="p-3 bg-chart-3/5 rounded-lg">
              <p className="font-medium text-chart-3 mb-1">Objectifs</p>
              <p className="text-muted-foreground">Définissez des objectifs clairs pour maintenir votre motivation.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
