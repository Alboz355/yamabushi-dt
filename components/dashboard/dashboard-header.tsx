"use client"

import { useState, useEffect } from "react"
import type { User as SupaUser } from "@supabase/supabase-js"
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
import { Settings, Plus, Calendar, TrendingUp, Shield, GraduationCap, User } from "lucide-react"

interface DashboardHeaderProps {
  user: SupaUser
  profile: any
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isInstructorByAPI, setIsInstructorByAPI] = useState(false)

  useEffect(() => {
    const checkInstructorStatus = async () => {
      try {
        const hardcodedInstructors = ["instructor@instructor.com"]
        if (hardcodedInstructors.includes(user.email || "")) {
          setIsInstructorByAPI(true)
          return
        }

        const response = await fetch("/api/admin/users")
        if (response.ok) {
          const data = await response.json()
          const users = Array.isArray(data) ? data : data.users || []
          const currentUser = users.find((u: any) => u.email === user.email)
          setIsInstructorByAPI(currentUser?.role === "instructor")
        }
      } catch (error) {
        console.error("Error checking instructor status:", error)
      }
    }

    checkInstructorStatus()
  }, [user.email])

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
  const isInstructor = profile?.role === "instructor" || isInstructorByAPI

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
                    <Plus className="h-4 w-4" />
                    Nouveaux cours
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/planifier/mes-cours" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
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
              <Settings className="h-4 w-4" />
              Paramètres
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            {isInstructor && (
              <Link
                href="/instructor"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <GraduationCap className="h-4 w-4" />
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
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/planifier/mes-cours" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Mes cours planifiés
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/progress" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ma progression
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="text-orange-600 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isInstructor && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/instructor" className="text-blue-600 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
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
