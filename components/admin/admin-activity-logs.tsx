"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  MessageSquare,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  GraduationCap,
} from "lucide-react"

interface ActivityLog {
  id: string
  user_id: string
  user_role: string
  action_type: string
  resource_type: string
  resource_id?: string
  description: string
  metadata?: any
  ip_address?: string
  user_agent?: string
  created_at: string
  profiles: {
    first_name: string
    last_name: string
    email: string
    profile_image_url?: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function AdminActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [filters, setFilters] = useState({
    user_role: "all",
    action_type: "all",
    resource_type: "all",
    date_from: "",
    date_to: "",
    search: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadLogs()
  }, [pagination.page, filters])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== "all")),
      })

      const response = await fetch(`/api/admin/activity-logs?${params}`)
      if (!response.ok) throw new Error("Failed to fetch logs")

      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error loading logs:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'activité",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "create":
        return <UserPlus className="h-4 w-4" />
      case "update":
        return <Edit className="h-4 w-4" />
      case "delete":
        return <Trash2 className="h-4 w-4" />
      case "assign":
        return <GraduationCap className="h-4 w-4" />
      case "promote":
        return <Shield className="h-4 w-4" />
      case "message":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "create":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      case "delete":
        return "bg-red-100 text-red-800"
      case "assign":
        return "bg-purple-100 text-purple-800"
      case "promote":
        return "bg-yellow-100 text-yellow-800"
      case "message":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs d'Activité ({pagination.total} entrées)
          </CardTitle>
          <CardDescription>Suivi complet de toutes les actions des administrateurs et instructeurs</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les logs..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.user_role} onValueChange={(value) => handleFilterChange("user_role", value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="instructor">Instructeur</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.action_type} onValueChange={(value) => handleFilterChange("action_type", value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="create">Création</SelectItem>
                <SelectItem value="update">Modification</SelectItem>
                <SelectItem value="delete">Suppression</SelectItem>
                <SelectItem value="assign">Attribution</SelectItem>
                <SelectItem value="promote">Promotion</SelectItem>
                <SelectItem value="message">Message</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.resource_type} onValueChange={(value) => handleFilterChange("resource_type", value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les ressources</SelectItem>
                <SelectItem value="user_role">Rôle utilisateur</SelectItem>
                <SelectItem value="instructor_class">Cours instructeur</SelectItem>
                <SelectItem value="class_session">Session de cours</SelectItem>
                <SelectItem value="attendance">Présence</SelectItem>
                <SelectItem value="message">Message</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Ressource</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement des logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun log trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.profiles?.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {log.profiles?.first_name?.[0] || "?"}
                              {log.profiles?.last_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {log.profiles?.first_name || "Utilisateur"} {log.profiles?.last_name || "Inconnu"}
                            </div>
                            <Badge className={getRoleColor(log.user_role)} variant="outline">
                              {log.user_role}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action_type)}>
                          {getActionIcon(log.action_type)}
                          <span className="ml-1">{log.action_type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.resource_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={log.description}>
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Détails du Log d'Activité</DialogTitle>
                              <DialogDescription>Informations complètes sur cette action</DialogDescription>
                            </DialogHeader>

                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Utilisateur</Label>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={selectedLog.profiles?.profile_image_url || "/placeholder.svg"}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {selectedLog.profiles?.first_name?.[0] || "?"}
                                          {selectedLog.profiles?.last_name?.[0] || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">
                                        {selectedLog.profiles?.first_name || "Utilisateur"}{" "}
                                        {selectedLog.profiles?.last_name || "Inconnu"}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Rôle</Label>
                                    <div className="mt-1">
                                      <Badge className={getRoleColor(selectedLog.user_role)}>
                                        {selectedLog.user_role}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Action</Label>
                                    <div className="mt-1">
                                      <Badge className={getActionColor(selectedLog.action_type)}>
                                        {getActionIcon(selectedLog.action_type)}
                                        <span className="ml-1">{selectedLog.action_type}</span>
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Ressource</Label>
                                    <div className="mt-1">
                                      <Badge variant="outline">{selectedLog.resource_type}</Badge>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Description</Label>
                                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedLog.description}</p>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Date et Heure</Label>
                                  <p className="text-sm mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(selectedLog.created_at)}
                                  </p>
                                </div>

                                {selectedLog.metadata && (
                                  <div>
                                    <Label className="text-sm font-medium">Métadonnées</Label>
                                    <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                                      {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.ip_address && (
                                  <div>
                                    <Label className="text-sm font-medium">Adresse IP</Label>
                                    <p className="text-sm mt-1">{selectedLog.ip_address}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} entrées)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
