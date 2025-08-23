"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Trash2 } from "lucide-react"
import { TargetedMessaging } from "./targeted-messaging"

interface Message {
  id: string
  title: string
  message: string
  message_type: string
  priority: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  comment_count?: number
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user_name: string
  user_email: string
  is_admin: boolean
}

export function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [newMessage, setNewMessage] = useState({
    title: "",
    message: "",
    message_type: "info",
    priority: 1,
    expires_at: "",
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase.rpc("get_messages_with_comments")

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error loading messages:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadComments = async (messageId: string) => {
    setIsLoadingComments(true)
    try {
      const { data, error } = await supabase.rpc("get_message_comments", { message_uuid: messageId })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("Error loading comments:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les commentaires",
        variant: "destructive",
      })
    } finally {
      setIsLoadingComments(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("message_comments")
        .update({
          is_deleted: true,
          deleted_by: (await supabase.auth.getUser()).data.user?.id,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", commentId)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Commentaire supprimé",
      })

      // Reload comments for current message
      if (selectedMessage) {
        loadComments(selectedMessage.id)
      }
      // Reload messages to update comment count
      loadMessages()
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      })
    }
  }

  const createMessage = async () => {
    if (!newMessage.title || !newMessage.message) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const { error } = await supabase.from("admin_messages").insert({
        title: newMessage.title,
        message: newMessage.message,
        message_type: newMessage.message_type,
        priority: newMessage.priority,
        expires_at: newMessage.expires_at || null,
      })

      if (error) throw error

      toast({
        title: "Succès",
        description: "Message créé avec succès - Visible par tous les utilisateurs",
      })

      setNewMessage({
        title: "",
        message: "",
        message_type: "info",
        priority: 1,
        expires_at: "",
      })

      loadMessages()
    } catch (error) {
      console.error("Error creating message:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le message",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const toggleMessageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("admin_messages").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error

      toast({
        title: "Succès",
        description: `Message ${!currentStatus ? "activé" : "désactivé"}`,
      })

      loadMessages()
    } catch (error) {
      console.error("Error updating message:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier le message",
        variant: "destructive",
      })
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "urgent":
        return "bg-red-100 text-red-800"
      case "announcement":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <Tabs defaultValue="broadcast" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="broadcast">Messages généraux</TabsTrigger>
        <TabsTrigger value="targeted">Messages ciblés</TabsTrigger>
      </TabsList>

      <TabsContent value="broadcast" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau message</CardTitle>
            <CardDescription>Envoyez des annonces et informations visibles par tous les membres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Titre</label>
                <Input
                  value={newMessage.title}
                  onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                  placeholder="Titre du message"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={newMessage.message_type}
                  onValueChange={(value) => setNewMessage({ ...newMessage, message_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="announcement">Annonce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                placeholder="Contenu du message"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <Select
                  value={newMessage.priority.toString()}
                  onValueChange={(value) => setNewMessage({ ...newMessage, priority: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Normale</SelectItem>
                    <SelectItem value="2">Élevée</SelectItem>
                    <SelectItem value="3">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date d'expiration (optionnel)</label>
                <Input
                  type="datetime-local"
                  value={newMessage.expires_at}
                  onChange={(e) => setNewMessage({ ...newMessage, expires_at: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={createMessage} disabled={isCreating} className="w-full">
              {isCreating ? "Création..." : "Créer le message"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages existants</CardTitle>
            <CardDescription>Gérez les messages du club et leurs commentaires</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun message trouvé</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{message.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getMessageTypeColor(message.message_type)}>{message.message_type}</Badge>
                        <Badge variant={message.is_active ? "default" : "secondary"}>
                          {message.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{message.message}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Créé le {new Date(message.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMessage(message)
                                loadComments(message.id)
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              {message.comment_count || 0} commentaires
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Commentaires - {selectedMessage?.title}</DialogTitle>
                              <DialogDescription>
                                Gérez les commentaires des utilisateurs sur ce message
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {isLoadingComments ? (
                                <div className="text-center py-4">Chargement des commentaires...</div>
                              ) : comments.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">Aucun commentaire</div>
                              ) : (
                                comments.map((comment) => (
                                  <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{comment.user_name}</span>
                                        {comment.is_admin && (
                                          <Badge variant="secondary" className="text-xs">
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(comment.created_at).toLocaleDateString()}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => deleteComment(comment.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-sm">{comment.comment}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMessageStatus(message.id, message.is_active)}
                        >
                          {message.is_active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="targeted">
        <TargetedMessaging />
      </TabsContent>
    </Tabs>
  )
}
