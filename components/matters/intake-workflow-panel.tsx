"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2, FileText, Loader2 } from "lucide-react"
import {
  manageMatterIntakeAction,
  saveIntakeClientAction,
} from "@/app/matters/[matterId]/intake-workflow-actions"
import { updateMatterOnboardingItemAction } from "@/app/matters/[matterId]/onboarding-actions"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  ENGAGEMENT_REVIEW,
  INTAKE_REVIEW,
  intakeBlockers,
  intakeDocumentStage,
  type IntakeDocument,
} from "@/lib/matters/intake-workflow"

type Props = {
  matterId: string
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  conflictReviewed: boolean
  conflictStatus: string
  activatedAt: string | null
  canManage: boolean
  documents: IntakeDocument[]
  items: {
    id: string
    title: string
    status: string
    is_required: boolean
    updated_at?: string
  }[]
}

export function IntakeWorkflowPanel(props: Props) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [editingClient, setEditingClient] = useState(!props.clientName)
  const [name, setName] = useState(props.clientName ?? "")
  const [email, setEmail] = useState(props.clientEmail ?? "")
  const [phone, setPhone] = useState(props.clientPhone ?? "")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const blockers = intakeBlockers(props)
  const intake = props.documents.find(
    (document) => document.name === "Intake questionnaire"
  )
  const engagement = props.documents.find(
    (document) => document.name === "Engagement letter"
  )
  const steps = [
    { label: "Client identity", done: !!props.clientName },
    { label: "Conflict review", done: props.conflictReviewed },
    {
      label: "Intake & engagement",
      done:
        intake?.status === "received" &&
        engagement?.signatureStatus === "signed",
    },
    { label: "Attorney review", done: !blockers.length },
    { label: "Matter activated", done: !!props.activatedAt },
  ]
  function run(operation: "prepare" | "review_conflicts" | "activate") {
    setMessage("")
    startTransition(async () => {
      const result = await manageMatterIntakeAction({
        matterId: props.matterId,
        operation,
        note,
      })
      setMessage(
        result.ok
          ? operation === "activate"
            ? "Matter activated."
            : "Workflow updated."
          : result.error
      )
      if (result.ok) router.refresh()
    })
  }
  function review(itemId: string) {
    setMessage("")
    startTransition(async () => {
      const result = await updateMatterOnboardingItemAction({
        matterId: props.matterId,
        itemId,
        status: "completed",
      })
      setMessage(result.ok ? "Document review recorded." : result.error)
      if (result.ok) router.refresh()
    })
  }
  function saveClient() {
    setMessage("")
    startTransition(async () => {
      const result = await saveIntakeClientAction({
        matterId: props.matterId,
        name,
        email,
        phone,
      })
      setMessage(
        result.ok
          ? "Client identity saved. Run and review the conflict check for this client."
          : result.error
      )
      if (result.ok) {
        setEditingClient(false)
        router.refresh()
      }
    })
  }
  return (
    <section
      aria-labelledby="intake-workflow-title"
      className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#b65f3a] uppercase">
            Client onboarding
          </p>
          <h2
            id="intake-workflow-title"
            className="mt-1 font-serif text-2xl text-[#23313d]"
          >
            From first contact to active matter
          </h2>
          <p className="mt-2 text-sm text-[#63747a]">
            Documents, follow-ups, and the next decision in one place.
          </p>
        </div>
        {props.activatedAt && (
          <span className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            Activated {props.activatedAt.slice(0, 10)}
          </span>
        )}
      </div>
      <ol
        className="my-6 grid gap-3 sm:grid-cols-5"
        aria-label="Intake progress"
      >
        {steps.map((step, index) => (
          <li key={step.label} className="border-t-2 border-[#ded9d0] pt-3">
            <span className={step.done ? "text-emerald-700" : "text-[#8b8d88]"}>
              {step.done ? (
                <CheckCircle2 className="mb-2 size-4" />
              ) : (
                <span className="mb-2 block text-xs">0{index + 1}</span>
              )}
            </span>
            <p className="text-xs font-semibold text-[#23313d]">{step.label}</p>
          </li>
        ))}
      </ol>
      {props.canManage && (
        <div className="mb-5">
          {editingClient ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                saveClient()
              }}
              className="rounded-xl border border-[#e8e3da] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Client name",
                    value: name,
                    set: setName,
                    type: "text",
                  },
                  {
                    label: "Client email",
                    value: email,
                    set: setEmail,
                    type: "email",
                  },
                  {
                    label: "Client phone",
                    value: phone,
                    set: setPhone,
                    type: "tel",
                  },
                ].map((field) => (
                  <label
                    key={field.label}
                    className="text-xs font-semibold text-[#59645e]"
                  >
                    {field.label}
                    <input
                      type={field.type}
                      required={field.label === "Client name"}
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#ded9d0] bg-white p-2 text-sm"
                    />
                  </label>
                ))}
              </div>
              <Button
                type="submit"
                size="sm"
                className="mt-3"
                disabled={pending}
              >
                Save client identity
              </Button>
            </form>
          ) : (
            <Button size="sm" onClick={() => setEditingClient(true)}>
              Edit client identity
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Intake questionnaire",
            document: intake,
            reviewTitle: INTAKE_REVIEW,
          },
          {
            title: "Engagement letter",
            document: engagement,
            reviewTitle: ENGAGEMENT_REVIEW,
          },
        ].map(({ title, document, reviewTitle }) => {
          const task = props.items.find((item) => item.title === reviewTitle)
          const reviewed =
            task?.status === "completed" &&
            (!document?.updatedAt ||
              (!!task.updated_at && task.updated_at >= document.updatedAt))
          const completed =
            title === "Intake questionnaire"
              ? document?.status === "received"
              : document?.status === "signed" &&
                document.signatureStatus === "signed" &&
                document.signatureCurrent
          return (
            <div
              key={title}
              className="rounded-xl border border-[#e8e3da] bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#b65f3a]" />
                <h3 className="text-sm font-semibold text-[#23313d]">
                  {title}
                </h3>
              </div>
              <p className="my-3 text-xs text-[#63747a]">
                {intakeDocumentStage(document)}
                {reviewed ? " · Reviewed" : " · Review pending"}
              </p>
              <div className="flex flex-wrap gap-2">
                {document ? (
                  <Link
                    className={buttonVariants({ size: "sm" })}
                    href={`/matters/${props.matterId}/intake/documents/${document.id}`}
                  >
                    Open document
                  </Link>
                ) : (
                  <Link
                    className={buttonVariants({ size: "sm" })}
                    href="/matterpilot?view=calendar"
                  >
                    Schedule intake
                  </Link>
                )}
                {task && !reviewed && (
                  <Button
                    size="sm"
                    disabled={
                      pending ||
                      !props.canManage ||
                      !completed ||
                      document?.draftStatus !== "final"
                    }
                    onClick={() => review(task.id)}
                  >
                    Record review
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {!props.activatedAt && (
        <div className="mt-5 grid gap-5 border-t border-[#e8e3da] pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[#23313d]">
              Attorney conflict decision
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#63747a]">
              {props.conflictReviewed
                ? "Attorney review recorded."
                : "A search result alone does not complete conflict review. Record your decision in the conflict panel, then confirm it here."}
            </p>
            {!props.conflictReviewed && (
              <>
                <label
                  className="mt-3 block text-xs font-semibold text-[#59645e]"
                  htmlFor="attorney-conflict-note"
                >
                  Review note
                </label>
                <textarea
                  id="attorney-conflict-note"
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 min-h-20 w-full rounded-lg border border-[#ded9d0] bg-white p-3 text-sm"
                />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={
                    pending ||
                    !props.canManage ||
                    !note.trim() ||
                    !["clear", "waived"].includes(props.conflictStatus)
                  }
                  onClick={() => run("review_conflicts")}
                >
                  Confirm attorney review
                </Button>
              </>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#23313d]">
              Next required actions
            </h3>
            {blockers.length ? (
              <ul className="my-3 list-disc space-y-1.5 pl-4 text-xs leading-5 text-[#63747a]">
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p className="my-3 text-sm text-emerald-700">
                All required steps are complete.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending || !props.canManage}
                onClick={() => run("prepare")}
              >
                Create review follow-ups
              </Button>
              <Button
                size="sm"
                disabled={pending || !props.canManage || !!blockers.length}
                onClick={() => run("activate")}
              >
                {pending ? <Loader2 className="animate-spin" /> : null}Activate
                matter
              </Button>
            </div>
          </div>
        </div>
      )}
      {!props.canManage && (
        <p className="mt-4 text-xs text-[#63747a]">
          An attorney or administrator completes review and activation.
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-[#23313d]">
          {message}
        </p>
      )}
    </section>
  )
}
