"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AttendanceStatsProps {
  attendanceData: any[]
}

export function AttendanceStats({ attendanceData }: AttendanceStatsProps) {
  const safeAttendanceData = attendanceData || []

  // Calculate monthly attendance for the last 6 months
  const monthlyStats = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    const count = safeAttendanceData.filter((attendance) => {
      const sessionDate = new Date(attendance.class_sessions?.session_date)
      return sessionDate.getMonth() === month.getMonth() && sessionDate.getFullYear() === month.getFullYear()
    }).length

    monthlyStats.push({ month: monthName, count })
  }

  // Calculate weekly consistency (last 4 weeks)
  const weeklyStats = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (i * 7 + now.getDay()))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const count = safeAttendanceData.filter((attendance) => {
      const sessionDate = new Date(attendance.class_sessions?.session_date)
      return sessionDate >= weekStart && sessionDate <= weekEnd
    }).length

    weeklyStats.push({
      week: `Semaine ${4 - i}`,
      count,
      dates: `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
    })
  }

  // Recent activity
  const recentClasses = safeAttendanceData.slice(0, 5).map((attendance) => ({
    className: attendance.class_sessions?.classes?.name,
    discipline: attendance.class_sessions?.classes?.disciplines?.name,
    date: attendance.class_sessions?.session_date,
    colorCode: attendance.class_sessions?.classes?.disciplines?.color_code,
  }))

  const maxMonthlyCount = Math.max(...monthlyStats.map((stat) => stat.count), 1)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Assiduité mensuelle</CardTitle>
          <CardDescription>Vos cours des 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyStats.map((stat, index) => {
              const percentage = (stat.count / maxMonthlyCount) * 100
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{stat.month}</span>
                    <span className="font-medium">{stat.count} cours</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Activité récente</CardTitle>
          <CardDescription>Vos derniers cours suivis</CardDescription>
        </CardHeader>
        <CardContent>
          {recentClasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun cours suivi récemment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClasses.map((classInfo, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: classInfo.colorCode }} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{classInfo.className}</p>
                    <p className="text-xs text-muted-foreground">
                      {classInfo.date ? new Date(classInfo.date).toLocaleDateString("fr-FR") : "Date inconnue"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {classInfo.discipline}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
