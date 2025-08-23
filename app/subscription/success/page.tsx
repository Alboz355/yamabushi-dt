"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"

export default function SuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 10000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-white/95 backdrop-blur-sm border-red-200 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Bienvenue à l'Académie Yamabushi !</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-slate-700">Votre abonnement a été activé avec succès.</p>
            <p className="text-sm text-slate-600">Vous pouvez maintenant accéder à tous nos cours et services.</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Prochaines étapes :</h3>
            <ul className="text-sm text-green-800 space-y-1 text-left">
              <li>• Consultez votre dashboard personnel</li>
              <li>• Réservez votre premier cours</li>
              <li>• Complétez votre profil si nécessaire</li>
              <li>• Découvrez vos objectifs de progression</li>
            </ul>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            Accéder au Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-xs text-slate-500">Redirection automatique dans 10 secondes...</p>
        </CardContent>
      </Card>
    </div>
  )
}
