import { Briefcase, Scale } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CreateMatterDialog } from "@/components/matters/create-matter-dialog"
import { EmptyState } from "@/components/empty-state"
import { SignOutButton } from "@/components/sign-out-button"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, humanizeEnum } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Matters" }

export default async function MattersPage() {
  const supabase = await createClient()
  const { data: matters } = await supabase
    .from("matters")
    .select("id, matter_number, name, case_mode, status, jurisdiction, next_deadline_at")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <Scale className="size-5" />
          TraceLine
        </div>
        <SignOutButton />
      </header>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Matters</h1>
          <p className="text-sm text-muted-foreground">Cases you have access to.</p>
        </div>
        <CreateMatterDialog />
      </div>

      {matters && matters.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {matters.map((matter) => (
            <Link key={matter.id} href={`/matters/${matter.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{matter.name}</CardTitle>
                    <StatusBadge status={matter.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{matter.matter_number}</p>
                  <p>
                    {humanizeEnum(matter.case_mode)}
                    {matter.jurisdiction ? ` · ${matter.jurisdiction}` : ""}
                  </p>
                  {matter.next_deadline_at ? <p>Next deadline: {formatDate(matter.next_deadline_at)}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No matters yet"
          description="Create your first matter to start building an investigation."
          action={<CreateMatterDialog />}
        />
      )}
    </div>
  )
}
