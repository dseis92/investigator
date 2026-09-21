"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UNCERTAINTY_STATUSES } from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"
import type { EvidenceOption } from "@/components/evidence/evidence-link-dialog"

export function AttributeFormFields({
  idPrefix,
  evidenceOptions,
  defaultKey,
  defaultValue,
  defaultStatus = "reported",
}: {
  idPrefix: string
  evidenceOptions: EvidenceOption[]
  defaultKey?: string
  defaultValue?: string
  defaultStatus?: string
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-key`}>Attribute</Label>
          <Input id={`${idPrefix}-key`} name="attribute_key" defaultValue={defaultKey} placeholder="Date of birth" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-value`}>Value</Label>
          <Input id={`${idPrefix}-value`} name="attribute_value" defaultValue={defaultValue} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-status`}>Status</Label>
          <Select name="status" defaultValue={defaultStatus}>
            <SelectTrigger id={`${idPrefix}-status`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNCERTAINTY_STATUSES.filter((s) => s !== "superseded").map((status) => (
                <SelectItem key={status} value={status}>
                  {humanizeEnum(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-evidence`}>Supporting evidence</Label>
          <Select name="evidence_id">
            <SelectTrigger id={`${idPrefix}-evidence`} className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {evidenceOptions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.evidence_number} — {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
