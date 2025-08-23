"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Receipt, CreditCard, Calendar, AlertCircle, Smartphone, Building2, Banknote } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BottomNav } from "@/components/mobile/bottom-nav"
import { InvoicePdfButton } from "@/components/billing/invoice-pdf-button"

interface Invoice {
  id: string
  amount: number
  due_date: string
  paid_at: string | null
  status: "pending" | "paid" | "overdue" | "cancelled"
  month: number
  year: number
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [autoPayment, setAutoPayment] = useState(false)
  const [iban, setIban] = useState("")
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUserAndInvoices()
  }, [])

  const fetchUserAndInvoices = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) return

      setUser(currentUser)

      // Get user profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()
      setProfile(profileData)

      // Get invoices
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("member_id", currentUser.id)
        .order("due_date", { ascending: true })

      if (error) throw error

      console.log("[v0] Fetched invoices:", data)

      const sortedInvoices = (data || []).sort((a, b) => {
        // Pending invoices first
        if (a.status === "pending" && b.status !== "pending") return -1
        if (b.status === "pending" && a.status !== "pending") return 1

        // Then sort by due date (ascending - earliest first)
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })

      setInvoices(sortedInvoices)
    } catch (error) {
      console.error("[v0] Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return

    setProcessing(true)
    try {
      console.log("[v0] Processing payment for invoice:", selectedInvoice.id, "Method:", paymentMethod)

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq("id", selectedInvoice.id)

      if (error) throw error

      console.log("[v0] Payment processed successfully for invoice:", selectedInvoice.id)

      // Refresh invoices
      await fetchUserAndInvoices()
      setSelectedInvoice(null)
    } catch (error) {
      console.error("[v0] Error paying invoice:", error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Payée</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 border-red-200">En retard</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ]
    return months[month - 1] || `Mois ${month}`
  }

  const getMemberName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    return user?.email || "Membre"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 touch-pan-y overflow-x-hidden">
      <DashboardHeader user={user} profile={profile} />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-primary mb-2">Mes Factures</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez vos paiements et consultez l'historique de vos factures
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-serif text-primary">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
              Historique des factures
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {invoices.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Receipt className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-base sm:text-lg text-primary mb-2">Aucune facture</h3>
                <p className="text-sm sm:text-base text-muted-foreground px-4">
                  Vos factures apparaîtront ici une fois votre abonnement activé
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {invoices.map((invoice) => (
                  <Card
                    key={invoice.id}
                    className="border-secondary/50 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => invoice.status === "pending" && setSelectedInvoice(invoice)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <span className="font-semibold text-primary text-sm sm:text-base truncate">
                              {getMonthName(invoice.month)} {invoice.year}
                            </span>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              Échéance: {new Date(invoice.due_date).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-3 sm:text-right">
                          <div className="text-xl sm:text-2xl font-bold text-primary">{invoice.amount}.-</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <InvoicePdfButton invoice={invoice} memberName={getMemberName()} />
                            {invoice.status === "pending" && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedInvoice(invoice)
                                }}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-xs sm:text-sm px-3 py-2"
                              >
                                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Payer
                              </Button>
                            )}
                            {invoice.status === "overdue" && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedInvoice(invoice)
                                }}
                                size="sm"
                                variant="destructive"
                                className="text-xs sm:text-sm px-3 py-2"
                              >
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                En retard
                              </Button>
                            )}
                            {invoice.status === "paid" && invoice.paid_at && (
                              <div className="text-xs sm:text-sm text-green-600 font-medium">
                                ✓ Payée le {new Date(invoice.paid_at).toLocaleDateString("fr-FR")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl font-serif text-primary">Payer la facture</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm sm:text-base">
                    {getMonthName(selectedInvoice.month)} {selectedInvoice.year}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-primary">{selectedInvoice.amount}.-</span>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Échéance: {new Date(selectedInvoice.due_date).toLocaleDateString("fr-FR")}
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-semibold text-sm sm:text-base">Méthode de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                      Carte de crédit/débit
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                    <RadioGroupItem value="postfinance" id="postfinance" />
                    <Label
                      htmlFor="postfinance"
                      className="flex items-center gap-2 cursor-pointer text-sm sm:text-base"
                    >
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      PostFinance
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                    <RadioGroupItem value="twint" id="twint" />
                    <Label htmlFor="twint" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                      <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                      Twint
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                    <RadioGroupItem value="ubs" id="ubs" />
                    <Label htmlFor="ubs" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                      <Banknote className="h-3 w-3 sm:h-4 sm:w-4" />
                      UBS
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-payment" className="font-semibold text-sm sm:text-base">
                    Paiement automatique
                  </Label>
                  <Switch id="auto-payment" checked={autoPayment} onCheckedChange={setAutoPayment} />
                </div>

                {autoPayment && (
                  <div className="space-y-2">
                    <Label htmlFor="iban" className="text-sm sm:text-base">
                      IBAN pour prélèvement automatique
                    </Label>
                    <Input
                      id="iban"
                      placeholder="CH00 0000 0000 0000 0000 0"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Les prochaines factures seront automatiquement prélevées sur ce compte
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 text-sm sm:text-base py-2 sm:py-3"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handlePayInvoice}
                  disabled={processing}
                  className="flex-1 bg-primary hover:bg-primary/90 text-sm sm:text-base py-2 sm:py-3"
                >
                  {processing ? "Traitement..." : `Payer ${selectedInvoice.amount}.-`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
