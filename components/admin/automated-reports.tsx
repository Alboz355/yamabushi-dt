"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { FileText, Mail, Calendar, Download, Plus, Settings, Trash2, Power } from "lucide-react"
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import jsPDF from "jspdf"

const drawTable = (doc: jsPDF, startY: number, headers: string[], data: string[][], title?: string) => {
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  const tableWidth = pageWidth - 2 * margin
  const colWidth = tableWidth / headers.length
  const rowHeight = 8
  let currentY = startY

  // Draw title if provided
  if (title) {
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(title, margin, currentY)
    currentY += 15
  }

  // Draw header
  doc.setFillColor(220, 53, 69) // Red background for headers
  doc.setTextColor(255, 255, 255) // White text
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")

  doc.rect(margin, currentY, tableWidth, rowHeight, "F")
  headers.forEach((header, index) => {
    doc.text(header, margin + index * colWidth + 2, currentY + 5)
  })
  currentY += rowHeight

  // Draw data rows
  doc.setTextColor(0, 0, 0) // Black text
  doc.setFont("helvetica", "normal")

  data.forEach((row, rowIndex) => {
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 249, 250) // Light gray
      doc.rect(margin, currentY, tableWidth, rowHeight, "F")
    }

    row.forEach((cell, colIndex) => {
      doc.text(cell, margin + colIndex * colWidth + 2, currentY + 5)
    })
    currentY += rowHeight
  })

  // Draw table border
  doc.setDrawColor(0, 0, 0)
  doc.rect(
    margin,
    startY + (title ? 15 : 0),
    tableWidth,
    (headers.length > 0 ? rowHeight : 0) + data.length * rowHeight,
  )

  return currentY + 10 // Return next Y position with some spacing
}

interface ReportSchedule {
  id: string
  name: string
  report_type: string
  frequency: string
  recipients: string[]
  is_active: boolean
  last_sent_at: string | null
  next_send_at: string
  config: {
    include_member_stats: boolean
    include_attendance: boolean
    include_revenue: boolean
    include_discipline_stats: boolean
    include_charts: boolean
    custom_sections: string[]
  }
}

interface ReportHistory {
  id: string
  report_period_start: string
  report_period_end: string
  sent_to: string[]
  status: string
  created_at: string
}

export function AutomatedReports() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [history, setHistory] = useState<ReportHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null)
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    report_type: "weekly",
    frequency: "weekly",
    recipients: [""],
    is_active: true,
    config: {
      include_member_stats: true,
      include_attendance: true,
      include_revenue: true,
      include_discipline_stats: true,
      include_charts: true,
      custom_sections: [],
    },
  })
  const supabase = createClient()

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    try {
      const { data: schedulesData } = await supabase
        .from("report_schedules")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: historyData } = await supabase
        .from("report_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      setSchedules(schedulesData || [])
      setHistory(historyData || [])
    } catch (error) {
      console.error("Error loading report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generatePDFReport = async (reportType: string, startDate: Date, endDate: Date, config: any) => {
    const reportConfig = config || {
      include_member_stats: true,
      include_attendance: true,
      include_revenue: true,
      include_discipline_stats: true,
      include_charts: true,
      custom_sections: [],
    }

    const doc = new jsPDF()

    console.log("[v0] Generating PDF with native table drawing")

    // Header
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("Yamabushi Academy", 20, 20)

    doc.setFontSize(16)
    doc.text(`Rapport ${reportType === "weekly" ? "Hebdomadaire" : "Mensuel"}`, 20, 35)

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Période: ${format(startDate, "dd/MM/yyyy", { locale: fr })} - ${format(endDate, "dd/MM/yyyy", { locale: fr })}`,
      20,
      45,
    )
    doc.text(`Généré le: ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, 20, 55)

    let currentY = 75

    if (reportConfig.include_member_stats) {
      try {
        const response = await fetch("/api/admin/users")
        const adminData = await response.json()

        const allUsers = adminData.users || []
        const totalInvoices = adminData.total_invoices || 0

        // Filter new members in the period
        const newMembers = allUsers.filter((user) => {
          const createdAt = new Date(user.created_at)
          return createdAt >= startDate && createdAt <= endDate
        })

        // Count active members
        const activeMembers = allUsers.filter((user) => user.subscription_status === "active")

        // Calculate retention rate based on real data
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const oldMembers = allUsers.filter((user) => new Date(user.created_at) <= threeMonthsAgo)
        const activeOldMembers = oldMembers.filter((user) => user.subscription_status === "active")
        const retentionRate =
          oldMembers.length > 0 ? Math.round((activeOldMembers.length / oldMembers.length) * 100) : 0

        const memberData = [
          ["Nouveaux membres", newMembers.length.toString()],
          ["Membres actifs", activeMembers.length.toString()],
          ["Total membres", allUsers.length.toString()],
          ["Taux de rétention", `${retentionRate}%`],
          ["Total factures", totalInvoices.toString()],
        ]

        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], memberData, "Statistiques des Membres")
      } catch (error) {
        console.error("[v0] Error fetching admin user data:", error)
        // Fallback to basic data
        const memberData = [["Erreur", "Impossible de charger les données"]]
        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], memberData, "Statistiques des Membres")
      }
    }

    if (reportConfig.include_attendance) {
      try {
        const { data: attendance } = await supabase
          .from("course_attendance")
          .select("course_date, course_name, user_id")
          .gte("course_date", format(startDate, "yyyy-MM-dd"))
          .lte("course_date", format(endDate, "yyyy-MM-dd"))

        const { data: bookings } = await supabase
          .from("unified_bookings")
          .select("course_date, attendance_confirmed")
          .gte("course_date", format(startDate, "yyyy-MM-dd"))
          .lte("course_date", format(endDate, "yyyy-MM-dd"))

        const totalBookings = bookings?.length || 0
        const confirmedAttendance = bookings?.filter((b) => b.attendance_confirmed).length || 0
        const attendanceRate = totalBookings > 0 ? Math.round((confirmedAttendance / totalBookings) * 100) : 0

        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const avgPerDay = daysDiff > 0 ? Math.round((attendance?.length || 0) / daysDiff) : 0

        const attendanceData = [
          ["Total participations", (attendance?.length || 0).toString()],
          ["Réservations totales", totalBookings.toString()],
          ["Moyenne par jour", avgPerDay.toString()],
          ["Taux de présence", `${attendanceRate}%`],
        ]

        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], attendanceData, "Participation aux Cours")
      } catch (error) {
        console.error("[v0] Error fetching attendance data:", error)
        const attendanceData = [["Erreur", "Impossible de charger les données"]]
        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], attendanceData, "Participation aux Cours")
      }
    }

    if (reportConfig.include_revenue) {
      try {
        const response = await fetch("/api/admin/users")
        const adminData = await response.json()

        const allUsers = adminData.users || []

        // Calculate real revenue based on user data
        const activeSubscriptions = allUsers.filter((user) => user.subscription_status === "active")
        const paidThisMonth = allUsers.filter((user) => user.monthly_payment_status === "paid")
        const unpaidInvoices = allUsers.reduce((sum, user) => sum + (user.unpaid_invoices || 0), 0)

        // Estimate monthly revenue (assuming average subscription price of 89€)
        const monthlyRevenue = paidThisMonth.length * 89
        const activeSubsRevenue = activeSubscriptions.length * 89
        const yearlyProjection = activeSubsRevenue * 12

        const revenueData = [
          ["Abonnements actifs", activeSubscriptions.length.toString()],
          ["Paiements ce mois", paidThisMonth.length.toString()],
          ["Revenus mensuels", `€${monthlyRevenue.toLocaleString()}`],
          ["Projection annuelle", `€${yearlyProjection.toLocaleString()}`],
          ["Factures impayées", unpaidInvoices.toString()],
        ]

        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], revenueData, "Revenus")
      } catch (error) {
        console.error("[v0] Error fetching revenue data:", error)
        const revenueData = [["Erreur", "Impossible de charger les données"]]
        currentY = drawTable(doc, currentY, ["Métrique", "Valeur"], revenueData, "Revenus")
      }
    }

    if (reportConfig.include_discipline_stats) {
      try {
        const { data: attendance } = await supabase
          .from("course_attendance")
          .select("course_name")
          .gte("course_date", format(startDate, "yyyy-MM-dd"))
          .lte("course_date", format(endDate, "yyyy-MM-dd"))

        const { data: bookings } = await supabase
          .from("unified_bookings")
          .select("course_name")
          .gte("course_date", format(startDate, "yyyy-MM-dd"))
          .lte("course_date", format(endDate, "yyyy-MM-dd"))

        const allCourses = [
          ...(attendance?.map((a) => a.course_name) || []),
          ...(bookings?.map((b) => b.course_name) || []),
        ]

        const disciplineStats: Record<string, number> = {}
        allCourses.forEach((courseName) => {
          if (courseName) {
            disciplineStats[courseName] = (disciplineStats[courseName] || 0) + 1
          }
        })

        const disciplineData = Object.entries(disciplineStats)
          .map(([name, count]) => [name, count.toString()])
          .sort((a, b) => Number.parseInt(b[1]) - Number.parseInt(a[1]))
          .slice(0, 5)

        if (disciplineData.length > 0) {
          currentY = drawTable(doc, currentY, ["Discipline", "Participations"], disciplineData, "Top 5 Disciplines")
        }
      } catch (error) {
        console.error("[v0] Error fetching discipline data:", error)
      }
    }

    return doc
  }

  const sendReport = async (scheduleId: string, reportType: string) => {
    try {
      console.log("[v0] Starting report generation...")

      const schedule = schedules.find((s) => s.id === scheduleId)
      if (!schedule) {
        console.error("[v0] Schedule not found")
        return
      }

      const scheduleConfig = schedule.config || {
        include_member_stats: true,
        include_attendance: true,
        include_revenue: true,
        include_discipline_stats: true,
        include_charts: true,
        custom_sections: [],
      }

      const startDate =
        reportType === "weekly"
          ? startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
          : startOfMonth(subMonths(new Date(), 1))

      const endDate =
        reportType === "weekly"
          ? endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
          : endOfMonth(subMonths(new Date(), 1))

      console.log("[v0] Generating PDF with config:", scheduleConfig)
      const pdf = await generatePDFReport(reportType, startDate, endDate, scheduleConfig)
      const pdfBlob = pdf.output("blob")

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `yamabushi-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      link.click()

      console.log("[v0] PDF generated and downloaded successfully")

      await supabase.from("report_history").insert({
        schedule_id: scheduleId,
        report_period_start: format(startDate, "yyyy-MM-dd"),
        report_period_end: format(endDate, "yyyy-MM-dd"),
        sent_to: schedule.recipients,
        status: "sent",
      })

      await supabase
        .from("report_schedules")
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at:
            reportType === "weekly"
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", scheduleId)

      loadReportData()
    } catch (error) {
      console.error("[v0] Error sending report:", error)
    }
  }

  const openConfiguration = (schedule: ReportSchedule) => {
    const scheduleWithConfig = {
      ...schedule,
      config: schedule.config || {
        include_member_stats: true,
        include_attendance: true,
        include_revenue: true,
        include_discipline_stats: true,
        include_charts: true,
        custom_sections: [],
      },
    }
    setSelectedSchedule(scheduleWithConfig)
    setIsConfiguring(true)
  }

  const saveConfiguration = async () => {
    if (!selectedSchedule) return

    try {
      await supabase.from("report_schedules").update({ config: selectedSchedule.config }).eq("id", selectedSchedule.id)

      setIsConfiguring(false)
      setSelectedSchedule(null)
      loadReportData()
    } catch (error) {
      console.error("Error saving configuration:", error)
    }
  }

  const createSchedule = async () => {
    try {
      const { error } = await supabase.from("report_schedules").insert({
        ...newSchedule,
        recipients: newSchedule.recipients.filter((email) => email.trim() !== ""),
        next_send_at:
          newSchedule.frequency === "weekly"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      if (!error) {
        setIsCreating(false)
        setNewSchedule({
          name: "",
          report_type: "weekly",
          frequency: "weekly",
          recipients: [""],
          is_active: true,
          config: {
            include_member_stats: true,
            include_attendance: true,
            include_revenue: true,
            include_discipline_stats: true,
            include_charts: true,
            custom_sections: [],
          },
        })
        loadReportData()
      }
    } catch (error) {
      console.error("Error creating schedule:", error)
    }
  }

  const toggleSchedule = async (id: string, isActive: boolean) => {
    await supabase.from("report_schedules").update({ is_active: !isActive }).eq("id", id)

    loadReportData()
  }

  const deleteSchedule = async (id: string) => {
    await supabase.from("report_schedules").delete().eq("id", id)
    loadReportData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rapports Automatisés</h2>
          <p className="text-muted-foreground">Génération et envoi automatique de rapports PDF personnalisés</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Rapport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un Rapport Automatisé</DialogTitle>
              <DialogDescription>
                Configurez un nouveau rapport personnalisé qui sera généré et envoyé automatiquement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label htmlFor="name">Nom du rapport</Label>
                <Input
                  id="name"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="Rapport hebdomadaire des performances"
                />
              </div>

              <div>
                <Label htmlFor="type">Type de rapport</Label>
                <Select
                  value={newSchedule.report_type}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contenu du rapport</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.config.include_member_stats}
                      onCheckedChange={(checked) =>
                        setNewSchedule({
                          ...newSchedule,
                          config: { ...newSchedule.config, include_member_stats: !!checked },
                        })
                      }
                    />
                    <Label className="text-sm">Statistiques des membres</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.config.include_attendance}
                      onCheckedChange={(checked) =>
                        setNewSchedule({
                          ...newSchedule,
                          config: { ...newSchedule.config, include_attendance: !!checked },
                        })
                      }
                    />
                    <Label className="text-sm">Participation aux cours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.config.include_revenue}
                      onCheckedChange={(checked) =>
                        setNewSchedule({
                          ...newSchedule,
                          config: { ...newSchedule.config, include_revenue: !!checked },
                        })
                      }
                    />
                    <Label className="text-sm">Revenus et abonnements</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.config.include_discipline_stats}
                      onCheckedChange={(checked) =>
                        setNewSchedule({
                          ...newSchedule,
                          config: { ...newSchedule.config, include_discipline_stats: !!checked },
                        })
                      }
                    />
                    <Label className="text-sm">Disciplines populaires</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.config.include_charts}
                      onCheckedChange={(checked) =>
                        setNewSchedule({
                          ...newSchedule,
                          config: { ...newSchedule.config, include_charts: !!checked },
                        })
                      }
                    />
                    <Label className="text-sm">Graphiques et visuels</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="recipients">Destinataires (emails)</Label>
                {newSchedule.recipients.map((email, index) => (
                  <Input
                    key={index}
                    value={email}
                    onChange={(e) => {
                      const newRecipients = [...newSchedule.recipients]
                      newRecipients[index] = e.target.value
                      setNewSchedule({ ...newSchedule, recipients: newRecipients })
                    }}
                    placeholder="admin@yamabushi.com"
                    className="mt-2"
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-transparent"
                  onClick={() => setNewSchedule({ ...newSchedule, recipients: [...newSchedule.recipients, ""] })}
                >
                  Ajouter un destinataire
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSchedule.is_active}
                  onCheckedChange={(checked) => setNewSchedule({ ...newSchedule, is_active: checked })}
                />
                <Label>Activer immédiatement</Label>
              </div>

              <Button onClick={createSchedule} className="w-full">
                Créer le Rapport
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration du Rapport</DialogTitle>
            <DialogDescription>Personnalisez le contenu et l'apparence de votre rapport</DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Sections à inclure</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSchedule.config?.include_member_stats || false}
                      onCheckedChange={(checked) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          config: {
                            ...selectedSchedule.config,
                            include_member_stats: !!checked,
                          },
                        })
                      }
                    />
                    <Label className="text-sm">Statistiques des membres</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSchedule.config?.include_attendance || false}
                      onCheckedChange={(checked) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          config: {
                            ...selectedSchedule.config,
                            include_attendance: !!checked,
                          },
                        })
                      }
                    />
                    <Label className="text-sm">Participation aux cours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSchedule.config?.include_revenue || false}
                      onCheckedChange={(checked) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          config: {
                            ...selectedSchedule.config,
                            include_revenue: !!checked,
                          },
                        })
                      }
                    />
                    <Label className="text-sm">Revenus et abonnements</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSchedule.config?.include_discipline_stats || false}
                      onCheckedChange={(checked) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          config: {
                            ...selectedSchedule.config,
                            include_discipline_stats: !!checked,
                          },
                        })
                      }
                    />
                    <Label className="text-sm">Disciplines populaires</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSchedule.config?.include_charts || false}
                      onCheckedChange={(checked) =>
                        setSelectedSchedule({
                          ...selectedSchedule,
                          config: {
                            ...selectedSchedule.config,
                            include_charts: !!checked,
                          },
                        })
                      }
                    />
                    <Label className="text-sm">Graphiques et visuels</Label>
                  </div>
                </div>
              </div>

              <Button onClick={saveConfiguration} className="w-full">
                Sauvegarder la Configuration
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Planifications</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid gap-4">
            {schedules.map((schedule) => {
              const scheduleConfig = schedule.config || {
                include_member_stats: true,
                include_attendance: true,
                include_revenue: true,
                include_discipline_stats: true,
                include_charts: true,
                custom_sections: [],
              }

              return (
                <Card key={schedule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {schedule.name}
                          <Badge variant={schedule.is_active ? "default" : "secondary"}>
                            {schedule.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Rapport {schedule.report_type === "weekly" ? "hebdomadaire" : "mensuel"} •
                          {schedule.recipients.length} destinataire(s)
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendReport(schedule.id, schedule.report_type)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Générer
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openConfiguration(schedule)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSchedule(schedule.id, schedule.is_active)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteSchedule(schedule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Destinataires: {schedule.recipients.join(", ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Prochain envoi:{" "}
                          {format(new Date(schedule.next_send_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {schedule.last_sent_at && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Dernier envoi:{" "}
                            {format(new Date(schedule.last_sent_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Rapports</CardTitle>
              <CardDescription>Les 20 derniers rapports générés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        Rapport du {format(new Date(report.report_period_start), "dd/MM/yyyy", { locale: fr })} au{" "}
                        {format(new Date(report.report_period_end), "dd/MM/yyyy", { locale: fr })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Envoyé à {report.sent_to.length} destinataire(s) •
                        {format(new Date(report.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        report.status === "sent" ? "default" : report.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {report.status === "sent" ? "Envoyé" : report.status === "failed" ? "Échec" : "En attente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
