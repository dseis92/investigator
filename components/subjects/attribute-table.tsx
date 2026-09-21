"use client"

import { ChevronDown, History, Pencil, Plus } from "lucide-react"
import { useActionState, useState } from "react"

import {
  addEntityAttribute,
  supersedeAttribute,
  type ActionState,
} from "@/app/matters/[matterId]/subjects/actions"
import { AttributeFormFields } from "@/components/subjects/attribute-form-fields"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import { useCloseDialogOnSuccess } from "@/lib/hooks/use-close-on-success"
import type { EntityAttribute } from "@/lib/domain"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"

type EvidenceRef = { id: string; evidence_number: string; title: string } | null

export type AttributeWithEvidence = EntityAttribute & { evidence: EvidenceRef }

function AddAttributeDialog({
  matterId,
  subjectId,
  evidenceOptions,
}: {
  matterId: string
  subjectId: string
  evidenceOptions: EvidenceOption[]
}) {
  const [open, setOpen] = useState(false)
  const action = addEntityAttribute.bind(null, matterId, subjectId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Add attribute
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add an attribute</DialogTitle>
            <DialogDescription>Every material attribute should trace to evidence where possible.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <AttributeFormFields idPrefix="add" evidenceOptions={evidenceOptions} />
          </div>
          {state.error ? (
            <p role="alert" className="pb-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CorrectAttributeDialog({
  matterId,
  subjectId,
  attribute,
  evidenceOptions,
}: {
  matterId: string
  subjectId: string
  attribute: AttributeWithEvidence
  evidenceOptions: EvidenceOption[]
}) {
  const [open, setOpen] = useState(false)
  const action = supersedeAttribute.bind(null, matterId, subjectId, attribute.id)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })
  useCloseDialogOnSuccess(state, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="Correct this attribute">
            <Pencil />
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Correct this attribute</DialogTitle>
            <DialogDescription>
              This records a new value and marks the previous one superseded — the old value stays visible in
              history, it isn&apos;t erased.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <AttributeFormFields
              idPrefix={`correct-${attribute.id}`}
              evidenceOptions={evidenceOptions}
              defaultKey={attribute.attribute_key}
              defaultValue={attribute.attribute_value}
              defaultStatus={attribute.status}
            />
          </div>
          {state.error ? (
            <p role="alert" className="pb-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AttributeGroupRow({
  matterId,
  subjectId,
  current,
  history,
  evidenceOptions,
}: {
  matterId: string
  subjectId: string
  current: AttributeWithEvidence
  history: AttributeWithEvidence[]
  evidenceOptions: EvidenceOption[]
}) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{current.attribute_key}</p>
          <p className="text-sm">{current.attribute_value}</p>
          {current.evidence ? (
            <p className="text-xs text-muted-foreground">
              Evidence: {current.evidence.evidence_number} — {current.evidence.title}
            </p>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-400">No evidence linked</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={current.status} />
          <CorrectAttributeDialog matterId={matterId} subjectId={subjectId} attribute={current} evidenceOptions={evidenceOptions} />
        </div>
      </div>

      {history.length > 0 ? (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <History className="size-3" />
            {history.length} prior value{history.length === 1 ? "" : "s"}
            <ChevronDown className={`size-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory ? (
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-muted-foreground">
                  <span className="line-through">{h.attribute_value}</span> · {formatDate(h.created_at)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function AttributeTable({
  matterId,
  subjectId,
  attributes,
  evidenceOptions,
}: {
  matterId: string
  subjectId: string
  attributes: AttributeWithEvidence[]
  evidenceOptions: EvidenceOption[]
}) {
  const groups = new Map<string, AttributeWithEvidence[]>()
  for (const attr of attributes) {
    const list = groups.get(attr.attribute_key) ?? []
    list.push(attr)
    groups.set(attr.attribute_key, list)
  }

  const rows = Array.from(groups.entries()).map(([key, items]) => {
    const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const current = sorted.find((a) => a.status !== "superseded") ?? sorted[0]
    const history = sorted.filter((a) => a.id !== current.id)
    return { key, current, history }
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Attributes</p>
        <AddAttributeDialog matterId={matterId} subjectId={subjectId} evidenceOptions={evidenceOptions} />
      </div>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <AttributeGroupRow
              key={row.key}
              matterId={matterId}
              subjectId={subjectId}
              current={row.current}
              history={row.history}
              evidenceOptions={evidenceOptions}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No attributes recorded yet.</p>
      )}
    </div>
  )
}
