"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface HelpRequest {
  id: string
  subject: string
  category: string
  message: string
  user_email: string
  user_name: string
  status: string
  created_at: string
  admin_response?: string
  responded_at?: string
}

export function AdminHelpRequests() {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null)
  const [response, setResponse] = useState("")
  const [isResponding, setIsResponding] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchHelpRequests()
  }, [])

  const fetchHelpRequests = async () => {
    try {
      const response = await fetch("/api/admin/help-requests")
      if (!response.ok) throw new Error("Failed to fetch help requests")

      const data = await response.json()
      setHelpRequests(data)
    } catch (error) {
      console.error("Error fetching help requests:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes d'aide",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/help-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      setHelpRequests((prev) => prev.map((req) => (req.id === requestId ? { ...req, status: newStatus } : req)))

      toast({
        title: "Statut mis à jour",
        description: "Le statut de la demande a été modifié avec succès",
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      })
    }
  }

  const handleSendResponse = async () => {
    if (!selectedRequest || !response.trim()) return

    setIsResponding(true)
    try {
      const apiResponse = await fetch(`/api/admin/help-requests/${selectedRequest.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim() }),
      })

      if (!apiResponse.ok) throw new Error("Failed to send response")

      toast({
        title: "Réponse envoyée",
        description: "Votre réponse a été envoyée à l'utilisateur par email",
      })

      setResponse("")
      setSelectedRequest(null)
      fetchHelpRequests()
    } catch (error) {
      console.error("Error sending response:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive",
      })
    } finally {
      setIsResponding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "destructive",
      in_progress: "secondary",
      resolved: "default",
    } as const

    const labels = {
      pending: "En attente",
      in_progress: "En cours",
      resolved: "Résolu",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      subscription: "Abonnement",
      booking: "Réservation",
      payment: "Paiement",
      technical: "Technique",
      account: "Compte",
      other: "Autre",
    }
    return labels[category as keyof typeof labels] || category
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demandes d'aide</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Chargement des demandes d'aide...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demandes d'aide des membres</CardTitle>
          <CardDescription>Gérez les demandes d'assistance des membres de l'académie</CardDescription>
        </CardHeader>
        <CardContent>
          {helpRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune demande d'aide pour le moment</p>
          ) : (
            <div className="space-y-4">
              {helpRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{request.subject}</h4>
                      <p className="text-sm text-muted-foreground">
                        De: {request.user_name || request.user_email} • {getCategoryLabel(request.category)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      <Select value={request.status} onValueChange={(value) => handleStatusChange(request.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="resolved">Résolu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-sm bg-muted/50 p-3 rounded">{request.message}</p>

                  {request.admin_response && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        Réponse envoyée le {new Date(request.responded_at!).toLocaleDateString("fr-FR")}:
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">{request.admin_response}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          {request.admin_response ? "Répondre à nouveau" : "Répondre"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Répondre à la demande</DialogTitle>
                          <DialogDescription>Répondre à: {request.user_name || request.user_email}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-muted/50 p-3 rounded">
                            <p className="font-medium mb-1">{request.subject}</p>
                            <p className="text-sm">{request.message}</p>
                          </div>
                          <Textarea
                            placeholder="Tapez votre réponse ici..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={6}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(null)
                                setResponse("")
                              }}
                            >
                              Annuler
                            </Button>
                            <Button onClick={handleSendResponse} disabled={!response.trim() || isResponding}>
                              {isResponding ? "Envoi..." : "Envoyer la réponse"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
