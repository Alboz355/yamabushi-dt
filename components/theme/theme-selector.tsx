"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTheme } from "@/lib/theme/theme-provider"
import { Moon, Sun, Monitor } from "lucide-react"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Apparence
        </CardTitle>
        <CardDescription>Choisissez le thème de l'application selon vos préférences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
              <Sun className="h-4 w-4" />
              Clair
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
              <Moon className="h-4 w-4" />
              Sombre
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
              <Monitor className="h-4 w-4" />
              Système
            </Label>
          </div>
        </RadioGroup>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="space-y-2">
            <div className="p-4 rounded-lg border bg-background">
              <div className="h-2 bg-primary rounded mb-2"></div>
              <div className="h-1 bg-muted rounded mb-1"></div>
              <div className="h-1 bg-muted rounded w-3/4"></div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Clair</p>
          </div>

          <div className="space-y-2">
            <div className="p-4 rounded-lg border bg-slate-900 border-slate-700">
              <div className="h-2 bg-rose-500 rounded mb-2"></div>
              <div className="h-1 bg-slate-700 rounded mb-1"></div>
              <div className="h-1 bg-slate-700 rounded w-3/4"></div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Sombre</p>
          </div>

          <div className="space-y-2">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-background to-slate-100 dark:to-slate-800">
              <div className="h-2 bg-primary rounded mb-2"></div>
              <div className="h-1 bg-muted rounded mb-1"></div>
              <div className="h-1 bg-muted rounded w-3/4"></div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Système</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
