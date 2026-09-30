import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { IntakeDocumentEditor } from "@/components/matters/intake-document-editor"
import { buttonVariants } from "@/components/ui/button"

export default async function IntakeDocumentPage({
  params,
}: {
  params: Promise<{ matterId: string; documentId: string }>
}) {
  const { matterId, documentId } = await params
  const supabase = await createClient()
  const { data: document } = await supabase
    .from("appointment_documents")
    .select("id, name, status, appointment_id")
    .eq("matter_id", matterId)
    .eq("id", documentId)
    .maybeSingle()
  if (
    !document ||
    !["Intake questionnaire", "Engagement letter"].includes(document.name)
  )
    notFound()
  const [{ data: draft, error }, { data: userData }, { data: appointment }] =
    await Promise.all([
      supabase
        .from("appointment_document_drafts")
        .select("id, content, status, field_values")
        .eq("matter_id", matterId)
        .eq("appointment_document_id", documentId)
        .maybeSingle(),
      supabase.auth.getUser(),
      supabase
        .from("appointments")
        .select("client_email")
        .eq("matter_id", matterId)
        .eq("id", document.appointment_id)
        .maybeSingle(),
    ])
  if (error) throw new Error("Unable to load this document.")
  const { data: member } = userData.user
    ? await supabase
        .from("matter_members")
        .select("role")
        .eq("matter_id", matterId)
        .eq("user_id", userData.user.id)
        .maybeSingle()
    : { data: null }
  return (
    <div className="space-y-5 pb-16">
      <Link
        href={`/matters/${matterId}`}
        className={buttonVariants({ size: "sm" })}
      >
        ← Back to matter
      </Link>
      <IntakeDocumentEditor
        matterId={matterId}
        document={document}
        draft={draft}
        clientEmail={appointment?.client_email ?? null}
        canEdit={["attorney", "admin"].includes(member?.role ?? "")}
      />
    </div>
  )
}
