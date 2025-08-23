import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProgressOverview } from "@/components/progress/progress-overview"
import { DisciplineProgress } from "@/components/progress/discipline-progress"
import { AttendanceStats } from "@/components/progress/attendance-stats"
import { ProgressGoals } from "@/components/progress/progress-goals"
import { TrainingCalendar } from "@/components/progress/training-calendar"
import { InstructorNotes } from "@/components/progress/instructor-notes"

export default async function ProgressPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { data: courseAttendance, error: attendanceError } = await supabase
    .from("course_attendance")
    .select("*")
    .eq("user_id", data.user.id)
    .order("course_date", { ascending: false })

  console.log("[v0] Course attendance loaded:", courseAttendance?.length || 0, "courses")
  if (attendanceError) console.log("[v0] Course attendance error:", attendanceError.message)

  const disciplineStats = []
  const milestones = []

  if (courseAttendance && courseAttendance.length > 0) {
    // Group by discipline
    const disciplineGroups = courseAttendance.reduce((acc, course) => {
      const discipline = course.course_name
      if (!acc[discipline]) {
        acc[discipline] = []
      }
      acc[discipline].push(course)
      return acc
    }, {})

    // Create stats for each discipline
    Object.entries(disciplineGroups).forEach(([disciplineName, courses]) => {
      disciplineStats.push({
        discipline_name: disciplineName,
        total_courses: courses.length,
        last_course_date: courses[0].course_date, // Most recent first due to ordering
        member_id: data.user.id,
      })

      // Create milestones for significant achievements
      if (courses.length >= 5) {
        milestones.push({
          title: `${courses.length} cours de ${disciplineName}`,
          description: `Félicitations ! Vous avez suivi ${courses.length} cours de ${disciplineName}`,
          achieved_at: courses[0].course_date,
          member_id: data.user.id,
          discipline_name: disciplineName,
        })
      }
    })
  }

  console.log("[v0] Generated discipline stats:", disciplineStats.length, "disciplines")
  console.log("[v0] Generated milestones:", milestones.length, "milestones")

  // Get user's progress records (existing)
  const { data: progressRecords } = await supabase
    .from("member_progress")
    .select(`
      *,
      disciplines (name, color_code)
    `)
    .eq("member_id", data.user.id)

  // Get disciplines for progress tracking
  const { data: disciplines } = await supabase.from("disciplines").select("*").order("name")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Ma progression</h1>
          <p className="text-muted-foreground">Suivez votre évolution dans les arts martiaux</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ProgressOverview
              userId={data.user.id}
              courseHistory={courseAttendance || []}
              disciplineStats={disciplineStats || []}
              milestones={milestones || []}
              userProfile={profile}
            />

            <TrainingCalendar courseHistory={courseAttendance || []} userId={data.user.id} />

            <InstructorNotes userId={data.user.id} />

            <DisciplineProgress
              userId={data.user.id}
              disciplines={disciplines || []}
              progressRecords={progressRecords || []}
              disciplineStats={disciplineStats || []}
            />

            <AttendanceStats courseHistory={courseAttendance || []} disciplineStats={disciplineStats || []} />
          </div>

          <div className="space-y-6">
            <ProgressGoals
              userId={data.user.id}
              progressRecords={progressRecords || []}
              milestones={milestones || []}
              disciplineStats={disciplineStats || []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
