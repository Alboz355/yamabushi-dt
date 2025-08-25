"use client"

import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MobileNav } from "@/components/mobile/mobile-nav"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface DashboardHeaderProps {
  user: User
  profile: any
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : user.email?.[0]?.toUpperCase() || "U"

  const adminEmails = ["admin@admin.com"]
  const isAdmin = profile?.role === "admin" || adminEmails.includes(user.email || "")
  const isInstructor = profile?.role === "instructor"

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav user={user} profile={profile} onSignOut={handleSignOut} />
            <Link href="/dashboard" className="flex items-center space-x-2 md:space-x-3">
              <h1 className="font-serif font-black text-xl md:text-2xl text-primary">YAMABUSHI</h1>
              <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
                Académie d'Arts Martiaux
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Planifier
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem asChild>
                  <Link href="/booking" className="flex items-center gap-2">
                    <span>➕</span>
                    Nouveaux cours
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/planifier/mes-cours" className="flex items-center gap-2">
                    <span>📋</span>
                    Mes cours planifiés
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/progress"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Progression
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Profil
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Paramètres
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                Admin
              </Link>
            )}
            {isInstructor && (
              <Link
                href="/instructor/dashboard"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Instructeur
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10">
                    <AvatarImage src={profile?.profile_image_url || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : "Membre"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Mon profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Paramètres</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/planifier/mes-cours">Mes cours planifiés</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/progress">Ma progression</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="text-orange-600">
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isInstructor && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/instructor/dashboard" className="text-blue-600">
                        Interface Instructeur
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
