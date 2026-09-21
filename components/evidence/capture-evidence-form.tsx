"use client"

import { useActionState } from "react"

import { createEvidence, type ActionState } from "@/app/matters/[matterId]/evidence/actions"
import { AuthenticationNotice } from "@/components/evidence/authentication-notice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AUTHENTICATION_STATUSES,
  EVIDENCE_ARTIFACT_TYPES,
  IDENTITY_MATCH_STATUSES,
  SOURCE_TYPES,
  UNCERTAINTY_STATUSES,
} from "@/lib/domain"
import { humanizeEnum } from "@/lib/format"

export function CaptureEvidenceForm({ matterId }: { matterId: string }) {
  const action = createEvidence.bind(null, matterId)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null })

  return (
    <form action={formAction} className="space-y-6">
      <AuthenticationNotice />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evidence_number">Evidence ID</Label>
            <Input id="evidence_number" name="evidence_number" placeholder="EV-014" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artifact_type">Artifact type</Label>
            <Select name="artifact_type" defaultValue="document">
              <SelectTrigger id="artifact_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_ARTIFACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {humanizeEnum(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Bell Logistics timeclock export — Sept 14" required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Source &amp; provenance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="source_name">Source</Label>
            <Input id="source_name" name="source_name" placeholder="Bell Logistics HR records" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source_type">Source type</Label>
            <Select name="source_type" defaultValue="business_record">
              <SelectTrigger id="source_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {humanizeEnum(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="source_locator">Source locator</Label>
            <Input id="source_locator" name="source_locator" placeholder="Bates no., URL, file path, or exhibit #" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collector">Collector</Label>
            <Input id="collector" name="collector" placeholder="Investigator name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custodian">Custodian</Label>
            <Input id="custodian" name="custodian" placeholder="Who holds the original" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provenance_status">Provenance status</Label>
            <Select name="provenance_status" defaultValue="unknown">
              <SelectTrigger id="provenance_status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNCERTAINTY_STATUSES.filter((s) => s !== "superseded").map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanizeEnum(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identity_match_status">Identity-match status</Label>
            <Select name="identity_match_status" defaultValue="unresolved">
              <SelectTrigger id="identity_match_status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDENTITY_MATCH_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanizeEnum(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Event date</Label>
            <Input id="event_date" name="event_date" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="captured_at">Captured date</Label>
            <Input id="captured_at" name="captured_at" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="record_date">Record date</Label>
            <Input id="record_date" name="record_date" type="datetime-local" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Relevance &amp; authentication</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="relevance">Relevance</Label>
            <Select name="relevance">
              <SelectTrigger id="relevance" className="w-full">
                <SelectValue placeholder="Not yet assessed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="not_relevant">Not relevant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="authentication_status">Authentication status</Label>
            <Select name="authentication_status" defaultValue="unauthenticated">
              <SelectTrigger id="authentication_status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTHENTICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanizeEnum(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artifact_ref">Artifact reference</Label>
            <Input id="artifact_ref" name="artifact_ref" placeholder="Where the original file/object lives" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artifact_hash">Artifact hash (optional)</Label>
            <Input id="artifact_hash" name="artifact_hash" placeholder="SHA-256, if computed externally" />
          </div>
        </CardContent>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save evidence"}
      </Button>
    </form>
  )
}
