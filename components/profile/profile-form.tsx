"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
  user: any
  profile: any
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    phone: profile?.phone || "",
    emergencyContact: profile?.emergency_contact || "",
    medicalInfo: profile?.medical_info || "",
    goals: profile?.goals || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          emergency_contact: formData.emergencyContact,
          medical_info: formData.medicalInfo,
          goals: formData.goals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      setMessage({ type: "success", text: "Profil mis à jour avec succès" })
      router.refresh()
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary">Informations personnelles</CardTitle>
        <CardDescription>Mettez à jour vos informations de profil</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="border-2 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="border-2 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Contact d'urgence</Label>
            <Input
              id="emergencyContact"
              placeholder="Nom et téléphone"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="border-2 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalInfo">Informations médicales</Label>
            <Textarea
              id="medicalInfo"
              placeholder="Allergies, blessures, conditions médicales..."
              value={formData.medicalInfo}
              onChange={(e) => setFormData({ ...formData, medicalInfo: e.target.value })}
              className="border-2 focus:border-primary"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Objectifs personnels</Label>
            <Textarea
              id="goals"
              placeholder="Vos objectifs dans les arts martiaux..."
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              className="border-2 focus:border-primary"
              rows={3}
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-accent/10 border border-accent/20 text-accent"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Mise à jour..." : "Mettre à jour le profil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
