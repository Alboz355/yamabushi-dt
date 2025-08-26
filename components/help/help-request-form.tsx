"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@supabase/supabase-js"

interface HelpRequestFormProps {
  user: User
  profile: any
}

export function HelpRequestForm({ user, profile }: HelpRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("")
  const [message, setMessage] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !category || !message.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          category,
          message,
          user_email: user.email,
          user_name:
            profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi de la demande")
      }

      toast({
        title: "Demande envoyée",
        description: "Votre demande d'aide a été envoyée avec succès. Notre équipe vous répondra bientôt.",
      })

      // Reset form
      setSubject("")
      setCategory("")
      setMessage("")
    } catch (error) {
      console.error("Error submitting help request:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="subject">Sujet *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Résumez votre demande en quelques mots"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Catégorie *</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="subscription">Problème d'abonnement</SelectItem>
            <SelectItem value="booking">Réservation de cours</SelectItem>
            <SelectItem value="payment">Facturation et paiement</SelectItem>
            <SelectItem value="technical">Problème technique</SelectItem>
            <SelectItem value="account">Compte utilisateur</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre problème ou votre question en détail..."
          rows={6}
          required
        />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Informations de contact</h4>
        <p className="text-sm text-muted-foreground">
          <strong>Email :</strong> {user.email}
        </p>
        {profile?.first_name && profile?.last_name && (
          <p className="text-sm text-muted-foreground">
            <strong>Nom :</strong> {profile.first_name} {profile.last_name}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
      </Button>
    </form>
  )
}
