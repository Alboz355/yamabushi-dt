import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif font-black text-4xl text-primary mb-2">YAMABUSHI</h1>
          <p className="text-muted-foreground">Académie d'Arts Martiaux</p>
        </div>

        <Card className="border-2 border-accent/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="font-serif text-2xl text-accent">Inscription réussie !</CardTitle>
            <CardDescription>Votre compte a été créé avec succès</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter et choisir votre abonnement
              pour commencer votre parcours dans les arts martiaux.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">Prochaines étapes :</p>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Connectez-vous à votre compte</li>
                <li>• Choisissez votre abonnement</li>
                <li>• Complétez votre profil</li>
                <li>• Réservez votre premier cours</li>
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/login">Se connecter maintenant</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
