import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ProgressOverviewProps {
  userId: string
  courseHistory: any[]
  disciplineStats: any[]
  milestones: any[]
}

export function ProgressOverview({ userId, courseHistory, disciplineStats, milestones }: ProgressOverviewProps) {
  // Calculate overall stats from real data
  const totalClasses = courseHistory.length
  const thisMonthClasses = disciplineStats.reduce((sum, stat) => sum + (stat.courses_this_month || 0), 0)
  const thisWeekClasses = disciplineStats.reduce((sum, stat) => sum + (stat.courses_this_week || 0), 0)
  const totalHours = disciplineStats.reduce((sum, stat) => sum + (stat.total_hours || 0), 0)

  const activeDisciplines = disciplineStats.length
  const totalDisciplines = 12 // Yamabushi has 12 disciplines

  // Calculate discipline distribution from real stats
  const disciplineDistribution = disciplineStats
    .map((stat) => ({
      name: stat.discipline_name,
      count: stat.total_courses,
      percentage: totalClasses > 0 ? (stat.total_courses / totalClasses) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const mostPracticedDiscipline = disciplineDistribution[0] || { name: "Aucune", count: 0 }

  // Recent milestones
  const recentMilestones = milestones.slice(0, 3)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Statistiques générales</CardTitle>
          <CardDescription>Votre activité globale basée sur vos réservations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalClasses}</div>
              <div className="text-sm text-muted-foreground">Cours suivis</div>
            </div>
            <div className="text-center p-4 bg-accent/5 rounded-lg">
              <div className="text-2xl font-bold text-accent">{Math.round(totalHours)}h</div>
              <div className="text-sm text-muted-foreground">Temps total</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{thisMonthClasses}</div>
              <div className="text-xs text-muted-foreground">Ce mois-ci</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{thisWeekClasses}</div>
              <div className="text-xs text-muted-foreground">Cette semaine</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Disciplines pratiquées</span>
              <span>
                {activeDisciplines}/{totalDisciplines}
              </span>
            </div>
            <Progress value={(activeDisciplines / totalDisciplines) * 100} className="h-2" />
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Discipline favorite</span>
              <Badge variant="secondary">{mostPracticedDiscipline.name}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Répartition par discipline</CardTitle>
          <CardDescription>Vos cours par discipline (données réelles)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {disciplineDistribution.map((discipline) => (
              <div key={discipline.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{discipline.name}</span>
                  <span>
                    {discipline.count} cours ({discipline.percentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={discipline.percentage} className="h-2" />
              </div>
            ))}
            {disciplineDistribution.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Aucun cours suivi pour le moment</p>
                <p className="text-xs mt-1">Réservez votre premier cours pour commencer !</p>
              </div>
            )}
          </div>

          {recentMilestones.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">🏆 Dernières réalisations</h4>
              <div className="space-y-1">
                {recentMilestones.map((milestone, index) => (
                  <div key={index} className="text-xs bg-accent/10 rounded px-2 py-1">
                    <span className="font-medium">{milestone.milestone_name}</span>
                    {milestone.discipline_name && (
                      <span className="text-muted-foreground"> • {milestone.discipline_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
