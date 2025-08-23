import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface SubscriptionInfoProps {
  subscription: any
}

export function SubscriptionInfo({ subscription }: SubscriptionInfoProps) {
  const daysUntilExpiry = subscription
    ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Abonnement</CardTitle>
          <CardDescription>Informations sur votre abonnement actuel</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan actuel</span>
                <Badge variant="default">
                  {subscription.plan_type === "monthly"
                    ? "Mensuel"
                    : subscription.plan_type === "six_months"
                      ? "6 Mois"
                      : subscription.plan_type === "annual"
                        ? "Annuel"
                        : subscription.plan_type}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix</span>
                <span className="font-semibold">{subscription.price}.-</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mode de paiement</span>
                <Badge variant="outline">{subscription.payment_method === "monthly" ? "Mensuel" : "Intégral"}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                  {subscription.status === "active" ? "Actif" : subscription.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expire le</span>
                <span className="text-sm">{new Date(subscription.end_date).toLocaleDateString("fr-FR")}</span>
              </div>

              {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Votre abonnement expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button asChild className="w-full bg-transparent" variant="outline">
                  <Link href="/subscription">Gérer l'abonnement</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">Aucun abonnement actif</p>
              <Button asChild>
                <Link href="/subscription">Souscrire un abonnement</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary">Fonctionnalités</CardTitle>
          <CardDescription>Accès selon votre abonnement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscription?.subscription_plans?.features?.map((feature: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-sm">{feature}</span>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground">Souscrivez un abonnement pour accéder aux fonctionnalités</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
