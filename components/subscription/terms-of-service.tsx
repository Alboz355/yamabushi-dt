"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsOfServiceProps {
  onAccept: () => void
  onDecline: () => void
}

export function TermsOfService({ onAccept, onDecline }: TermsOfServiceProps) {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/95 backdrop-blur-sm border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">
              Conditions d'Utilisation - Académie Yamabushi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              <div className="space-y-4 text-sm text-slate-700">
                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">1. Inscription et Adhésion</h3>
                  <p>
                    En vous inscrivant à l'Académie Yamabushi, vous acceptez de compléter tous les documents
                    d'inscription requis, incluant la reconnaissance des risques inhérents à la pratique des arts
                    martiaux. Vous confirmez que toutes les informations fournies sont exactes et à jour.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">2. Paiement et Frais</h3>
                  <p>
                    Les paiements sont exigibles selon les modalités choisies lors de l'inscription. Les abonnements
                    peuvent être payés intégralement ou mensuellement selon l'option sélectionnée. Les retards de
                    paiement peuvent entraîner la suspension temporaire de l'accès aux services.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">3. Règles et Code de Conduite</h3>
                  <p>
                    Tous les membres doivent respecter les règles de sécurité, de fair-play et de respect mutuel. Le
                    port d'une tenue appropriée est obligatoire. Tout comportement inapproprié peut entraîner
                    l'exclusion temporaire ou définitive du club.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">4. Annulation et Remboursement</h3>
                  <p>
                    Les abonnements sont généralement non-remboursables, sauf en cas de blessure grave certifiée
                    médicalement ou de déménagement justifié. Un préavis de 30 jours est requis pour toute résiliation
                    d'abonnement.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">5. Décharge de Responsabilité</h3>
                  <p>
                    La pratique des arts martiaux comporte des risques de blessures. En vous inscrivant, vous
                    reconnaissez ces risques et dégagez l'Académie Yamabushi de toute responsabilité pour les blessures
                    ou dommages, sauf en cas de négligence prouvée du club.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">6. Protection des Données</h3>
                  <p>
                    Vos données personnelles sont collectées et traitées conformément au RGPD. Elles sont utilisées
                    uniquement pour la gestion de votre adhésion et l'amélioration de nos services. Vous disposez d'un
                    droit d'accès, de rectification et de suppression de vos données.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">7. Assurance</h3>
                  <p>
                    Il est fortement recommandé de souscrire une assurance personnelle couvrant la pratique sportive.
                    L'Académie Yamabushi dispose d'une assurance responsabilité civile mais ne couvre pas les dommages
                    corporels individuels.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">8. Loi Applicable</h3>
                  <p>
                    Ces conditions sont régies par le droit français. En cas de litige, une médiation sera privilégiée
                    avant tout recours judiciaire devant les tribunaux compétents.
                  </p>
                </section>
              </div>
            </ScrollArea>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={accepted} onCheckedChange={setAccepted} />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                J'ai lu et j'accepte les conditions d'utilisation de l'Académie Yamabushi
              </label>
            </div>

            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={onDecline}>
                Refuser
              </Button>
              <Button onClick={onAccept} disabled={!accepted} className="bg-red-600 hover:bg-red-700">
                Accepter et Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
