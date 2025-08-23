"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { MessageCircle, Send } from "lucide-react"

interface Message {
  id: string
  title: string
  message: string
  message_type: string
  priority: number
  created_at: string
  comment_count: number
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user_name: string
  user_email: string
  is_admin: boolean
}

export function ClubMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
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

  const submitComment = async () => {
    if (!newComment.trim() || !selectedMessage) return

    setIsSubmittingComment(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("message_comments").insert({
        message_id: selectedMessage.id,
        user_id: user.id,
        comment: newComment.trim(),
      })

      if (error) throw error

      toast({
        title: "Succès",
        description: "Commentaire ajouté",
      })

      setNewComment("")
      loadComments(selectedMessage.id)
      loadMessages() // Reload to update comment count
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
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

  const getPriorityIcon = (priority: number) => {
    if (priority >= 3) return "🔴"
    if (priority >= 2) return "🟡"
    return "🟢"
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Messages du Club</CardTitle>
          <CardDescription>Annonces et informations importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun message disponible</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPriorityIcon(message.priority)}</span>
                      <h3 className="font-semibold">{message.title}</h3>
                    </div>
                    <Badge className={getMessageTypeColor(message.message_type)}>{message.message_type}</Badge>
                  </div>

                  <p className="text-sm">{message.message}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Publié le {new Date(message.created_at).toLocaleDateString()}</span>

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
                          {message.comment_count} commentaires
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{selectedMessage?.title}</DialogTitle>
                          <DialogDescription>Participez à la discussion</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Message content */}
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm">{selectedMessage?.message}</p>
                          </div>

                          {/* Comments */}
                          <div className="space-y-3">
                            {isLoadingComments ? (
                              <div className="text-center py-4">Chargement des commentaires...</div>
                            ) : comments.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                Aucun commentaire. Soyez le premier à commenter !
                              </div>
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
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm">{comment.comment}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add comment */}
                          <div className="space-y-2">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Ajoutez votre commentaire..."
                              rows={3}
                            />
                            <Button
                              onClick={submitComment}
                              disabled={isSubmittingComment || !newComment.trim()}
                              className="w-full"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {isSubmittingComment ? "Envoi..." : "Commenter"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
