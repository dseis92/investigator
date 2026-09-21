import { Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/empty-state"
import { MatterHeader } from "@/components/matters/matter-header"
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog"
import { SubjectTypeIcon } from "@/components/subjects/subject-type-icon"
import { Card, CardContent } from "@/components/ui/card"
import { humanizeEnum } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Subjects" }

export default async function SubjectsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, subject_type, display_name, summary")
    .eq("matter_id", matterId)
    .order("display_name", { ascending: true })

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section="Subjects" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">People, businesses, accounts, and other case entities.</p>
        <CreateSubjectDialog matterId={matterId} />
      </div>

      {subjects && subjects.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link key={s.id} href={`/matters/${matterId}/subjects/${s.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start gap-3">
                  <SubjectTypeIcon type={s.subject_type} className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.display_name}</p>
                    <p className="text-xs text-muted-foreground">{humanizeEnum(s.subject_type)}</p>
                    {s.summary ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.summary}</p> : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No subjects yet"
          description="Add the people, businesses, or other entities this investigation involves."
          action={<CreateSubjectDialog matterId={matterId} />}
        />
      )}
    </div>
  )
}
