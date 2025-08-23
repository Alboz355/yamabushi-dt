"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Users, CreditCard, Ban, CheckCircle, XCircle, Calendar, Mail, Phone, RefreshCw } from "lucide-react"

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
  subscription_status: string
  subscription_plan: string
  subscription_expires_at: string | null
  monthly_payment_status: string
  total_invoices: number
  unpaid_invoices: number
}

interface Invoice {
  id: string
  amount: number
  status: string
  due_date: string
  created_at: string
  month: number
  year: number
  payment_method: string | null
  notes: string | null
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userInvoices, setUserInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [totalInvoices, setTotalInvoices] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()

      console.log(`[v0] Users loaded from API: ${data.users.length} users with ${data.total_invoices} total invoices`)
      setUsers(data.users)
      setTotalInvoices(data.total_invoices)
    } catch (error) {
      console.error("Error loading users:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserInvoices = async (userId: string) => {
    setIsLoadingInvoices(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/invoices`)

      if (!response.ok) {
        throw new Error("Failed to fetch user invoices")
      }

      const data = await response.json()

      console.log("[v0] User invoices loaded:", data.count, "invoices for user", userId)
      setUserInvoices(data.invoices || [])
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive",
      })
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  const cancelInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel invoice")
      }

      toast({
        title: "Succès",
        description: "Facture annulée avec succès",
      })

      if (selectedUser) {
        loadUserInvoices(selectedUser.id)
      }
      loadUsers()
    } catch (error) {
      console.error("Error cancelling invoice:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la facture",
        variant: "destructive",
      })
    }
  }

  const refundInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "refund" }),
      })

      if (!response.ok) {
        throw new Error("Failed to refund invoice")
      }

      toast({
        title: "Succès",
        description: "Facture remboursée avec succès",
      })

      if (selectedUser) {
        loadUserInvoices(selectedUser.id)
      }
      loadUsers()
    } catch (error) {
      console.error("Error refunding invoice:", error)
      toast({
        title: "Erreur",
        description: "Impossible de rembourser la facture",
        variant: "destructive",
      })
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour",
      })

      loadUsers()
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    const matchesSubscription =
      subscriptionFilter === "all" ||
      (subscriptionFilter === "active" && user.subscription_status === "active") ||
      (subscriptionFilter === "inactive" && user.subscription_status !== "active") ||
      (subscriptionFilter === "unpaid" && user.unpaid_invoices > 0)

    return matchesSearch && matchesRole && matchesSubscription
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "instructor":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      case "refunded":
        return "bg-purple-100 text-purple-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getMonthlyPaymentBadge = (user: User) => {
    if (user.monthly_payment_status === "paid") {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Mois payé
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Mois impayé
        </Badge>
      )
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des utilisateurs ({users.length} utilisateurs, {totalInvoices} factures)
          </CardTitle>
          <CardDescription>Gérez les membres, leurs abonnements et factures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-64"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="instructor">Instructeur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les abonnements</SelectItem>
                <SelectItem value="active">Abonnement actif</SelectItem>
                <SelectItem value="inactive">Sans abonnement</SelectItem>
                <SelectItem value="unpaid">Factures impayées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
            ) : (
              filteredUsers.map((user, index) => (
                <div key={`${user.id}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                        </h3>
                        <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                        <Badge className={getStatusColor(user.subscription_status)}>{user.subscription_status}</Badge>
                        {user.subscription_status === "active" ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Abonné ({user.subscription_plan})
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Sans abonnement
                          </Badge>
                        )}
                        {getMonthlyPaymentBadge(user)}
                        {user.unpaid_invoices > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {user.unpaid_invoices} facture(s) impayée(s)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Inscrit le {new Date(user.created_at).toLocaleDateString()}
                        </span>
                        {user.subscription_expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expire le {new Date(user.subscription_expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {user.last_sign_in_at && (
                          <span>Dernière connexion: {new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{user.total_invoices} facture(s) au total</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user)
                              loadUserInvoices(user.id)
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Factures
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Factures - {selectedUser?.first_name} {selectedUser?.last_name || selectedUser?.email}
                            </DialogTitle>
                            <DialogDescription>Gérez les factures et abonnements de cet utilisateur</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {isLoadingInvoices ? (
                              <div className="text-center py-4">Chargement des factures...</div>
                            ) : userInvoices.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">Aucune facture trouvée</div>
                            ) : (
                              <div className="space-y-3">
                                {userInvoices.map((invoice) => (
                                  <div key={invoice.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {invoice.month}/{invoice.year} - {invoice.amount}€
                                        </span>
                                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                                          {invoice.status}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                          Échéance: {new Date(invoice.created_at).toLocaleDateString()}
                                        </span>
                                        {invoice.status === "paid" && (
                                          <Button size="sm" variant="outline" onClick={() => refundInvoice(invoice.id)}>
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Rembourser
                                          </Button>
                                        )}
                                        {invoice.status !== "cancelled" &&
                                          invoice.status !== "paid" &&
                                          invoice.status !== "refunded" && (
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => cancelInvoice(invoice.id)}
                                            >
                                              <Ban className="w-3 h-3 mr-1" />
                                              Annuler
                                            </Button>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Select value={user.role} onValueChange={(value) => updateUserRole(user.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="instructor">Instructeur</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
