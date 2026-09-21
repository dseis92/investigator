import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  History,
  Lightbulb,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { humanizeEnum } from "@/lib/format"

/**
 * One shared visual vocabulary for every uncertainty/classification label in
 * the app (evidence provenance, entity attributes, statements, events, and
 * analysis conclusions). Each status gets both a distinct color AND a
 * distinct icon so the distinction survives black-and-white print output,
 * not just color — required for the printable Proposition Evidence Matrix.
 */
const STATUS_STYLES: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    className: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  verified_fact: {
    label: "Verified fact",
    icon: CheckCircle2,
    className: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  reported: {
    label: "Reported",
    icon: MessageSquareQuote,
    className: "border-sky-600/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  source_reported_assertion: {
    label: "Source-reported assertion",
    icon: MessageSquareQuote,
    className: "border-sky-600/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  inferred: {
    label: "Inferred",
    icon: Lightbulb,
    className: "border-violet-600/30 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  },
  analyst_inference: {
    label: "Analyst inference",
    icon: Lightbulb,
    className: "border-violet-600/30 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  },
  hypothesis: {
    label: "Hypothesis",
    icon: Lightbulb,
    className:
      "border-indigo-600/30 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-dashed",
  },
  disputed: {
    label: "Disputed",
    icon: AlertTriangle,
    className: "border-amber-600/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    className: "border-border bg-muted text-muted-foreground",
  },
  superseded: {
    label: "Superseded",
    icon: History,
    className: "border-border bg-muted text-muted-foreground line-through decoration-1",
  },
  excluded: {
    label: "Excluded",
    icon: CircleSlash,
    className: "border-border bg-muted text-muted-foreground line-through decoration-1",
  },
  authenticated: {
    label: "Authenticated",
    icon: ShieldCheck,
    className: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  stipulated: {
    label: "Stipulated",
    icon: ShieldCheck,
    className: "border-sky-600/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  unauthenticated: {
    label: "Unauthenticated",
    icon: HelpCircle,
    className: "border-border bg-muted text-muted-foreground",
  },
  not_applicable: {
    label: "Not applicable",
    icon: CircleSlash,
    className: "border-border bg-muted text-muted-foreground",
  },
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const style = status ? STATUS_STYLES[status] : undefined

  if (!style) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className
        )}
      >
        {humanizeEnum(status) ?? "—"}
      </span>
    )
  }

  const Icon = style.icon

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap print:border-black",
        style.className,
        className
      )}
    >
      <Icon className="size-3 shrink-0" />
      {style.label}
    </span>
  )
}
