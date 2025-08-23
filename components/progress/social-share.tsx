"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Share2, Twitter, Facebook, Linkedin, Instagram, Copy, Download } from "lucide-react"
import { toast } from "sonner"

interface SocialShareProps {
  achievement: {
    type: "belt" | "milestone" | "streak" | "technique"
    title: string
    description: string
    discipline?: string
    value?: number
    date?: string
  }
  userProfile?: {
    first_name?: string
    last_name?: string
  }
}

export function SocialShare({ achievement, userProfile }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false)

  const userName = userProfile?.first_name
    ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
    : "Un membre"

  const generateShareText = (platform: string) => {
    const baseTexts = {
      belt: `🥋 ${userName} vient d'obtenir ${achievement.title} en ${achievement.discipline} ! Félicitations pour cette progression ! 💪`,
      milestone: `🏆 ${userName} a atteint un nouveau jalon : ${achievement.title} ! ${achievement.description} 🎯`,
      streak: `🔥 ${userName} maintient une série de ${achievement.value} jours d'entraînement consécutifs ! Quelle discipline ! 💪`,
      technique: `⭐ ${userName} maîtrise maintenant ${achievement.title} en ${achievement.discipline} ! Progression technique au top ! 🥋`,
    }

    const text = baseTexts[achievement.type] || `🎉 ${userName} a accompli : ${achievement.title} !`

    const hashtags = {
      twitter: " #YamabushiAcademy #ArtsMartiaux #Progression #Motivation",
      facebook: "",
      linkedin: " #YamabushiAcademy #ArtsMartiaux #DéveloppementPersonnel",
      instagram: " #yamabushiacademy #artsmartiaux #progression #motivation #martialarts",
    }

    return text + (hashtags[platform as keyof typeof hashtags] || "")
  }

  const generateShareUrl = (platform: string) => {
    const text = encodeURIComponent(generateShareText(platform))
    const url = encodeURIComponent("https://yamabushi-academy.com")

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      instagram: `https://www.instagram.com/`, // Instagram doesn't support direct sharing URLs
    }

    return urls[platform as keyof typeof urls] || ""
  }

  const copyToClipboard = async () => {
    const text = generateShareText("general")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Texte copié dans le presse-papiers !")
    } catch (error) {
      toast.error("Erreur lors de la copie")
    }
  }

  const downloadImage = () => {
    // Create a canvas to generate achievement image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 800
    canvas.height = 600

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#1e40af")
    gradient.addColorStop(1, "#3b82f6")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add Yamabushi Academy branding
    ctx.fillStyle = "white"
    ctx.font = "bold 48px Arial"
    ctx.textAlign = "center"
    ctx.fillText("YAMABUSHI ACADEMY", canvas.width / 2, 100)

    // Achievement icon
    const iconMap = {
      belt: "🥋",
      milestone: "🏆",
      streak: "🔥",
      technique: "⭐",
    }
    ctx.font = "120px Arial"
    ctx.fillText(iconMap[achievement.type] || "🎉", canvas.width / 2, 250)

    // Achievement title
    ctx.font = "bold 36px Arial"
    ctx.fillText(achievement.title, canvas.width / 2, 350)

    // User name
    ctx.font = "28px Arial"
    ctx.fillText(userName, canvas.width / 2, 400)

    // Description
    if (achievement.description) {
      ctx.font = "24px Arial"
      const words = achievement.description.split(" ")
      let line = ""
      let y = 450

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > 600 && i > 0) {
          ctx.fillText(line, canvas.width / 2, y)
          line = words[i] + " "
          y += 30
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, canvas.width / 2, y)
    }

    // Date
    if (achievement.date) {
      ctx.font = "20px Arial"
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.fillText(new Date(achievement.date).toLocaleDateString("fr-FR"), canvas.width / 2, canvas.height - 50)
    }

    // Download the image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `yamabushi-achievement-${achievement.type}-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Image téléchargée !")
      }
    })
  }

  const shareToSocial = (platform: string) => {
    if (platform === "instagram") {
      toast.info("Pour Instagram, téléchargez l'image et partagez-la manuellement avec le texte copié !")
      return
    }

    const url = generateShareUrl(platform)
    if (url) {
      window.open(url, "_blank", "width=600,height=400")
    }
  }

  const getAchievementIcon = () => {
    const icons = {
      belt: "🥋",
      milestone: "🏆",
      streak: "🔥",
      technique: "⭐",
    }
    return icons[achievement.type] || "🎉"
  }

  const getAchievementColor = () => {
    const colors = {
      belt: "bg-gradient-to-r from-yellow-400 to-orange-500",
      milestone: "bg-gradient-to-r from-purple-400 to-pink-500",
      streak: "bg-gradient-to-r from-red-400 to-orange-500",
      technique: "bg-gradient-to-r from-blue-400 to-indigo-500",
    }
    return colors[achievement.type] || "bg-gradient-to-r from-gray-400 to-gray-500"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Share2 className="h-4 w-4" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager votre réussite
          </DialogTitle>
          <DialogDescription>
            Partagez votre accomplissement avec vos amis et inspirez d'autres personnes !
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Achievement Preview */}
          <Card className={`${getAchievementColor()} text-white`}>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">{getAchievementIcon()}</div>
              <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
              {achievement.discipline && <p className="text-sm opacity-90 mb-2">{achievement.discipline}</p>}
              <p className="text-sm opacity-80">{achievement.description}</p>
              <div className="mt-4 text-xs opacity-70">YAMABUSHI ACADEMY • {userName}</div>
            </CardContent>
          </Card>

          {/* Share Options */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Partager sur les réseaux sociaux</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => shareToSocial("twitter")} className="gap-2 justify-start">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  Twitter
                </Button>
                <Button variant="outline" onClick={() => shareToSocial("facebook")} className="gap-2 justify-start">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </Button>
                <Button variant="outline" onClick={() => shareToSocial("linkedin")} className="gap-2 justify-start">
                  <Linkedin className="h-4 w-4 text-blue-700" />
                  LinkedIn
                </Button>
                <Button variant="outline" onClick={() => shareToSocial("instagram")} className="gap-2 justify-start">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Outils de partage</h4>
              <div className="flex gap-3">
                <Button variant="outline" onClick={copyToClipboard} className="gap-2 flex-1 bg-transparent">
                  <Copy className="h-4 w-4" />
                  Copier le texte
                </Button>
                <Button variant="outline" onClick={downloadImage} className="gap-2 flex-1 bg-transparent">
                  <Download className="h-4 w-4" />
                  Télécharger l'image
                </Button>
              </div>
            </div>

            {/* Preview Text */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-muted-foreground mb-2">Aperçu du message :</h5>
              <p className="text-sm">{generateShareText("general")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
