"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Flame, Target, Trophy } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  addMonths,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns"
import { fr } from "date-fns/locale"

interface TrainingCalendarProps {
  courseHistory: any[]
  userId: string
}

interface DayData {
  date: Date
  hasTraining: boolean
  courses: any[]
  isToday: boolean
  isPast: boolean
}

export function TrainingCalendar({ courseHistory, userId }: TrainingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Process course history to get training days
  const trainingDays = useMemo(() => {
    const days = new Map<string, any[]>()

    courseHistory.forEach((course) => {
      const dateKey = course.course_date
      if (!days.has(dateKey)) {
        days.set(dateKey, [])
      }
      days.get(dateKey)!.push(course)
    })

    return days
  }, [courseHistory])

  // Calculate current streak
  const currentStreak = useMemo(() => {
    const today = new Date()
    let streak = 0
    let checkDate = startOfDay(today)

    // Check if today has training
    const todayKey = format(checkDate, "yyyy-MM-dd")
    const hasTrainingToday = trainingDays.has(todayKey)

    // If no training today, start from yesterday
    if (!hasTrainingToday) {
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
    }

    // Count consecutive days with training going backwards
    while (true) {
      const dateKey = format(checkDate, "yyyy-MM-dd")
      if (trainingDays.has(dateKey)) {
        streak++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
      } else {
        break
      }
    }

    return streak
  }, [trainingDays])

  // Calculate longest streak
  const longestStreak = useMemo(() => {
    if (courseHistory.length === 0) return 0

    // Sort dates
    const sortedDates = Array.from(trainingDays.keys()).sort()
    let maxStreak = 1
    let currentStreakCount = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currentDate = new Date(sortedDates[i])
      const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000))

      if (dayDiff === 1) {
        currentStreakCount++
        maxStreak = Math.max(maxStreak, currentStreakCount)
      } else {
        currentStreakCount = 1
      }
    }

    return maxStreak
  }, [trainingDays, courseHistory.length])

  // Get days for current month
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    return days.map((date): DayData => {
      const dateKey = format(date, "yyyy-MM-dd")
      const courses = trainingDays.get(dateKey) || []

      return {
        date,
        hasTraining: courses.length > 0,
        courses,
        isToday: isToday(date),
        isPast: isBefore(date, startOfDay(new Date())),
      }
    })
  }, [currentMonth, trainingDays])

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const trainingDaysCount = monthDays.filter((day) => day.hasTraining).length
    const totalCourses = monthDays.reduce((sum, day) => sum + day.courses.length, 0)
    const daysInMonth = monthDays.length
    const consistency = daysInMonth > 0 ? (trainingDaysCount / daysInMonth) * 100 : 0

    return {
      trainingDays: trainingDaysCount,
      totalCourses,
      consistency: Math.round(consistency),
    }
  }, [monthDays])

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date())
  }

  const getDayIntensity = (coursesCount: number) => {
    if (coursesCount === 0) return "bg-muted/20"
    if (coursesCount === 1) return "bg-green-200 dark:bg-green-900"
    if (coursesCount === 2) return "bg-green-400 dark:bg-green-700"
    return "bg-green-600 dark:bg-green-500"
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-red-500"
    if (streak >= 14) return "text-orange-500"
    if (streak >= 7) return "text-yellow-500"
    if (streak >= 3) return "text-green-500"
    return "text-muted-foreground"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendrier d'entraînement
            </CardTitle>
            <CardDescription>Visualisez votre régularité et maintenez votre série</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
              {format(currentMonth, "MMM yyyy", { locale: fr })}
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStreakColor(currentStreak)}`}>{currentStreak}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Flame className="h-4 w-4" />
              Série actuelle
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{longestStreak}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4" />
              Record
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{monthlyStats.consistency}%</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-4 w-4" />
              Régularité
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span>{monthlyStats.trainingDays} jours d'entraînement</span>
            <span>{monthlyStats.totalCourses} cours suivis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted/20 rounded-sm"></div>
              <span className="text-xs">Repos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
              <span className="text-xs">1 cours</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
              <span className="text-xs">2 cours</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
              <span className="text-xs">3+ cours</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div>Sam</div>
            <div>Dim</div>
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, index) => (
              <div key={`empty-${index}`} className="h-8"></div>
            ))}

            {/* Month days */}
            {monthDays.map((day) => (
              <div
                key={format(day.date, "yyyy-MM-dd")}
                className={`
                  h-8 w-8 rounded-sm flex items-center justify-center text-xs font-medium
                  ${getDayIntensity(day.courses.length)}
                  ${day.isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                  ${day.hasTraining ? "text-white dark:text-white" : "text-muted-foreground"}
                  cursor-pointer hover:scale-110 transition-transform
                `}
                title={
                  day.hasTraining
                    ? `${format(day.date, "d MMM", { locale: fr })} - ${day.courses.length} cours: ${day.courses.map((c) => c.course_name).join(", ")}`
                    : format(day.date, "d MMM", { locale: fr })
                }
              >
                {format(day.date, "d")}
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        {currentStreak > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Flame className={`h-5 w-5 ${getStreakColor(currentStreak)}`} />
              <span className="font-semibold">Série en cours !</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentStreak >= 30 && "Incroyable ! Vous êtes une machine d'entraînement ! 🔥"}
              {currentStreak >= 14 && currentStreak < 30 && "Fantastique ! Vous êtes sur une excellente lancée ! 💪"}
              {currentStreak >= 7 && currentStreak < 14 && "Très bien ! Continuez sur cette voie ! ⭐"}
              {currentStreak >= 3 && currentStreak < 7 && "Bon début ! Maintenez le rythme ! 👍"}
              {currentStreak < 3 && "Continuez, chaque jour compte ! 🎯"}
            </p>
          </div>
        )}

        {currentStreak === 0 && courseHistory.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold">Reprenez votre série !</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre record est de {longestStreak} jours. Il est temps de recommencer une nouvelle série d'entraînement !
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
