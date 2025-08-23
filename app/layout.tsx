import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Open_Sans } from "next/font/google"
import "./globals.css"
import { TranslationProvider } from "@/lib/i18n/context"
import { ThemeProvider } from "@/lib/theme/theme-provider"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "600", "700", "900"],
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Yamabushi Academy - Martial Arts Training",
  description: "Professional martial arts training in JJB, Grappling, Boxing, and Kickboxing",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${openSans.variable} antialiased`}>
      <body className="font-sans pb-16 md:pb-0">
        <ThemeProvider defaultTheme="system" storageKey="yamabushi-ui-theme">
          <TranslationProvider>{children}</TranslationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
