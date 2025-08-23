"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface InvoicePdfButtonProps {
  invoice: {
    id: string
    amount: number
    month: number
    year: number
    status: string
    due_date: string
  }
  memberName: string
}

export function InvoicePdfButton({ invoice, memberName }: InvoicePdfButtonProps) {
  const [generating, setGenerating] = useState(false)

  const generatePDF = async () => {
    setGenerating(true)

    try {
      // Create PDF content
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Facture ${invoice.month}/${invoice.year}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #be123c; }
            .invoice-details { margin: 20px 0; }
            .amount { font-size: 20px; font-weight: bold; color: #be123c; }
            .footer { margin-top: 40px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">YAMABUSHI</div>
            <p>Académie d'Arts Martiaux</p>
          </div>
          
          <h2>Facture #${invoice.id.slice(0, 8)}</h2>
          
          <div class="invoice-details">
            <p><strong>Client:</strong> ${memberName}</p>
            <p><strong>Période:</strong> ${invoice.month}/${invoice.year}</p>
            <p><strong>Date d'échéance:</strong> ${new Date(invoice.due_date).toLocaleDateString("fr-FR")}</p>
            <p><strong>Statut:</strong> ${invoice.status === "paid" ? "Payée" : "En attente"}</p>
          </div>
          
          <div class="amount">
            <p>Montant: CHF ${invoice.amount}</p>
          </div>
          
          <div class="footer">
            <p>Merci pour votre confiance !</p>
            <p>Yamabushi - Académie d'Arts Martiaux</p>
          </div>
        </body>
        </html>
      `

      // Create blob and download
      const blob = new Blob([pdfContent], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `facture-${invoice.month}-${invoice.year}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={generatePDF}
      disabled={generating}
      className="flex items-center gap-2 bg-transparent"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {generating ? "Génération..." : "PDF"}
    </Button>
  )
}
