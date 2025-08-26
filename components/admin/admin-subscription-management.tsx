"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Plus, Edit, Trash2, Search, Receipt } from "lucide-react"

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  created_at: string
}

interface Subscription {
  id: string
  user_id: string
  status: string
  start_date: string
  end_date: string
  plan_type: string
  payment_frequency: string
  amount: number
  created_at: string
  user?: User
}

export function AdminSubscriptionManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [formData, setFormData] = useState({
    plan_type: "annual",
    payment_frequency: "monthly",
    amount: 50,
    duration_months: 12,
    notes: "",
    start_date: "",
    end_date: "",
  })
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([])
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [generatingInvoices, setGeneratingInvoices] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load users
      const usersResponse = await fetch("/api/admin/users")
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Load subscriptions
      const subscriptionsResponse = await fetch("/api/admin/subscriptions")
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.subscriptions || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubscription = async () => {
    if (!selectedUser) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }

    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          ...formData,
        }),
      })

      if (response.ok) {
        toast.success("Abonnement créé avec succès")
        setIsCreateDialogOpen(false)
        setSelectedUser(null)
        setFormData({
          plan_type: "annual",
          payment_frequency: "monthly",
          amount: 50,
          duration_months: 12,
          notes: "",
          start_date: "",
          end_date: "",
        })
        loadData()
      } else {
        const error = await response.text()
        toast.error(`Erreur: ${error}`)
      }
    } catch (error) {
      console.error("Error creating subscription:", error)
      toast.error("Erreur lors de la création de l'abonnement")
    }
  }

  const handleEditSubscription = async () => {
    if (!editingSubscription) return

    try {
      const response = await fetch(`/api/admin/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Abonnement modifié avec succès")
        setIsEditDialogOpen(false)
        setEditingSubscription(null)
        loadData()
      } else {
        const error = await response.text()
        toast.error(`Erreur: ${error}`)
      }
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast.error("Erreur lors de la modification de l'abonnement")
    }
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet abonnement ?")) return

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Abonnement supprimé avec succès")
        loadData()
      } else {
        const error = await response.text()
        toast.error(`Erreur: ${error}`)
      }
    } catch (error) {
      console.error("Error deleting subscription:", error)
      toast.error("Erreur lors de la suppression de l'abonnement")
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSubscriptions.length === 0) {
      toast.error("Veuillez sélectionner au moins un abonnement")
      return
    }

    try {
      const deletePromises = selectedSubscriptions.map((id) =>
        fetch(`/api/admin/subscriptions/${id}`, { method: "DELETE" }),
      )

      await Promise.all(deletePromises)

      toast.success(`${selectedSubscriptions.length} abonnement(s) supprimé(s) avec succès`)
      setSelectedSubscriptions([])
      setIsBulkDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error bulk deleting subscriptions:", error)
      toast.error("Erreur lors de la suppression en masse")
    }
  }

  const handleToggleAll = () => {
    if (selectedSubscriptions.length === filteredSubscriptions.length) {
      setSelectedSubscriptions([])
    } else {
      setSelectedSubscriptions(filteredSubscriptions.map((sub) => sub.id))
    }
  }

  const handleToggleSubscription = (subscriptionId: string) => {
    setSelectedSubscriptions((prev) =>
      prev.includes(subscriptionId) ? prev.filter((id) => id !== subscriptionId) : [...prev, subscriptionId],
    )
  }

  const handleGenerateInvoices = async (subscriptionId: string) => {
    try {
      setGeneratingInvoices(subscriptionId)
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/generate-invoices`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`${result.count} facture(s) générée(s) avec succès`)
      } else {
        const error = await response.text()
        toast.error(`Erreur: ${error}`)
      }
    } catch (error) {
      console.error("Error generating invoices:", error)
      toast.error("Erreur lors de la génération des factures")
    } finally {
      setGeneratingInvoices(null)
    }
  }

  const openEditDialog = (subscription: Subscription) => {
    setEditingSubscription(subscription)
    setFormData({
      plan_type: subscription.plan_type || "annual",
      payment_frequency: subscription.payment_frequency || "monthly",
      amount: subscription.amount || 50,
      duration_months: 12,
      notes: "",
      start_date: subscription.start_date ? subscription.start_date.split("T")[0] : "",
      end_date: subscription.end_date ? subscription.end_date.split("T")[0] : "",
    })
    setIsEditDialogOpen(true)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${sub.user?.first_name} ${sub.user?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Abonnements</CardTitle>
          <CardDescription>Créer, modifier et supprimer les abonnements des utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
              {selectedSubscriptions.length > 0 && (
                <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer ({selectedSubscriptions.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer la suppression</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer {selectedSubscriptions.length} abonnement(s) ? Cette action
                        est irréversible.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button variant="destructive" onClick={handleBulkDelete}>
                        Supprimer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel Abonnement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Créer un Abonnement</DialogTitle>
                    <DialogDescription>Ajouter un nouvel abonnement pour un utilisateur</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Utilisateur</Label>
                      <Select
                        onValueChange={(value) => {
                          const user = users.find((u) => u.id === value)
                          setSelectedUser(user || null)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name} (${user.email})`
                                : user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type d'abonnement</Label>
                      <Select
                        value={formData.plan_type}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, plan_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                          <SelectItem value="annual">Annuel</SelectItem>
                          <SelectItem value="lifetime">Vie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fréquence de paiement</Label>
                      <Select
                        value={formData.payment_frequency}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                          <SelectItem value="yearly">Annuel</SelectItem>
                          <SelectItem value="one_time">Paiement unique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Montant (€)</Label>
                      <Input
                        type="number"
                        value={formData.amount || 0}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Durée (mois)</Label>
                      <Input
                        type="number"
                        value={formData.duration_months || 12}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, duration_months: Number(e.target.value) || 12 }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Date de début (optionnel)</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Laissez vide pour utiliser la date actuelle</p>
                    </div>
                    <div>
                      <Label>Date de fin (optionnel)</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Laissez vide pour calculer automatiquement selon la durée
                      </p>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes optionnelles..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleCreateSubscription}>Créer l'Abonnement</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {filteredSubscriptions.length > 0 && (
            <div className="flex items-center space-x-2 mb-4 p-2 bg-muted/50 rounded">
              <Checkbox
                checked={selectedSubscriptions.length === filteredSubscriptions.length}
                onCheckedChange={handleToggleAll}
              />
              <Label className="text-sm">
                Sélectionner tout ({selectedSubscriptions.length}/{filteredSubscriptions.length})
              </Label>
            </div>
          )}

          <div className="space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun abonnement trouvé</p>
            ) : (
              filteredSubscriptions.map((subscription) => (
                <Card
                  key={subscription.id}
                  className={selectedSubscriptions.includes(subscription.id) ? "ring-2 ring-primary" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedSubscriptions.includes(subscription.id)}
                          onCheckedChange={() => handleToggleSubscription(subscription.id)}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">
                              {subscription.user?.first_name && subscription.user?.last_name
                                ? `${subscription.user.first_name} ${subscription.user.last_name}`
                                : subscription.user?.email}
                            </h3>
                            <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                              {subscription.status === "active" ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{subscription.user?.email}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Type: {subscription.plan_type}</span>
                            <span>Paiement: {subscription.payment_frequency}</span>
                            <span>Montant: {subscription.amount}€</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Début: {new Date(subscription.start_date).toLocaleDateString()}</span>
                            <span>Fin: {new Date(subscription.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateInvoices(subscription.id)}
                          disabled={generatingInvoices === subscription.id}
                        >
                          {generatingInvoices === subscription.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(subscription)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteSubscription(subscription.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Abonnement</DialogTitle>
            <DialogDescription>Modifier les détails de l'abonnement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d'abonnement</Label>
              <Select
                value={formData.plan_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, plan_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="annual">Annuel</SelectItem>
                  <SelectItem value="lifetime">Vie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fréquence de paiement</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                  <SelectItem value="one_time">Paiement unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (€)</Label>
              <Input
                type="number"
                value={formData.amount || 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Durée (mois)</Label>
              <Input
                type="number"
                value={formData.duration_months || 12}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration_months: Number(e.target.value) || 12 }))}
              />
            </div>
            <div>
              <Label>Date de début</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSubscription}>Modifier l'Abonnement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
