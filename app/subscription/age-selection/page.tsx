import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Baby } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

interface PageProps {
  searchParams: { plan?: string; price?: string; name?: string }
}

export default async function AgeSelectionPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { plan, price, name } = searchParams

  if (!plan || !price || !name) {
    redirect("/subscription")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Sélection d'âge</h1>
          <p className="text-muted-foreground">Choisissez votre catégorie d'âge</p>
          <div className="mt-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {decodeURIComponent(name)} - {price}.-
            </Badge>
          </div>
        </div>

        <div className="max-w-2xl mx-auto grid gap-6 md:grid-cols-2">
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <Baby className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="font-serif text-xl text-primary">Enfant</CardTitle>
              <p className="text-muted-foreground">Moins de 15 ans</p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link
                  href={`/subscription/registration?plan=${plan}&price=${price}&name=${encodeURIComponent(name)}&category=child`}
                >
                  Sélectionner Enfant
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="font-serif text-xl text-primary">Adulte</CardTitle>
              <p className="text-muted-foreground">15 ans ou plus</p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link
                  href={`/subscription/registration?plan=${plan}&price=${price}&name=${encodeURIComponent(name)}&category=adult`}
                >
                  Sélectionner Adulte
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/subscription">← Retour aux abonnements</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
