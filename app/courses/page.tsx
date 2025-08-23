"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, AlertTriangle, CalendarDays, Star } from "lucide-react"
import { format, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BottomNav } from "@/components/mobile/bottom-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default function CoursesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all")
  const [selectedClub, setSelectedClub] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [bookingStatus, setBookingStatus] = useState({ canBook: true, noShowCount: 0 })
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
          setProfile(profile)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const yamabushiDisciplines = [
    {
      id: "1",
      name: "Boxe anglaise",
      emoji: "🥊",
      description: "Boxe traditionnelle avec gants",
      color: "#ef4444",
      maxParticipants: 20,
    },
    {
      id: "2",
      name: "Cardio Boxing",
      emoji: "💪",
      description: "Boxe fitness pour le cardio",
      color: "#f97316",
      maxParticipants: 25,
    },
    {
      id: "3",
      name: "Cross Training",
      emoji: "🏋️",
      description: "Entraînement fonctionnel croisé",
      color: "#eab308",
      maxParticipants: 18,
    },
    {
      id: "4",
      name: "Grappling",
      emoji: "🤼",
      description: "Lutte au sol sans kimono",
      color: "#22c55e",
      maxParticipants: 16,
    },
    {
      id: "5",
      name: "Jiu-Jitsu",
      emoji: "🥋",
      description: "Art martial japonais traditionnel",
      color: "#06b6d4",
      maxParticipants: 18,
    },
    {
      id: "6",
      name: "JJB",
      emoji: "🇧🇷",
      description: "Jiu-Jitsu Brésilien (BJJ)",
      color: "#3b82f6",
      maxParticipants: 16,
    },
    {
      id: "7",
      name: "Judo",
      emoji: "🥋",
      description: "Art martial japonais olympique",
      color: "#6366f1",
      maxParticipants: 20,
    },
    {
      id: "8",
      name: "Kickboxing",
      emoji: "🦵",
      description: "Boxe avec coups de pieds",
      color: "#8b5cf6",
      maxParticipants: 22,
    },
    {
      id: "9",
      name: "Lutte",
      emoji: "🤼‍♂️",
      description: "Sport de combat olympique",
      color: "#a855f7",
      maxParticipants: 16,
    },
    { id: "10", name: "MMA", emoji: "⚔️", description: "Arts martiaux mixtes", color: "#d946ef", maxParticipants: 12 },
    {
      id: "11",
      name: "Muay Thai",
      emoji: "🇹🇭",
      description: "Boxe thaïlandaise traditionnelle",
      color: "#ec4899",
      maxParticipants: 20,
    },
    {
      id: "12",
      name: "Musculation",
      emoji: "💪",
      description: "Renforcement musculaire",
      color: "#f43f5e",
      maxParticipants: 15,
    },
  ]

  const yamabushiClubs = [
    {
      id: "1",
      name: "Yamabushi Genève Centre",
      emoji: "🏢",
      address: "Rue du Rhône 65, 1207 Genève",
      phone: "+41 22 123 45 67",
    },
    {
      id: "2",
      name: "Yamabushi Genève Plainpalais",
      emoji: "🏛️",
      address: "Plaine de Plainpalais 12, 1205 Genève",
      phone: "+41 22 234 56 78",
    },
    {
      id: "3",
      name: "Yamabushi Lausanne",
      emoji: "🏔️",
      address: "Avenue de la Gare 33, 1003 Lausanne",
      phone: "+41 21 345 67 89",
    },
    {
      id: "4",
      name: "Yamabushi Montreux",
      emoji: "🌊",
      address: "Grand-Rue 87, 1820 Montreux",
      phone: "+41 21 456 78 90",
    },
  ]

  const levels = [
    { value: "beginner", label: "🟢 Débutant", description: "Aucune expérience requise" },
    { value: "intermediate", label: "🟡 Intermédiaire", description: "6+ mois d'expérience" },
    { value: "advanced", label: "🔴 Avancé", description: "2+ années d'expérience" },
    { value: "competition", label: "🏆 Compétition", description: "Niveau compétiteur" },
  ]

  const generateAvailableCourses = () => {
    const courses = []
    const today = new Date(selectedDate)

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const sessionDate = format(addDays(today, dayOffset), "yyyy-MM-dd")

      // Morning sessions (9h-12h)
      const morningDisciplines = yamabushiDisciplines
        .filter((d) => selectedDiscipline === "all" || d.id === selectedDiscipline)
        .slice(0, 4)

      morningDisciplines.forEach((discipline, index) => {
        const maxParticipants = discipline.maxParticipants
        const currentBookings = Math.floor(Math.random() * (maxParticipants * 0.8)) // 0-80% occupancy
        const availableSpots = maxParticipants - currentBookings

        if (availableSpots > 0) {
          courses.push({
            id: `morning-${sessionDate}-${discipline.id}`,
            discipline,
            date: sessionDate,
            startTime: "09:00",
            endTime: "10:30",
            duration: 90,
            level: levels[index % levels.length].value,
            instructor: `Maître ${discipline.name.split(" ")[0]}`,
            club: yamabushiClubs[index % yamabushiClubs.length],
            room: discipline.name === "Musculation" ? "Salle Musculation" : "Dojo Principal",
            maxParticipants,
            currentBookings,
            availableSpots,
            price: discipline.name === "MMA" ? 35 : discipline.name.includes("Boxing") ? 25 : 30,
            rating: 4.2 + Math.random() * 0.8, // 4.2-5.0 rating
          })
        }
      })

      // Evening sessions (18h-21h) - More popular
      yamabushiDisciplines
        .filter((d) => selectedDiscipline === "all" || d.id === selectedDiscipline)
        .forEach((discipline, index) => {
          const maxParticipants = discipline.maxParticipants
          const currentBookings = Math.floor(Math.random() * maxParticipants) // 0-100% occupancy
          const availableSpots = maxParticipants - currentBookings

          if (availableSpots > 0) {
            courses.push({
              id: `evening-${sessionDate}-${discipline.id}`,
              discipline,
              date: sessionDate,
              startTime: "18:30",
              endTime: "20:00",
              duration: 90,
              level: levels[(index + 1) % levels.length].value,
              instructor: `Sensei ${discipline.name.split(" ")[0]}`,
              club: yamabushiClubs[(index + 1) % yamabushiClubs.length],
              room:
                discipline.name === "Musculation"
                  ? "Salle Musculation"
                  : index % 2 === 0
                    ? "Dojo Principal"
                    : "Salle Combat",
              maxParticipants,
              currentBookings,
              availableSpots,
              price: discipline.name === "MMA" ? 35 : discipline.name.includes("Boxing") ? 25 : 30,
              rating: 4.0 + Math.random() * 1.0, // 4.0-5.0 rating
            })
          }
        })
    }

    // Apply filters
    return courses
      .filter((course) => {
        if (selectedClub !== "all" && course.club.id !== selectedClub) return false
        if (selectedLevel !== "all" && course.level !== selectedLevel) return false
        return true
      })
      .sort((a, b) => {
        // Sort by date, then by time
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.startTime.localeCompare(b.startTime)
      })
  }

  const availableCourses = generateAvailableCourses()

  const bookCourse = async (courseId: string) => {
    if (!bookingStatus.canBook) return

    setBookingLoading(courseId)

    // Simulate booking process
    setTimeout(() => {
      const course = availableCourses.find((c) => c.id === courseId)
      if (course) {
        course.currentBookings += 1
        course.availableSpots -= 1
        alert(
          `✅ Cours "${course.discipline.name}" réservé avec succès!\n📅 ${format(new Date(course.date), "EEEE d MMMM", { locale: fr })} à ${course.startTime}\n🏢 ${course.club.name}`,
        )
      }
      setBookingLoading(null)
    }, 1500)
  }

  const getLevelBadge = (level: string) => {
    const levelInfo = levels.find((l) => l.value === level)
    return levelInfo ? levelInfo.label : "⚪ Tous niveaux"
  }

  const getOccupancyColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage < 50) return "text-green-600"
    if (percentage < 80) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">
      {user && <DashboardHeader user={user} profile={profile} />}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
            🥋 Réservation de Cours
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez nos {yamabushiDisciplines.length} disciplines dans {yamabushiClubs.length} clubs à travers la
            Suisse
          </p>
        </div>

        {!bookingStatus.canBook && (
          <Alert className="mb-6 border-red-200 bg-red-50/80 backdrop-blur-sm">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">
              ⚠️ Réservation suspendue: Vous avez manqué {bookingStatus.noShowCount} cours récemment. Contactez
              l'administration pour réactiver votre compte.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <CalendarDays className="h-6 w-6 text-primary" />
              Filtres de recherche
            </CardTitle>
            <CardDescription>Personnalisez votre recherche pour trouver le cours parfait</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">🥊 Discipline</label>
                <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                  <SelectTrigger className="h-12 text-left">
                    <SelectValue placeholder="Choisir une discipline" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="all" className="font-medium">
                      🎯 Toutes les disciplines ({yamabushiDisciplines.length})
                    </SelectItem>
                    {yamabushiDisciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{discipline.emoji}</span>
                          <div>
                            <div className="font-medium">{discipline.name}</div>
                            <div className="text-xs text-muted-foreground">{discipline.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  🏢 Club Yamabushi
                </label>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choisir un club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium">
                      🌍 Tous les clubs ({yamabushiClubs.length})
                    </SelectItem>
                    {yamabushiClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{club.emoji}</span>
                          <div>
                            <div className="font-medium">{club.name}</div>
                            <div className="text-xs text-muted-foreground">{club.address}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">📊 Niveau</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choisir un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium">
                      📈 Tous niveaux
                    </SelectItem>
                    {levels.map((level) => (
                      <SelectItem key={level.value} value={level.value} className="py-3">
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">📅 Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                    className="w-full h-12 px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium"
                  />
                  <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              📋 Cours disponibles
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {availableCourses.length}
              </Badge>
            </h2>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}
            </Badge>
          </div>

          {availableCourses.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-16 text-center">
                <div className="text-8xl mb-6">😔</div>
                <h3 className="text-2xl font-bold text-muted-foreground mb-3">Aucun cours disponible</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Essayez de modifier vos filtres ou sélectionnez une autre date pour voir plus d'options
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableCourses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-xl transition-all duration-300 border-0 bg-white/90 backdrop-blur-sm overflow-hidden group"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: course.discipline.color }} />

                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-3 mb-2">
                          <span className="text-2xl">{course.discipline.emoji}</span>
                          <div>
                            <div className="font-bold">{course.discipline.name}</div>
                            <div className="text-sm text-muted-foreground font-normal">avec {course.instructor}</div>
                          </div>
                        </CardTitle>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className="text-xs px-2 py-1"
                            style={{ backgroundColor: course.discipline.color, color: "white" }}
                          >
                            {getLevelBadge(course.level)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{course.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{course.price}.-</div>
                        <div className="text-xs text-muted-foreground">CHF</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {format(new Date(course.date), "EEE d MMM", { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {course.startTime} - {course.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{course.room}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span
                          className={`font-medium ${getOccupancyColor(course.currentBookings, course.maxParticipants)}`}
                        >
                          {course.currentBookings}/{course.maxParticipants}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{course.club.emoji}</span>
                        <div>
                          <div className="font-medium">{course.club.name}</div>
                          <div className="text-xs text-muted-foreground">{course.club.address}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {course.availableSpots} places libres
                        </Badge>
                        <span className="text-xs text-muted-foreground">{course.duration} min</span>
                      </div>

                      <Button
                        onClick={() => bookCourse(course.id)}
                        disabled={!bookingStatus.canBook || bookingLoading === course.id || course.availableSpots === 0}
                        size="lg"
                        className="min-w-[140px] font-semibold"
                        style={{ backgroundColor: course.discipline.color }}
                      >
                        {bookingLoading === course.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Réservation...
                          </span>
                        ) : course.availableSpots === 0 ? (
                          "❌ Complet"
                        ) : (
                          "✅ Réserver"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
