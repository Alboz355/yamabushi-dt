"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string>("")
  const [secret, setSecret] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState("")
  const [factorId, setFactorId] = useState<string>("")
  const [challengeId, setChallengeId] = useState<string>("")

  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profileData)

      // Get MFA factors
      const { data: factors } = await supabase.auth.mfa.listFactors()
      setMfaFactors(factors?.totp || [])

      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const enrollMFA = async () => {
    try {
      console.log("[v0] Starting MFA enrollment...")
      setEnrolling(true)

      const { data: existingFactors } = await supabase.auth.mfa.listFactors()
      console.log("[v0] Existing factors:", existingFactors)

      // If there are existing unverified factors, clean them up
      if (existingFactors?.all && existingFactors.all.length > 0) {
        for (const factor of existingFactors.all) {
          if (factor.status === "unverified") {
            console.log("[v0] Removing unverified factor:", factor.id)
            await supabase.auth.mfa.unenroll({ factorId: factor.id })
          } else if (factor.status === "verified") {
            console.log("[v0] Found existing verified factor, refreshing list")
            setMfaFactors(existingFactors?.totp || [])
            toast({
              title: "MFA déjà activé",
              description: "L'authentification à deux facteurs est déjà active sur votre compte",
            })
            return
          }
        }
      }

      const factorName = `Yamabushi Academy ${Date.now()}`
      console.log("[v0] Using factor name:", factorName)

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: factorName,
      })

      console.log("[v0] MFA enrollment response:", { data, error })

      if (error) {
        console.log("[v0] MFA enrollment error:", error)
        throw error
      }

      if (data && data.totp && data.totp.qr_code && data.totp.secret) {
        console.log("[v0] Setting QR code and secret in state")
        console.log("[v0] QR code length:", data.totp.qr_code.length)
        console.log("[v0] Secret:", data.totp.secret)

        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)

        setTimeout(() => {
          console.log("[v0] QR code state after update:", qrCode ? "SET" : "NOT SET")
        }, 100)

        toast({
          title: "Configuration MFA",
          description: "Scannez le QR code avec votre application d'authentification",
        })
      } else {
        console.log("[v0] MFA data structure:", data)
        throw new Error("Données d'enrollment MFA manquantes")
      }
    } catch (error: any) {
      console.log("[v0] MFA enrollment failed:", error)
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setEnrolling(false)
    }
  }

  const verifyMFA = async () => {
    try {
      console.log("[v0] Starting MFA verification with code:", verificationCode)
      console.log("[v0] Factor ID:", factorId)

      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      console.log("[v0] MFA challenge response:", { challengeData, challengeError })

      if (challengeError) {
        console.log("[v0] MFA challenge error:", challengeError)
        throw challengeError
      }

      // Then verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      })

      console.log("[v0] MFA verify response:", { verifyError })

      if (verifyError) {
        console.log("[v0] MFA verify error:", verifyError)
        throw verifyError
      }

      console.log("[v0] MFA verification successful, refreshing factors")

      // Refresh factors
      const { data: factors } = await supabase.auth.mfa.listFactors()
      console.log("[v0] Updated MFA factors:", factors)
      setMfaFactors(factors?.totp || [])

      // Reset enrollment state
      setQrCode("")
      setSecret("")
      setVerificationCode("")
      setFactorId("")

      toast({
        title: "MFA activé",
        description: "L'authentification à deux facteurs a été activée avec succès",
      })
    } catch (error: any) {
      console.log("[v0] MFA verification failed:", error)
      toast({
        title: "Erreur de vérification",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) throw error

      // Refresh factors
      const { data: factors } = await supabase.auth.mfa.listFactors()
      setMfaFactors(factors?.totp || [])

      toast({
        title: "MFA désactivé",
        description: "L'authentification à deux facteurs a été désactivée",
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)

    try {
      console.log("[v0] Starting password change...")

      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      })

      if (verifyError) {
        console.log("[v0] Current password verification failed:", verifyError)
        throw new Error("Mot de passe actuel incorrect")
      }

      console.log("[v0] Current password verified, updating to new password...")

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        console.log("[v0] Password update failed:", updateError)
        throw updateError
      }

      console.log("[v0] Password updated successfully")

      // Reset form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordChange(false)

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès",
      })
    } catch (error: any) {
      console.log("[v0] Password change error:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setShowPasswordChange(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground">Gérez vos préférences et paramètres de sécurité</p>
          </div>

          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="security">Sécurité</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Authentification à deux facteurs (MFA)
                  </CardTitle>
                  <CardDescription>
                    Ajoutez une couche de sécurité supplémentaire à votre compte avec l'authentification TOTP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mfaFactors.length > 0 ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            MFA activé
                          </span>
                          <Badge variant="secondary">Actif</Badge>
                        </AlertDescription>
                      </Alert>

                      {mfaFactors.map((factor) => (
                        <div key={factor.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{factor.friendly_name || "Authenticator App"}</p>
                            <p className="text-sm text-muted-foreground">
                              Créé le {new Date(factor.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => unenrollMFA(factor.id)}>
                            Désactiver
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          L'authentification à deux facteurs n'est pas activée. Activez-la pour sécuriser votre compte.
                        </AlertDescription>
                      </Alert>

                      {!qrCode ? (
                        <Button onClick={enrollMFA} disabled={enrolling}>
                          {enrolling ? "Configuration..." : "Activer MFA"}
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center space-y-4">
                            <p className="font-medium">
                              Scannez ce QR code avec votre application d'authentification :
                            </p>
                            <div className="flex justify-center">
                              <div className="p-4 bg-white rounded-lg border">
                                <img
                                  src={qrCode || "/placeholder.svg"}
                                  alt="QR Code MFA"
                                  className="w-48 h-48"
                                  onError={(e) => {
                                    console.log("[v0] QR code image failed to load")
                                    console.log("[v0] QR code data:", qrCode.substring(0, 100) + "...")
                                  }}
                                  onLoad={() => {
                                    console.log("[v0] QR code image loaded successfully")
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>Ou entrez manuellement ce secret dans votre app :</p>
                              <div className="bg-muted p-3 rounded-lg">
                                <code className="text-xs break-all">{secret}</code>
                              </div>
                              <p className="text-xs">
                                Applications recommandées : Google Authenticator, Authy, Microsoft Authenticator
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="verification-code">Code de vérification à 6 chiffres</Label>
                            <Input
                              id="verification-code"
                              placeholder="000000"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              maxLength={6}
                              className="text-center text-lg tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground">
                              Entrez le code affiché dans votre application d'authentification
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={verifyMFA}
                              disabled={!verificationCode || verificationCode.length !== 6}
                              className="flex-1"
                            >
                              Vérifier et activer MFA
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                console.log("[v0] Cancelling MFA setup")
                                setQrCode("")
                                setSecret("")
                                setVerificationCode("")
                                setFactorId("")
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mot de passe</CardTitle>
                  <CardDescription>Modifiez votre mot de passe pour sécuriser votre compte</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showPasswordChange ? (
                    <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
                      Changer le mot de passe
                    </Button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Mot de passe actuel</Label>
                        <Input
                          id="current-password"
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="border-2 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nouveau mot de passe</Label>
                        <Input
                          id="new-password"
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border-2 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Le mot de passe doit contenir au moins 6 caractères
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="border-2 focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        >
                          {changingPassword ? "Modification..." : "Modifier le mot de passe"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelPasswordChange}
                          disabled={changingPassword}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations du profil</CardTitle>
                  <CardDescription>Gérez vos informations personnelles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">Prénom</Label>
                      <Input id="first-name" value={profile?.first_name || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Nom</Label>
                      <Input id="last-name" value={profile?.last_name || ""} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ""} readOnly />
                  </div>
                  <Button variant="outline">Modifier le profil</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Préférences de notification</CardTitle>
                  <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications par email</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevez des notifications par email pour les cours et événements
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Rappels de cours</Label>
                      <p className="text-sm text-muted-foreground">Recevez des rappels avant vos cours réservés</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
