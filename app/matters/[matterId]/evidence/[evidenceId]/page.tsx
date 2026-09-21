import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AnnotationForm } from "@/components/evidence/annotation-form"
import { AuthenticationNotice } from "@/components/evidence/authentication-notice"
import { ExcludeEvidenceDialog } from "@/components/evidence/exclude-evidence-dialog"
import { ReviewStateControl } from "@/components/evidence/review-state-control"
import { SupersedeEvidenceDialog } from "@/components/evidence/supersede-evidence-dialog"
import { MatterHeader } from "@/components/matters/matter-header"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime, formatRelative, humanizeEnum } from "@/lib/format"
import { canExcludeEvidence, getMatterRole } from "@/lib/matters/get-role"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ evidenceId: string }>
}): Promise<Metadata> {
  const { evidenceId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("evidence").select("evidence_number, title").eq("id", evidenceId).maybeSingle()
  return { title: data ? `${data.evidence_number} — ${data.title}` : "Evidence" }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ matterId: string; evidenceId: string }>
}) {
  const { matterId, evidenceId } = await params
  const supabase = await createClient()

  const { data: matter } = await supabase.from("matters").select("*").eq("id", matterId).maybeSingle()
  if (!matter) notFound()

  const { data: evidence } = await supabase
    .from("evidence")
    .select("*, source:sources(name, source_type, locator)")
    .eq("id", evidenceId)
    .eq("matter_id", matterId)
    .maybeSingle()
  if (!evidence) notFound()

  const { data: supersedingEvidence } = evidence.superseded_by
    ? await supabase
        .from("evidence")
        .select("evidence_number, title")
        .eq("id", evidence.superseded_by)
        .maybeSingle()
    : { data: null }

  const [{ data: annotations }, { data: links }, { data: auditRows }, role, { data: otherEvidence }] = await Promise.all([
    supabase
      .from("evidence_annotations")
      .select("id, body, created_at, author:profiles(full_name)")
      .eq("evidence_id", evidenceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("evidence_links")
      .select(
        "id, relationship, subject:subjects(id, display_name), event:events(id, title), proposition:propositions(id, statement), statement:statements(id, content)"
      )
      .eq("evidence_id", evidenceId),
    supabase
      .from("audit_events")
      .select("id, action, summary, created_at, actor:profiles(full_name)")
      .eq("entity_type", "evidence")
      .eq("entity_id", evidenceId)
      .order("created_at", { ascending: false }),
    getMatterRole(matterId),
    supabase
      .from("evidence")
      .select("id, evidence_number, title")
      .eq("matter_id", matterId)
      .eq("is_excluded", false)
      .neq("id", evidenceId)
      .order("evidence_number", { ascending: true }),
  ])

  const source = evidence.source as { name: string; source_type: string; locator: string | null } | null

  return (
    <div className="space-y-6 pb-16">
      <MatterHeader matter={matter} section={evidence.evidence_number} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{evidence.title}</h1>
          <p className="text-sm text-muted-foreground">{humanizeEnum(evidence.artifact_type)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReviewStateControl matterId={matterId} evidenceId={evidenceId} value={evidence.review_state} />
          {!evidence.superseded_by ? (
            <SupersedeEvidenceDialog matterId={matterId} evidenceId={evidenceId} options={otherEvidence ?? []} />
          ) : null}
          <ExcludeEvidenceDialog
            matterId={matterId}
            evidenceId={evidenceId}
            isExcluded={evidence.is_excluded}
            canExclude={canExcludeEvidence(role)}
          />
        </div>
      </div>

      {evidence.is_excluded ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="text-sm">
            <span className="font-medium">Excluded:</span> {evidence.excluded_reason}
          </CardContent>
        </Card>
      ) : null}

      {supersedingEvidence ? (
        <Card className="border-border bg-muted/40">
          <CardContent className="text-sm">
            <span className="font-medium">Superseded by:</span> {supersedingEvidence.evidence_number} —{" "}
            {supersedingEvidence.title}
          </CardContent>
        </Card>
      ) : null}

      <AuthenticationNotice />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Provenance &amp; identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Provenance status" value={<StatusBadge status={evidence.provenance_status} />} />
          <Field label="Identity-match status" value={humanizeEnum(evidence.identity_match_status)} />
          <Field label="Authentication status" value={<StatusBadge status={evidence.authentication_status} />} />
          <Field label="Relevance" value={evidence.relevance ? humanizeEnum(evidence.relevance) : null} />
          <Field label="Source" value={source?.name} />
          <Field label="Source type" value={source ? humanizeEnum(source.source_type) : null} />
          <Field label="Source locator" value={evidence.source_locator} />
          <Field label="Collector" value={evidence.collector} />
          <Field label="Custodian" value={evidence.custodian} />
          <Field label="Event date" value={formatDateTime(evidence.event_date)} />
          <Field label="Captured date" value={formatDateTime(evidence.captured_at)} />
          <Field label="Record date" value={formatDateTime(evidence.record_date)} />
          <Field label="Artifact reference" value={evidence.artifact_ref} />
          <Field label="Artifact hash" value={evidence.artifact_hash} />
        </CardContent>
      </Card>

      {links && links.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {links.map((link) => {
              const subject = link.subject as { id: string; display_name: string } | null
              const event = link.event as { id: string; title: string } | null
              const proposition = link.proposition as { id: string; statement: string } | null
              const statement = link.statement as { id: string; content: string } | null
              return (
                <div key={link.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-sm">
                  <span className="truncate">
                    {subject ? (
                      <Link href={`/matters/${matterId}/subjects/${subject.id}`} className="hover:underline">
                        Subject: {subject.display_name}
                      </Link>
                    ) : event ? (
                      `Event: ${event.title}`
                    ) : proposition ? (
                      `Proposition: ${proposition.statement}`
                    ) : statement ? (
                      `Statement: ${statement.content}`
                    ) : (
                      "Linked item"
                    )}
                  </span>
                  <StatusBadge status={link.relationship} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analyst annotations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Annotations are analyst commentary, kept separate from the original artifact record above.
          </p>
          {annotations && annotations.length > 0 ? (
            <ul className="space-y-3">
              {annotations.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2.5 text-sm">
                  <p>{a.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(a.author as { full_name: string | null } | null)?.full_name ?? "Someone"} ·{" "}
                    {formatRelative(a.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No annotations yet.</p>
          )}
          <AnnotationForm matterId={matterId} evidenceId={evidenceId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditRows && auditRows.length > 0 ? (
            auditRows.map((row) => (
              <div key={row.id} className="text-sm">
                <span className="font-medium">{humanizeEnum(row.action)}</span>{" "}
                <span className="text-muted-foreground">
                  by {(row.actor as { full_name: string | null } | null)?.full_name ?? "Someone"} ·{" "}
                  {formatRelative(row.created_at)}
                </span>
                <p className="text-muted-foreground">{row.summary}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
