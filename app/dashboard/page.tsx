import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { UpcomingClasses } from "@/components/dashboard/upcoming-classes"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { CourseRecommendations } from "@/components/dashboard/course-recommendations"
import { ClubMessages } from "@/components/dashboard/club-messages"
import { BottomNav } from "@/components/mobile/bottom-nav"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Get upcoming bookings
  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      class_sessions (
        *,
        classes (
          name,
          disciplines (name, color_code),
          instructors (
            profiles (first_name, last_name)
          )
        )
      )
    `)
    .eq("member_id", data.user.id)
    .eq("status", "confirmed")
    .gte("class_sessions.session_date", new Date().toISOString().split("T")[0])
    .order("class_sessions.session_date", { ascending: true })
    .limit(5)

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <DashboardHeader user={data.user} profile={profile} />

        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-primary mb-2">
              Bonjour {profile?.first_name || "Membre"} !
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Bienvenue dans votre espace membre Yamabushi</p>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
            <QuickStats userId={data.user.id} />
          </div>

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <div className="space-y-4 md:space-y-6">
              <UpcomingClasses bookings={upcomingBookings || []} />
              <CourseRecommendations userId={data.user.id} />

              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="font-serif text-primary text-lg md:text-xl">Actions rapides</CardTitle>
                  <CardDescription className="text-sm">
                    Accédez rapidement aux fonctionnalités principales
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 md:gap-3">
                  <Button asChild className="justify-start bg-transparent h-10 md:h-11" variant="outline">
                    <Link href="/booking">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm md:text-base">Réserver un cours</span>
                    </Link>
                  </Button>
                  <Button asChild className="justify-start bg-transparent h-10 md:h-11" variant="outline">
                    <Link href="/progress">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span className="text-sm md:text-base">Ma progression</span>
                    </Link>
                  </Button>
                  <Button asChild className="justify-start bg-transparent h-10 md:h-11" variant="outline">
                    <Link href="/billing">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-sm md:text-base">Mes factures</span>
                    </Link>
                  </Button>
                  <Button asChild className="justify-start bg-transparent h-10 md:h-11" variant="outline">
                    <Link href="/profile">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-sm md:text-base">Mon profil</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 md:space-y-6">
              <RecentActivity userId={data.user.id} />
              <ClubMessages />

              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="font-serif text-primary text-lg md:text-xl">Mon abonnement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm text-muted-foreground">Type d'abonnement</span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {profile?.membership_type?.replace("_", " ") || "Non défini"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm text-muted-foreground">Statut</span>
                      <Badge
                        variant={profile?.membership_status === "active" ? "default" : "destructive"}
                        className="capitalize text-xs"
                      >
                        {profile?.membership_status === "active" ? "Actif" : profile?.membership_status || "Inactif"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm text-muted-foreground">Membre depuis</span>
                      <span className="text-xs md:text-sm font-medium">
                        {profile?.join_date ? new Date(profile.join_date).toLocaleDateString("fr-FR") : "Non défini"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </SubscriptionGuard>
  )
}
