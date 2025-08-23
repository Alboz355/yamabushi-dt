"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminHeader } from "./admin-header"
import { AdminMessages } from "./admin-messages"
import { AdminUserManagement } from "./admin-user-management"
import { AdminStats } from "./admin-stats"
import { AdminAnalytics } from "./admin-analytics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { User } from "@supabase/supabase-js"
import { useState } from "react"
import { AutomatedReports } from "./automated-reports"
import { InstructorManagement } from "./instructor-management"

interface AdminDashboardProps {
  user: User
  stats: {
    totalUsers: number
    totalAttendance: number
    activeSubscriptions: number
    recentUsers: any[]
  }
}

export function AdminDashboard({ user, stats }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const handleCreateMessage = () => {
    setActiveTab("messages")
  }

  const handleViewUsers = () => {
    setActiveTab("users")
  }

  const handleExportStats = () => {
    const csvContent = `Statistique,Valeur
Utilisateurs totaux,${stats.totalUsers}
Présences totales,${stats.totalAttendance}
Abonnements actifs,${stats.activeSubscriptions}
Date d'export,${new Date().toLocaleDateString()}`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `yamabushi-stats-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleManageSubscriptions = () => {
    setActiveTab("users")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={user} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administration Yamabushi</h1>
          <p className="text-muted-foreground">Gérez votre académie d'arts martiaux</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="instructors">Instructeurs</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="courses">Cours</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminStats stats={stats} />

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs récents</CardTitle>
                  <CardDescription>Les 5 derniers membres inscrits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="secondary">{new Date(user.created_at).toLocaleDateString()}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                  <CardDescription>Raccourcis vers les tâches courantes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start bg-transparent"
                    variant="outline"
                    onClick={handleCreateMessage}
                  >
                    📝 Créer un message du club
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline" onClick={handleViewUsers}>
                    👥 Voir tous les utilisateurs
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline" onClick={handleExportStats}>
                    📊 Exporter les statistiques
                  </Button>
                  <Button
                    className="w-full justify-start bg-transparent"
                    variant="outline"
                    onClick={handleManageSubscriptions}
                  >
                    💰 Gérer les abonnements
                  </Button>
                  <Button
                    className="w-full justify-start bg-transparent"
                    variant="outline"
                    onClick={() => setActiveTab("analytics")}
                  >
                    📈 Voir les analyses détaillées
                  </Button>
                  <Button
                    className="w-full justify-start bg-transparent"
                    variant="outline"
                    onClick={() => setActiveTab("reports")}
                  >
                    📋 Voir les rapports automatisés
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics initialStats={stats} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="instructors">
            <InstructorManagement />
          </TabsContent>

          <TabsContent value="messages">
            <AdminMessages />
          </TabsContent>

          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des cours</CardTitle>
                <CardDescription>Créer et gérer les cours et horaires</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fonctionnalité en développement...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <AutomatedReports />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
