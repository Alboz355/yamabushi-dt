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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { useTranslation } from "@/lib/i18n/context"

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string>("")
  const [secret, setSecret] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState("")
  const [factorId, setFactorId] = useState<string>("")

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

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profileData)

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

      if (existingFactors?.all && existingFactors.all.length > 0) {
        for (const factor of existingFactors.all) {
          if (factor.status === "unverified") {
            console.log("[v0] Removing unverified factor:", factor.id)
            await supabase.auth.mfa.unenroll({ factorId: factor.id })
          } else if (factor.status === "verified") {
            console.log("[v0] Found existing verified factor, refreshing list")
            setMfaFactors(existingFactors?.totp || [])
            toast({
              title: t("settings.mfa.alreadyEnabled"),
              description: t("settings.mfa.alreadyEnabledDescription"),
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
          title: t("settings.mfa.configure"),
          description: t("settings.mfa.scanQRCode"),
        })
      } else {
        console.log("[v0] MFA data structure:", data)
        throw new Error(t("settings.mfa.missingData"))
      }
    } catch (error: any) {
      console.log("[v0] MFA enrollment failed:", error)
      toast({
        title: t("common.error"),
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

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      console.log("[v0] MFA challenge response:", { challengeData, challengeError })

      if (challengeError) {
        console.log("[v0] MFA challenge error:", challengeError)
        throw challengeError
      }

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

      const { data: factors } = await supabase.auth.mfa.listFactors()
      console.log("[v0] Updated MFA factors:", factors)
      setMfaFactors(factors?.totp || [])

      setQrCode("")
      setSecret("")
      setVerificationCode("")
      setFactorId("")

      toast({
        title: t("settings.mfa.enabled"),
        description: t("settings.mfa.enabledDescription"),
      })
    } catch (error: any) {
      console.log("[v0] MFA verification failed:", error)
      toast({
        title: t("settings.mfa.verifyError"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) throw error

      const { data: factors } = await supabase.auth.mfa.listFactors()
      setMfaFactors(factors?.totp || [])

      toast({
        title: t("settings.mfa.disabled"),
        description: t("settings.mfa.disabledDescription"),
      })
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("settings.password.mismatch"),
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: t("common.error"),
        description: t("settings.password.minLength"),
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)

    try {
      console.log("[v0] Starting password change...")

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      })

      if (verifyError) {
        console.log("[v0] Current password verification failed:", verifyError)
        throw new Error(t("settings.password.incorrect"))
      }

      console.log("[v0] Current password verified, updating to new password...")

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        console.log("[v0] Password update failed:", updateError)
        throw updateError
      }

      console.log("[v0] Password updated successfully")

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordChange(false)

      toast({
        title: t("settings.password.changed"),
        description: t("settings.password.changedDescription"),
      })
    } catch (error: any) {
      console.log("[v0] Password change error:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("settings.password.changeFailed"),
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

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as "fr" | "de" | "it" | "en")

    toast({
      title: t("settings.language.changed"),
      description: `${t("settings.language.changedTo")} ${getLanguageName(newLanguage)}`,
    })
  }

  const getLanguageName = (code: string) => {
    const languages = {
      fr: "Français",
      de: "Deutsch",
      it: "Italiano",
      en: "English",
    }
    return languages[code as keyof typeof languages] || "Français"
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("common.loading")}</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
            <p className="text-muted-foreground">{t("settings.description")}</p>
          </div>

          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="security">{t("settings.tabs.security")}</TabsTrigger>
              <TabsTrigger value="profile">{t("settings.tabs.profile")}</TabsTrigger>
              <TabsTrigger value="language">{t("settings.tabs.language")}</TabsTrigger>
              <TabsTrigger value="notifications">{t("settings.tabs.notifications")}</TabsTrigger>
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
                    {t("settings.mfa.title")}
                  </CardTitle>
                  <CardDescription>{t("settings.mfa.description")}</CardDescription>
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
                            {t("settings.mfa.enabled")}
                          </span>
                          <Badge variant="secondary">{t("settings.mfa.active")}</Badge>
                        </AlertDescription>
                      </Alert>

                      {mfaFactors.map((factor) => (
                        <div key={factor.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{factor.friendly_name || "Authenticator App"}</p>
                            <p className="text-sm text-muted-foreground">
                              {t("settings.mfa.createdOn")} {new Date(factor.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => unenrollMFA(factor.id)}>
                            {t("settings.mfa.disable")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>{t("settings.mfa.notEnabled")}</AlertDescription>
                      </Alert>

                      {!qrCode ? (
                        <Button onClick={enrollMFA} disabled={enrolling}>
                          {enrolling ? t("settings.mfa.configuring") : t("settings.mfa.enable")}
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center space-y-4">
                            <p className="font-medium">{t("settings.mfa.scanQRCode")}</p>
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
                              <p>{t("settings.mfa.enterSecret")}</p>
                              <div className="bg-muted p-3 rounded-lg">
                                <code className="text-xs break-all">{secret}</code>
                              </div>
                              <p className="text-xs">{t("settings.mfa.recommendedApps")}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="verification-code">{t("settings.mfa.verificationCode")}</Label>
                            <Input
                              id="verification-code"
                              placeholder="000000"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              maxLength={6}
                              className="text-center text-lg tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground">{t("settings.mfa.enterCode")}</p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={verifyMFA}
                              disabled={!verificationCode || verificationCode.length !== 6}
                              className="flex-1"
                            >
                              {t("settings.mfa.verifyAndEnable")}
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
                              {t("common.cancel")}
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
                  <CardTitle>{t("settings.password.title")}</CardTitle>
                  <CardDescription>{t("settings.password.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showPasswordChange ? (
                    <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
                      {t("settings.password.change")}
                    </Button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">{t("settings.password.current")}</Label>
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
                        <Label htmlFor="new-password">{t("settings.password.new")}</Label>
                        <Input
                          id="new-password"
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border-2 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">{t("settings.password.minLengthRequirement")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t("settings.password.confirm")}</Label>
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
                          {changingPassword ? t("settings.password.changing") : t("settings.password.change")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelPasswordChange}
                          disabled={changingPassword}
                        >
                          {t("common.cancel")}
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
                  <CardTitle>{t("settings.profile.title")}</CardTitle>
                  <CardDescription>{t("settings.profile.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">{t("settings.profile.firstName")}</Label>
                      <Input id="first-name" value={profile?.first_name || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">{t("settings.profile.lastName")}</Label>
                      <Input id="last-name" value={profile?.last_name || ""} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("settings.profile.email")}</Label>
                    <Input id="email" value={user.email || ""} readOnly />
                  </div>
                  <Button variant="outline">{t("settings.profile.edit")}</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {t("settings.language.title")}
                  </CardTitle>
                  <CardDescription>{t("settings.language.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language-select">{t("settings.language.preferred")}</Label>
                      <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("settings.language.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🇫🇷</span>
                              <span>{t("languages.fr")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="de">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🇩🇪</span>
                              <span>{t("languages.de")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="it">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🇮🇹</span>
                              <span>{t("languages.it")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="en">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🇬🇧</span>
                              <span>{t("languages.en")}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">{t("settings.language.applied")}</p>
                    </div>

                    <Alert>
                      <AlertDescription>
                        <strong>{t("settings.language.current")}:</strong> {getLanguageName(language)}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <h4 className="font-medium">{t("settings.language.available")}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>🇫🇷</span>
                          <span>{t("languages.fr")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🇩🇪</span>
                          <span>{t("languages.de")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🇮🇹</span>
                          <span>{t("languages.it")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🇬🇧</span>
                          <span>{t("languages.en")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.notifications.title")}</CardTitle>
                  <CardDescription>{t("settings.notifications.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.notifications.email")}</Label>
                      <p className="text-sm text-muted-foreground">{t("settings.notifications.emailDescription")}</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.notifications.courseReminders")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.notifications.courseRemindersDescription")}
                      </p>
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
