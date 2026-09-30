"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createAppointmentDocumentDraftAction,
  saveAppointmentDocumentDraftAction,
  updateAppointmentDocumentDraftStatusAction,
  createAppointmentPacketAction,
  queueAppointmentEmailAction,
} from "@/app/matterpilot/actions"
import { Button } from "@/components/ui/button"
import type { Json } from "@/lib/supabase/types"

export function IntakeDocumentEditor({
  matterId,
  document,
  draft,
  clientEmail,
  canEdit,
}: {
  matterId: string
  document: { id: string; name: string; status: string; appointment_id: string }
  draft: {
    id: string
    content: string
    status: string
    field_values: Json
  } | null
  canEdit: boolean
  clientEmail: string | null
}) {
  const router = useRouter()
  const [content, setContent] = useState(draft?.content ?? "")
  const [draftId, setDraftId] = useState(draft?.id ?? "")
  const [message, setMessage] = useState("")
  const [packetUrl, setPacketUrl] = useState("")
  const [queued, setQueued] = useState(false)
  const [pending, startTransition] = useTransition()
  const locked = document.status === "signed" || document.status === "received"
  function run(operation: "create" | "save" | "approve" | "packet" | "send") {
    setMessage("")
    startTransition(async () => {
      if (operation === "send") {
        const result = await queueAppointmentEmailAction({
          matterId,
          appointmentId: document.appointment_id,
          subject: "Your intake preparation packet",
          body: `Please complete your intake questionnaire and review your engagement letter using this secure link:\n\n${packetUrl}\n\nContact the firm if you have any questions.`,
        })
        setMessage(
          result.ok
            ? "Client email queued. Delivery status is available in Communications."
            : result.error
        )
        if (result.ok) setQueued(true)
      } else if (operation === "packet") {
        const result = await createAppointmentPacketAction({
          matterId,
          appointmentId: document.appointment_id,
        })
        if (result.ok) {
          setPacketUrl(
            new URL(result.packetUrl, window.location.origin).toString()
          )
          setQueued(false)
          setMessage(
            "Preparation link created. Share it securely with the client; no email has been sent."
          )
        } else setMessage(result.error)
      } else if (operation === "create") {
        const result = await createAppointmentDocumentDraftAction({
          matterId,
          documentId: document.id,
        })
        if (result.ok) {
          setContent(result.content)
          setDraftId(result.draftId)
          setMessage("Draft prepared.")
        } else setMessage(result.error)
      } else {
        const saved = await saveAppointmentDocumentDraftAction({
          matterId,
          draftId,
          content,
        })
        if (!saved.ok) {
          setMessage(saved.error)
          return
        }
        if (operation === "approve") {
          const result = await updateAppointmentDocumentDraftStatusAction({
            matterId,
            draftId,
            status: "final",
            visibility: "client",
          })
          setMessage(
            result.ok
              ? "Approved for the client preparation packet."
              : result.error
          )
        } else setMessage("Draft saved.")
      }
      router.refresh()
    })
  }
  return (
    <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 sm:p-7">
      <p className="text-[10px] font-bold tracking-[0.18em] text-[#b65f3a] uppercase">
        Client preparation document
      </p>
      <h1 className="mt-2 font-serif text-3xl text-[#23313d]">
        {document.name}
      </h1>
      <p className="mt-2 text-sm text-[#63747a]">
        {document.status} · {draft?.status ?? "No draft yet"}
      </p>
      {draftId ? (
        <>
          <label
            htmlFor="intake-document-body"
            className="mt-5 block text-sm font-semibold text-[#23313d]"
          >
            Document content
          </label>
          <textarea
            id="intake-document-body"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            readOnly={!canEdit || locked}
            className="mt-2 min-h-[420px] w-full rounded-xl border border-[#ded9d0] bg-white p-4 font-mono text-sm leading-6 text-[#23313d]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={pending || !canEdit || locked || !content.trim()}
              onClick={() => run("save")}
            >
              Save draft
            </Button>
            <Button
              disabled={pending || !canEdit || locked || !content.trim()}
              onClick={() => run("approve")}
            >
              Approve for client
            </Button>
            <Button
              disabled={pending || !canEdit || locked}
              onClick={() => run("packet")}
            >
              Create preparation link
            </Button>
          </div>
        </>
      ) : (
        <Button
          className="mt-5"
          disabled={pending || !canEdit}
          onClick={() => run("create")}
        >
          Prepare ready-made draft
        </Button>
      )}
      {draft?.field_values &&
        typeof draft.field_values === "object" &&
        !Array.isArray(draft.field_values) &&
        Object.keys(draft.field_values).length > 0 && (
          <div className="mt-6">
            <h2 className="font-serif text-xl text-[#23313d]">
              Client responses
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(draft.field_values).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-[#ded9d0] bg-white p-3"
                >
                  <dt className="text-xs font-semibold text-[#63747a]">
                    {key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-1 text-sm whitespace-pre-wrap text-[#23313d]">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      {locked && (
        <p className="mt-4 text-xs text-[#63747a]">
          Completed client documents are read-only here to preserve the reviewed
          version.
        </p>
      )}
      {message && (
        <p className="mt-4 text-sm text-[#23313d]" role="status">
          {message}
        </p>
      )}
      {packetUrl && (
        <>
          <label className="mt-4 block text-xs font-semibold">
            Client preparation link
            <input
              readOnly
              value={packetUrl}
              onFocus={(event) => event.target.select()}
              className="mt-2 w-full rounded-lg border p-3 text-sm"
            />
          </label>
          <p className="my-3 text-xs text-[#63747a]">
            Recipient:{" "}
            {clientEmail ?? "Add a client email to the appointment first."}
          </p>
          <Button
            disabled={pending || queued || !clientEmail || !canEdit}
            onClick={() => run("send")}
          >
            {queued ? "Email queued" : "Email preparation link"}
          </Button>
        </>
      )}
    </section>
  )
}
