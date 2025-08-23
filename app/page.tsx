import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="font-serif font-black text-5xl md:text-7xl text-primary mb-6">YAMABUSHI</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">Académie d'Arts Martiaux</p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Formation professionnelle en JJB, Grappling, Boxe et Kickboxing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl text-primary">Membres</CardTitle>
              <CardDescription>
                Accédez à votre espace personnel, réservez vos cours et suivez votre progression
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <Link href="/auth/login">Se connecter</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent" size="lg">
                <Link href="/auth/sign-up">Créer un compte</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-accent/50 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl text-accent">Disciplines</CardTitle>
              <CardDescription>Découvrez nos différentes disciplines d'arts martiaux</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="font-semibold text-primary">JJB</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-3 text-center">
                  <p className="font-semibold text-accent">Grappling</p>
                </div>
                <div className="bg-chart-3/10 rounded-lg p-3 text-center">
                  <p className="font-semibold text-chart-3">Boxe</p>
                </div>
                <div className="bg-chart-2/10 rounded-lg p-3 text-center">
                  <p className="font-semibold text-chart-2">Kickboxing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Rejoignez la communauté Yamabushi et développez vos compétences martiales
          </p>
        </div>
      </div>
    </div>
  )
}
