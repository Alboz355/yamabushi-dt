import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BottomNav } from "@/components/mobile/bottom-nav"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"
import { HelpRequestForm } from "@/components/help/help-request-form"

export default async function HelpPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: fullProfile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <DashboardHeader user={data.user} profile={fullProfile} />

        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-primary mb-2">Centre d'aide</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Besoin d'assistance ? Envoyez votre demande à notre équipe administrative
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-primary">Demande d'assistance</CardTitle>
                <CardDescription>
                  Décrivez votre problème ou votre question. Notre équipe vous répondra dans les plus brefs délais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HelpRequestForm user={data.user} profile={fullProfile} />
              </CardContent>
            </Card>
          </div>
        </div>

        <BottomNav />
      </div>
    </SubscriptionGuard>
  )
}
