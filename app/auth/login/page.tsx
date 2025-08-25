"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showMfaVerification, setShowMfaVerification] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const router = useRouter()

  const redirectToDashboard = () => {
    console.log("[v0] Login successful, redirecting to dashboard")
    window.location.href = "/dashboard"
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Starting login process...")
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      console.log("[v0] Password authentication successful, checking MFA...")

      const { data: factors } = await supabase.auth.mfa.listFactors()
      console.log("[v0] MFA factors:", factors)

      const verifiedFactors = factors?.totp?.filter((factor) => factor.status === "verified") || []

      if (verifiedFactors.length > 0) {
        console.log("[v0] MFA required, showing verification step")
        // User has MFA enabled, show verification step
        setShowMfaVerification(true)
        setIsLoading(false)
        return
      }

      console.log("[v0] No MFA required, redirecting to dashboard")
      redirectToDashboard()
    } catch (error: unknown) {
      console.log("[v0] Login error:", error)
      setError(error instanceof Error ? error.message : "Une erreur s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Starting MFA verification...")

      // Get the first verified TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verifiedFactor = factors?.totp?.find((factor) => factor.status === "verified")

      if (!verifiedFactor) {
        throw new Error("Aucun facteur MFA vérifié trouvé")
      }

      console.log("[v0] Creating MFA challenge...")
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      })

      if (challengeError) throw challengeError

      console.log("[v0] Verifying MFA code...")
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code: mfaCode,
      })

      if (verifyError) throw verifyError

      console.log("[v0] MFA verification successful, redirecting to dashboard")
      redirectToDashboard()
    } catch (error: unknown) {
      console.log("[v0] MFA verification error:", error)
      setError(error instanceof Error ? error.message : "Code de vérification incorrect")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowMfaVerification(false)
    setMfaCode("")
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif font-black text-4xl text-primary mb-2">YAMABUSHI</h1>
          <p className="text-muted-foreground">Académie d'Arts Martiaux</p>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl text-primary">
              {showMfaVerification ? "Authentification à deux facteurs" : "Connexion"}
            </CardTitle>
            <CardDescription>
              {showMfaVerification
                ? "Entrez le code de votre application d'authentification"
                : "Accédez à votre espace membre"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showMfaVerification ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMfaVerification} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Code de vérification</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder="123456"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="border-2 focus:border-primary text-center text-lg tracking-widest"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Entrez le code à 6 chiffres de votre application d'authentification
                  </p>
                </div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading || mfaCode.length !== 6}>
                    {isLoading ? "Vérification..." : "Vérifier"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                  >
                    Retour
                  </Button>
                </div>
              </form>
            )}

            {!showMfaVerification && (
              <div className="mt-6 text-center text-sm">
                <p className="text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link href="/auth/sign-up" className="text-primary hover:text-primary/80 font-semibold">
                    Créer un compte
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
