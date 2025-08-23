"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Calendar, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentMethod, setPaymentMethod] = useState("full")
  const [processing, setProcessing] = useState(false)

  const planType = searchParams.get("plan")
  const ageCategory = searchParams.get("age")
  const price = searchParams.get("price")
  const planName = searchParams.get("planName")

  const plans = {
    monthly: { name: "Mensuel", price: 89, duration: 1 },
    six_months: { name: "6 Mois", price: 600, duration: 6 },
    yearly: { name: "Annuel", price: 1000, duration: 12 },
  }

  const selectedPlan = plans[planType as keyof typeof plans] || {
    name: planName || "Plan personnalisé",
    price: Number.parseFloat(price || "0"),
    duration: planType === "monthly" ? 1 : planType === "six_months" ? 6 : 12,
  }

  const monthlyAmount = selectedPlan ? Math.floor(selectedPlan.price / selectedPlan.duration) : 0

  const handlePayment = async () => {
    if (processing) {
      console.log("[v0] Payment already in progress, ignoring duplicate request")
      return
    }

    setProcessing(true)

    try {
      console.log("[v0] Processing payment simulation:", {
        plan: planType,
        ageCategory,
        paymentMethod,
        amount: paymentMethod === "full" ? selectedPlan.price : monthlyAmount,
      })

      // Simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create subscription after successful payment simulation
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Utilisateur non connecté")
      }

      const { data: existingSubscriptions } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("member_id", user.id)
        .eq("status", "active")

      if (existingSubscriptions && existingSubscriptions.length > 0) {
        console.log("[v0] User already has active subscription, redirecting to dashboard")
        router.push("/dashboard?welcome=true")
        return
      }

      const planDuration = planType === "monthly" ? 1 : planType === "six_months" ? 6 : 12
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + planDuration)

      console.log("[v0] Creating subscription after payment")
      const { error: subscriptionError, data: subscriptionData } = await supabase
        .from("subscriptions")
        .insert({
          member_id: user.id,
          plan_type: planType || "custom",
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "active",
          price: selectedPlan.price,
          payment_method: paymentMethod,
        })
        .select()

      if (subscriptionError) {
        console.error("[v0] Subscription creation error:", subscriptionError)
        throw subscriptionError
      }

      console.log("[v0] Subscription created successfully:", subscriptionData)

      if (subscriptionData && subscriptionData[0]) {
        const subscriptionId = subscriptionData[0].id

        const { data: existingInvoices } = await supabase
          .from("invoices")
          .select("id")
          .eq("member_id", user.id)
          .eq("subscription_id", subscriptionId)

        if (existingInvoices && existingInvoices.length > 0) {
          console.log("[v0] Invoices already exist for this subscription, skipping invoice creation")
        } else {
          if (paymentMethod === "monthly") {
            const invoices = []
            const exactMonthlyAmount = Math.floor(selectedPlan.price / planDuration)
            const remainder = selectedPlan.price - exactMonthlyAmount * planDuration

            console.log("[v0] Creating", planDuration, "monthly invoices for subscription", subscriptionId)

            for (let i = 0; i < planDuration; i++) {
              const invoiceDate = new Date(startDate)
              invoiceDate.setMonth(invoiceDate.getMonth() + i)

              const invoiceAmount = i === planDuration - 1 ? exactMonthlyAmount + remainder : exactMonthlyAmount

              const invoice = {
                member_id: user.id,
                subscription_id: subscriptionId,
                amount: invoiceAmount,
                due_date: invoiceDate.toISOString().split("T")[0],
                status: i === 0 ? "paid" : "pending", // Only first invoice is paid
                month: invoiceDate.getMonth() + 1,
                year: invoiceDate.getFullYear(),
              }

              if (i === 0) {
                invoice.paid_at = startDate.toISOString()
                invoice.payment_method = "simulation"
              }

              invoices.push(invoice)
            }

            const { error: invoiceError } = await supabase.from("invoices").insert(invoices)
            if (invoiceError) {
              console.error("[v0] Invoice creation error:", invoiceError)
            } else {
              console.log("[v0] Monthly invoices created successfully:", invoices.length, "invoices")
            }
          } else {
            const { error: invoiceError } = await supabase.from("invoices").insert({
              member_id: user.id,
              subscription_id: subscriptionId,
              amount: selectedPlan.price,
              due_date: startDate.toISOString().split("T")[0],
              status: "paid",
              month: startDate.getMonth() + 1,
              year: startDate.getFullYear(),
              paid_at: startDate.toISOString(),
              payment_method: "simulation",
            })

            if (invoiceError) {
              console.error("[v0] Invoice creation error:", invoiceError)
            } else {
              console.log("[v0] Full payment invoice created successfully")
            }
          }
        }
      }

      console.log("[v0] Payment simulation completed successfully")

      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard?welcome=true")
    } catch (error) {
      console.error("[v0] Payment error:", error)
      alert(`Erreur lors du paiement: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setProcessing(false)
    }
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <p>Plan non trouvé. Veuillez recommencer votre inscription.</p>
            <Button onClick={() => router.push("/subscription")} className="mt-4">
              Retour aux abonnements
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/95 backdrop-blur-sm border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">Finaliser votre abonnement</CardTitle>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="secondary">{selectedPlan.name}</Badge>
              <Badge variant="outline">{ageCategory === "child" ? "Enfant" : "Adulte"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Récapitulatif</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Abonnement {selectedPlan.name}</span>
                  <span className="font-semibold">{selectedPlan.price}.-</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Durée</span>
                  <span>{selectedPlan.duration} mois</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Catégorie</span>
                  <span>{ageCategory === "child" ? "Enfant (< 15 ans)" : "Adulte (15+ ans)"}</span>
                </div>
              </div>
            </div>

            {planType !== "monthly" && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Options de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Paiement intégral</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{selectedPlan.price}.-</div>
                          <div className="text-sm text-green-600">Économisez 5%</div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Paiement mensuel</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{monthlyAmount}.- / mois</div>
                          <div className="text-sm text-slate-600">Premier mois aujourd'hui</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900">Accès complet inclus :</p>
                  <ul className="mt-1 space-y-1 text-blue-800">
                    <li>• Tous les cours (JJB, Grappling, Boxe, Kickboxing)</li>
                    <li>• Suivi de progression personnalisé</li>
                    <li>• Réservation de cours en ligne</li>
                    <li>• Accès à tous les clubs partenaires</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total à payer aujourd'hui :</span>
                <span className="text-red-600">{paymentMethod === "full" ? selectedPlan.price : monthlyAmount}.-</span>
              </div>

              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                size="lg"
              >
                {processing
                  ? "Traitement en cours..."
                  : `Simuler le paiement ${paymentMethod === "full" ? selectedPlan.price : monthlyAmount}.-`}
              </Button>

              <p className="text-xs text-center text-slate-600">
                Paiement sécurisé. Vous pouvez annuler votre abonnement à tout moment avec un préavis de 30 jours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
