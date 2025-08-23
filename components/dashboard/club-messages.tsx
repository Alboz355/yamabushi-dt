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
import { MessageCircle, Send, MessageSquare, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react"

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

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case "urgent":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "announcement":
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages du club
          </CardTitle>
          <CardDescription>Annonces et informations importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-primary flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages du club
          </CardTitle>
          <CardDescription>Annonces et informations importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun message pour le moment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-primary flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Messages du club
        </CardTitle>
        <CardDescription>Annonces et informations importantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                {getMessageIcon(message.message_type)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getPriorityIcon(message.priority)}</span>
                      <h4 className="font-medium text-sm">{message.title}</h4>
                    </div>
                    <Badge className={getMessageTypeColor(message.message_type) + " text-xs"}>
                      {message.message_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.message}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString("fr-FR")}
                    </p>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setSelectedMessage(message)
                            loadComments(message.id)
                          }}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          {message.comment_count || 0}
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
                                      {new Date(comment.created_at).toLocaleDateString("fr-FR")}
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
