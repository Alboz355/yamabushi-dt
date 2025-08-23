import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile and current subscription
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { data: currentSubscription } = await supabase
    .from("subscriptions")
    .select("*, subscription_plans(*)")
    .eq("member_id", data.user.id)
    .eq("status", "active")
    .gte("end_date", new Date().toISOString().split("T")[0])
    .single()

  // Get all available plans
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Abonnements</h1>
          <p className="text-muted-foreground">Choisissez l'abonnement qui vous convient</p>
        </div>

        {currentSubscription && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-serif text-primary">Votre abonnement actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{currentSubscription.subscription_plans?.name}</h3>
                  <p className="text-muted-foreground">
                    Expire le {new Date(currentSubscription.end_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge variant="default">Actif</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans?.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_type === plan.plan_type
            const isPopular = plan.plan_type === "six_months"

            return (
              <Card
                key={plan.id}
                className={`relative ${isPopular ? "border-accent border-2" : "border-2"} ${isCurrentPlan ? "bg-primary/5" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground">Populaire</Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="font-serif text-xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {plan.price}.-
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.duration_months === 1 ? "mois" : `${plan.duration_months} mois`}
                      </span>
                    </div>
                    {plan.duration_months > 1 && (
                      <p className="text-sm text-muted-foreground">
                        Soit {(plan.price / plan.duration_months).toFixed(0)}.- par mois
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features?.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-accent" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan}
                    asChild={!isCurrentPlan}
                  >
                    {isCurrentPlan ? (
                      "Abonnement actuel"
                    ) : (
                      <Link
                        href={`/subscription/age-selection?plan=${plan.plan_type}&price=${plan.price}&name=${encodeURIComponent(plan.name)}`}
                      >
                        Choisir ce plan
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!currentSubscription && (
          <div className="mt-8 text-center">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-destructive mb-2">Aucun abonnement actif</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vous devez souscrire à un abonnement pour accéder aux cours et fonctionnalités avancées.
                </p>
                <Button asChild>
                  <Link href="/subscription">Choisir un abonnement</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
