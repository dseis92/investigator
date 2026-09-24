"use client"

import { Download, FileArchive, LockKeyhole, RotateCcw, ShieldCheck, Upload } from "lucide-react"
import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  createEvidenceArtifactDownloadUrl,
  releaseEvidenceArtifact,
  updateEvidenceArtifactRetention,
  uploadEvidenceArtifact,
  type ArtifactActionState,
} from "@/app/matters/[matterId]/evidence/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelative } from "@/lib/format"

type Artifact = {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  sha256_hash: string | null
  created_at: string
  lifecycle_status: string
  replaces_artifact_id: string | null
  retention_until: string | null
  legal_hold: boolean
  released_at: string | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRetentionDate(value: string | null) {
  if (!value) return "No date"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function statusLabel(status: string) {
  if (status === "superseded") return "Superseded"
  if (status === "released") return "Released"
  return "Active"
}

function statusClass(status: string) {
  if (status === "superseded") return "bg-muted text-muted-foreground"
  if (status === "released") return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
}

function ArtifactRetentionControl({
  matterId,
  artifact,
  canManageRetention,
}: {
  matterId: string
  artifact: Artifact
  canManageRetention: boolean
}) {
  const router = useRouter()
  const [retentionDate, setRetentionDate] = useState(artifact.retention_until ? artifact.retention_until.slice(0, 10) : "")
  const [legalHold, setLegalHold] = useState(artifact.legal_hold)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const released = artifact.lifecycle_status === "released"
  const releaseAllowed = !released && !legalHold

  function saveRetention() {
    setMessage(null)
    startTransition(async () => {
      const result = await updateEvidenceArtifactRetention({
        matterId,
        artifactId: artifact.id,
        retentionUntil: retentionDate ? new Date(`${retentionDate}T23:59:59.999Z`).toISOString() : null,
        legalHold,
      })
      setMessage(result.ok ? "Retention settings saved." : result.error)
      if (result.ok) router.refresh()
    })
  }

  function release() {
    setMessage(null)
    startTransition(async () => {
      const result = await releaseEvidenceArtifact({ matterId, artifactId: artifact.id })
      setMessage(result.ok ? "Artifact released from retention." : result.error)
      if (result.ok) router.refresh()
    })
  }

  if (released) {
    return <p className="text-xs text-amber-700 dark:text-amber-300">Released from retention{artifact.released_at ? ` · ${formatRetentionDate(artifact.released_at)}` : ""}</p>
  }

  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block font-medium text-foreground">Retain until</span>
          <input
            type="date"
            value={retentionDate}
            onChange={(event) => setRetentionDate(event.target.value)}
            disabled={!canManageRetention || isPending}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          />
        </label>
        <label className="flex h-8 items-center gap-2 text-xs font-medium text-foreground">
          <input type="checkbox" checked={legalHold} onChange={(event) => setLegalHold(event.target.checked)} disabled={!canManageRetention || isPending} />
          Legal hold
        </label>
        <Button type="button" size="sm" variant="outline" onClick={saveRetention} disabled={!canManageRetention || isPending}>
          {isPending ? "Saving…" : "Save retention"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={release} disabled={!canManageRetention || !releaseAllowed || isPending}>
          Release
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {artifact.legal_hold ? "Held from release until the legal hold is cleared." : artifact.retention_until ? `Retained through ${formatRetentionDate(artifact.retention_until)}.` : "No retention date is set."}
        {!canManageRetention ? " Retention changes are limited to attorneys, administrators, and investigators." : ""}
      </p>
      {message ? <p className="mt-1.5 text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  )
}

export function EvidenceArtifacts({
  matterId,
  evidenceId,
  artifacts,
  canManageRetention,
}: {
  matterId: string
  evidenceId: string
  artifacts: Artifact[]
  canManageRetention: boolean
}) {
  const router = useRouter()
  const action = uploadEvidenceArtifact.bind(null, matterId, evidenceId)
  const [state, formAction, isPending] = useActionState<ArtifactActionState, FormData>(action, { error: null })
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const uploadedId = useRef<string | undefined>(undefined)
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]))

  useEffect(() => {
    if (state.artifactId && state.artifactId !== uploadedId.current) {
      uploadedId.current = state.artifactId
      router.refresh()
    }
  }, [router, state.artifactId])

  async function download(artifactId: string) {
    setDownloadError(null)
    const result = await createEvidenceArtifactDownloadUrl({ matterId, artifactId })
    if (!result.ok) {
      setDownloadError(result.error)
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm"><FileArchive className="size-4 text-primary" /> Artifact files</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Private matter storage linked to this evidence record. Uploading a file does not change its authentication status.</p>
          </div>
          <span className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:flex"><LockKeyhole className="size-3" /> Matter-scoped</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {artifacts.length ? (
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <FileArchive className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{artifact.file_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(artifact.lifecycle_status)}`}>{statusLabel(artifact.lifecycle_status)}</span>
                      {artifact.legal_hold ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"><ShieldCheck className="size-3" /> Hold</span> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBytes(artifact.size_bytes)} · {formatRelative(artifact.created_at)}{artifact.sha256_hash ? ` · SHA-256 ${artifact.sha256_hash.slice(0, 12)}…` : ""}
                      {artifact.retention_until ? ` · Retain through ${formatRetentionDate(artifact.retention_until)}` : ""}
                    </p>
                    {artifact.replaces_artifact_id ? <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><RotateCcw className="size-3" /> Replacement of {artifactById.get(artifact.replaces_artifact_id)?.file_name ?? "a prior artifact"}</p> : null}
                  </div>
                  {artifact.lifecycle_status !== "released" ? <Button type="button" size="sm" variant="outline" onClick={() => download(artifact.id)}><Download className="size-3.5" /> Download</Button> : null}
                </div>
                <ArtifactRetentionControl matterId={matterId} artifact={artifact} canManageRetention={canManageRetention} />
              </div>
            ))}
          </div>
        ) : <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">No files attached yet. Add the original artifact or a working copy here so the Evidence Ledger and the source record stay together.</p>}
        <form action={formAction} className="space-y-3 rounded-lg bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)_auto] sm:items-end">
            <div className="min-w-0">
              <label htmlFor="artifact" className="mb-1.5 block text-xs font-medium">Upload an artifact</label>
              <input id="artifact" name="artifact" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv,.doc,.docx,.xls,.xlsx" required className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground" />
              <p className="mt-1 text-[11px] text-muted-foreground">PDF, image, text, Word, or Excel · 50 MB maximum</p>
            </div>
            <label className="text-xs font-medium">
              Replacement of <span className="font-normal text-muted-foreground">(optional)</span>
              <select name="replaces_artifact_id" defaultValue="" className="mt-1.5 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground">
                <option value="">New original artifact</option>
                {artifacts.filter((artifact) => artifact.lifecycle_status !== "released").map((artifact) => <option key={artifact.id} value={artifact.id}>{artifact.file_name} · {statusLabel(artifact.lifecycle_status)}</option>)}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">The prior file stays preserved as superseded.</span>
            </label>
            <Button type="submit" disabled={isPending} className="shrink-0"><Upload className="size-3.5" />{isPending ? "Uploading…" : "Upload file"}</Button>
          </div>
          {state.replacedArtifactId ? <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">Replacement uploaded and the prior artifact was preserved.</p> : null}
        </form>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        {downloadError ? <p role="alert" className="text-sm text-destructive">{downloadError}</p> : null}
      </CardContent>
    </Card>
  )
}
