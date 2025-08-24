"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  Megaphone,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react"

interface RoomMessage {
  id: string
  room_name: string
  title: string
  message: string
  message_type: string
  priority: number
  is_active: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}

export function RoomMessaging() {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingMessage, setEditingMessage] = useState<RoomMessage | null>(null)
  const [formData, setFormData] = useState({
    room_name: "",
    title: "",
    message: "",
    message_type: "info",
    priority: 1,
    expires_at: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const response = await fetch("/api/instructor/room-messages")
      if (!response.ok) throw new Error("Failed to fetch messages")

      const data = await response.json()
      setMessages(data.messages)
    } catch (error) {
      console.error("Error loading messages:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingMessage
        ? `/api/instructor/room-messages/${editingMessage.id}`
        : "/api/instructor/room-messages"
      const method = editingMessage ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save message")

      toast({
        title: "Succès",
        description: editingMessage ? "Message mis à jour" : "Message créé",
      })

      setShowCreateDialog(false)
      setEditingMessage(null)
      setFormData({
        room_name: "",
        title: "",
        message: "",
        message_type: "info",
        priority: 1,
        expires_at: "",
      })
      loadMessages()
    } catch (error) {
      console.error("Error saving message:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le message",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (message: RoomMessage) => {
    setEditingMessage(message)
    setFormData({
      room_name: message.room_name,
      title: message.title,
      message: message.message,
      message_type: message.message_type,
      priority: message.priority,
      expires_at: message.expires_at ? message.expires_at.split("T")[0] : "",
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/instructor/room-messages/${messageId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete message")

      toast({
        title: "Succès",
        description: "Message supprimé",
      })

      loadMessages()
    } catch (error) {
      console.error("Error deleting message:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      })
    }
  }

  const toggleMessageStatus = async (message: RoomMessage) => {
    try {
      const response = await fetch(`/api/instructor/room-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...message,
          is_active: !message.is_active,
        }),
      })

      if (!response.ok) throw new Error("Failed to update message status")

      toast({
        title: "Succès",
        description: message.is_active ? "Message désactivé" : "Message activé",
      })

      loadMessages()
    } catch (error) {
      console.error("Error updating message status:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      })
    }
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "announcement":
        return <Megaphone className="h-4 w-4" />
      case "schedule_change":
        return <Calendar className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "announcement":
        return "bg-blue-100 text-blue-800"
      case "schedule_change":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return "border-l-red-500"
    if (priority >= 3) return "border-l-yellow-500"
    return "border-l-blue-500"
  }

  const resetForm = () => {
    setFormData({
      room_name: "",
      title: "",
      message: "",
      message_type: "info",
      priority: 1,
      expires_at: "",
    })
    setEditingMessage(null)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">Messages de Salle</h2>
          <p className="text-muted-foreground">Communiquez avec les membres de vos salles</p>
        </div>
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingMessage ? "Modifier le Message" : "Créer un Nouveau Message"}</DialogTitle>
              <DialogDescription>
                Créez un message qui sera visible par tous les membres de la salle spécifiée
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room_name">Nom de la Salle</Label>
                  <Input
                    id="room_name"
                    value={formData.room_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, room_name: e.target.value }))}
                    placeholder="ex: Dojo Principal, Salle A..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message_type">Type de Message</Label>
                  <Select
                    value={formData.message_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, message_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Avertissement</SelectItem>
                      <SelectItem value="announcement">Annonce</SelectItem>
                      <SelectItem value="schedule_change">Changement d'Horaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titre du Message</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre accrocheur pour votre message"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Rédigez votre message ici..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité (1-5)</Label>
                  <Select
                    value={formData.priority.toString()}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Faible</SelectItem>
                      <SelectItem value="2">2 - Normale</SelectItem>
                      <SelectItem value="3">3 - Importante</SelectItem>
                      <SelectItem value="4">4 - Urgente</SelectItem>
                      <SelectItem value="5">5 - Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Date d'Expiration (optionnel)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">{editingMessage ? "Mettre à Jour" : "Créer le Message"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun message</h3>
                <p className="text-muted-foreground mb-4">Créez votre premier message de salle</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un Message
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className={`border-l-4 ${getPriorityColor(message.priority)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{message.title}</CardTitle>
                    <Badge className={getMessageTypeColor(message.message_type)}>
                      {getMessageTypeIcon(message.message_type)}
                      <span className="ml-1">{message.message_type}</span>
                    </Badge>
                    {message.priority >= 4 && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{message.room_name}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMessageStatus(message)}
                      className={message.is_active ? "text-green-600" : "text-gray-400"}
                    >
                      {message.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(message)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le message</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(message.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  Créé le{" "}
                  {new Date(message.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {message.expires_at && (
                    <span className="ml-2">• Expire le {new Date(message.expires_at).toLocaleDateString("fr-FR")}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{message.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={message.is_active ? "default" : "secondary"}>
                      {message.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge variant="outline">Priorité {message.priority}</Badge>
                  </div>
                  {message.updated_at !== message.created_at && (
                    <span className="text-xs text-muted-foreground">
                      Modifié le {new Date(message.updated_at).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
