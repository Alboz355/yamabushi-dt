"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MobileNavProps {
  user: any
  profile?: any
  onSignOut: () => void
}

export function MobileNav({ user, profile, onSignOut }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const pathname = usePathname()

  if (!isMobile) return null

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/booking", label: "Réservations", icon: "📅" },
    { href: "/progress", label: "Progression", icon: "📈" },
    { href: "/profile", label: "Profil", icon: "👤" },
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "⚙️" }] : []),
  ]

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="flex flex-col h-full">
          <div className="py-6">
            <h2 className="font-serif font-black text-xl text-primary">YAMABUSHI</h2>
            <p className="text-sm text-muted-foreground">Académie d'Arts Martiaux</p>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t pt-4 space-y-4">
            <div className="px-4">
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
