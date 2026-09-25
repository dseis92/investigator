"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  CopyPlus,
  Clock3,
  ExternalLink,
  FileText,
  Gavel,
  Globe2,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  Workflow,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { BackToDashboard } from "@/components/matterpilot/back-to-dashboard"
import { saveUserPreferencesAction } from "@/app/matterpilot/settings-actions"
import { Input } from "@/components/ui/input"
import { parseCustomWorkflows, type CustomWorkflow } from "@/lib/matterpilot/customizations"
import { cn } from "@/lib/utils"

type SectionId =
  | "profile"
  | "firm"
  | "team"
  | "appearance"
  | "calendar"
  | "workflows"
  | "matters"
  | "intake"
  | "documents"
  | "communications"
  | "portal"
  | "integrations"
  | "security"
  | "billing"

type SettingsState = {
  fullName: string
  title: string
  signature: string
  firmName: string
  defaultJurisdiction: string
  matterNumberFormat: string
  defaultMatterStatus: string
  theme: "paper" | "slate" | "high-contrast"
  density: "comfortable" | "compact"
  startPage: "overview" | "calendar" | "matters"
  showReadiness: boolean
  showCounts: boolean
  timezone: string
  weekStartsOn: "monday" | "sunday"
  defaultDuration: string
  bufferMinutes: string
  minimumNotice: string
  publicBooking: boolean
  reminder24Hours: boolean
  reminder2Hours: boolean
  requireConflictReview: boolean
  conflictSensitivity: "balanced" | "broad" | "strict"
  allowNewClientIntake: boolean
  autoAcknowledgeIntake: boolean
  engagementTemplate: string
  intakeTemplate: string
  documentVisibility: "internal" | "client"
  requireSignature: boolean
  namingConvention: string
  emailNotifications: boolean
  inAppNotifications: boolean
  deadlineAlerts: boolean
  readinessAlerts: boolean
  quietHours: boolean
  portalBranding: boolean
  portalUploads: boolean
  portalLinkExpiration: string
  portalMessageAlerts: boolean
  loginAlerts: boolean
  mfaRequired: boolean
  sessionTimeout: string
  auditRetention: string
  customWorkflows: CustomWorkflow[]
}

const defaultSettings: SettingsState = {
  fullName: "Maya Chen",
  title: "Attorney",
  signature: "Maya Chen\nAttorney · Harbor Legal",
  firmName: "Harbor Legal",
  defaultJurisdiction: "Illinois",
  matterNumberFormat: "{YEAR}-{SEQUENCE}",
  defaultMatterStatus: "Active",
  theme: "paper",
  density: "comfortable",
  startPage: "overview",
  showReadiness: true,
  showCounts: true,
  timezone: "America/Chicago",
  weekStartsOn: "monday",
  defaultDuration: "60",
  bufferMinutes: "15",
  minimumNotice: "24",
  publicBooking: true,
  reminder24Hours: true,
  reminder2Hours: true,
  requireConflictReview: true,
  conflictSensitivity: "balanced",
  allowNewClientIntake: true,
  autoAcknowledgeIntake: true,
  engagementTemplate: "Standard engagement letter",
  intakeTemplate: "New client intake questionnaire",
  documentVisibility: "internal",
  requireSignature: true,
  namingConvention: "{MATTER_NUMBER} · {DOCUMENT_NAME}",
  emailNotifications: true,
  inAppNotifications: true,
  deadlineAlerts: true,
  readinessAlerts: true,
  quietHours: false,
  portalBranding: true,
  portalUploads: true,
  portalLinkExpiration: "30",
  portalMessageAlerts: true,
  loginAlerts: true,
  mfaRequired: false,
  sessionTimeout: "8",
  auditRetention: "7",
  customWorkflows: [],
}

const categories: { id: SectionId; label: string; description: string; group: string; icon: typeof Settings2 }[] = [
  { id: "profile", label: "My profile", description: "Your identity, signature, and personal defaults.", group: "Personal", icon: UserRound },
  { id: "appearance", label: "Appearance & dashboard", description: "Make the command desk feel like yours.", group: "Personal", icon: Palette },
  { id: "firm", label: "Firm & workspace", description: "Branding, jurisdiction, and firm-wide defaults.", group: "Workspace", icon: BriefcaseBusiness },
  { id: "team", label: "Team, roles & permissions", description: "Control who can see and change firm data.", group: "Workspace", icon: UsersRound },
  { id: "matters", label: "Matter defaults", description: "Statuses, numbering, practice areas, and ownership.", group: "Workflow", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar & booking", description: "Availability, reminders, buffers, and booking rules.", group: "Workflow", icon: CalendarDays },
  { id: "workflows", label: "Workflow studio", description: "Build firm-specific appointment and preparation flows.", group: "Workflow", icon: Workflow },
  { id: "intake", label: "Intake & conflicts", description: "Shape new-client intake and conflict review.", group: "Workflow", icon: ShieldCheck },
  { id: "documents", label: "Documents & templates", description: "Set defaults for letters, packets, and signatures.", group: "Workflow", icon: FileText },
  { id: "communications", label: "Notifications & email", description: "Decide what gets sent, when, and to whom.", group: "Client experience", icon: Bell },
  { id: "portal", label: "Client portal", description: "Tune the secure client handoff and uploads.", group: "Client experience", icon: LockKeyhole },
  { id: "integrations", label: "Integrations", description: "Connect calendars, AI, email, and other tools.", group: "Administration", icon: Globe2 },
  { id: "security", label: "Security & audit", description: "Protect the workspace and review account activity.", group: "Administration", icon: KeyRound },
  { id: "billing", label: "Billing & plan", description: "Subscription, invoicing, and payment defaults.", group: "Administration", icon: WalletCards },
]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors", checked ? "border-[#b65f3a] bg-[#b65f3a]" : "border-[#cfc8bd] bg-[#e8e3da]")}
    >
      <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  )
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#eee8df] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold text-[#35433e]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[#8b8d88]">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="border-[#ded9d0] bg-white" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-[#ded9d0] bg-white px-3 text-sm text-[#35433e] outline-none transition-colors focus:border-[#b65f3a]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function Card({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] shadow-sm"><div className="border-b border-[#e8e3da] px-5 py-5 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">{eyebrow}</p><h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.02em] text-[#23313d]">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#8b8d88]">{description}</p></div><div className="px-5 pb-5 sm:px-7">{children}</div></section>
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "neutral" | "soon" }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", tone === "good" ? "bg-emerald-50 text-emerald-700" : tone === "soon" ? "bg-amber-50 text-amber-800" : "bg-[#f1eee8] text-[#737872]")}>{children}</span>
}

type WorkflowDraft = {
  label: string
  tag: string
  durationMinutes: string
  defaultTitle: string
  defaultLocation: string
  tasks: string
  documents: string
}

const emptyWorkflowDraft: WorkflowDraft = {
  label: "",
  tag: "Firm workflow",
  durationMinutes: "60",
  defaultTitle: "",
  defaultLocation: "To be confirmed",
  tasks: "",
  documents: "",
}

function WorkflowStudio({ workflows, onChange }: { workflows: CustomWorkflow[]; onChange: (workflows: CustomWorkflow[]) => void }) {
  const [draft, setDraft] = useState<WorkflowDraft>(emptyWorkflowDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftError, setDraftError] = useState("")

  function edit(workflow: CustomWorkflow) {
    setEditingId(workflow.id)
    setDraft({ label: workflow.label, tag: workflow.tag, durationMinutes: String(workflow.durationMinutes), defaultTitle: workflow.defaultTitle, defaultLocation: workflow.defaultLocation, tasks: workflow.tasks.join("\n"), documents: workflow.documents.join("\n") })
    setDraftError("")
  }

  function resetDraft() {
    setEditingId(null)
    setDraft(emptyWorkflowDraft)
    setDraftError("")
  }

  function saveDraft() {
    const label = draft.label.trim()
    const durationMinutes = Number(draft.durationMinutes)
    if (!label || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      setDraftError("Add a workflow name and a duration between 5 and 480 minutes.")
      return
    }
    const next: CustomWorkflow = {
      id: editingId ?? `custom-${crypto.randomUUID()}`,
      label,
      tag: draft.tag.trim() || "Firm workflow",
      durationMinutes,
      defaultTitle: draft.defaultTitle.trim() || label,
      defaultLocation: draft.defaultLocation.trim() || "To be confirmed",
      tasks: draft.tasks.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 20),
      documents: draft.documents.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 20),
      active: editingId ? workflows.find((workflow) => workflow.id === editingId)?.active !== false : true,
    }
    onChange(editingId ? workflows.map((workflow) => workflow.id === editingId ? next : workflow) : [...workflows, next])
    resetDraft()
  }

  function duplicate(workflow: CustomWorkflow) {
    onChange([...workflows, { ...workflow, id: `custom-${crypto.randomUUID()}`, label: `${workflow.label} copy`, defaultTitle: `${workflow.defaultTitle} copy` }])
  }

  return <div className="space-y-6">
    <div className="rounded-xl border border-[#d8c7bb] bg-[#fffaf6] p-4 text-xs leading-5 text-[#8b6f60]"><strong className="text-[#6f4f3c]">Built-in workflows stay available.</strong> Add your own without changing the premade MatterPilot options. Custom workflows appear in the appointment dropdown and create the tasks and document requests you define.</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <div className="rounded-xl border border-[#e8e3da] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b604c]">Custom appointment workflow</p><h3 className="mt-1 font-serif text-xl font-semibold text-[#23313d]">{editingId ? "Tune this workflow" : "Add a workflow"}</h3><p className="mt-1 text-xs leading-5 text-[#8b8d88]">One line per preparation task or requested document.</p></div>{editingId ? <Button size="sm" variant="ghost" onClick={resetDraft}>Cancel</Button> : null}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Workflow name" value={draft.label} onChange={(value) => setDraft((current) => ({ ...current, label: value }))} placeholder="Arraignment preparation" />
          <Field label="Category tag" value={draft.tag} onChange={(value) => setDraft((current) => ({ ...current, tag: value }))} placeholder="Criminal defense" />
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">Duration in minutes</span><input type="number" min="5" max="480" value={draft.durationMinutes} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))} className="h-9 w-full rounded-lg border border-[#ded9d0] bg-white px-3 text-sm outline-none focus:border-[#b65f3a]" /></label>
          <Field label="Default location" value={draft.defaultLocation} onChange={(value) => setDraft((current) => ({ ...current, defaultLocation: value }))} placeholder="Courtroom 4B" />
          <div className="sm:col-span-2"><Field label="Default appointment title" value={draft.defaultTitle} onChange={(value) => setDraft((current) => ({ ...current, defaultTitle: value }))} placeholder="Arraignment preparation" /></div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">Preparation tasks</span><textarea value={draft.tasks} onChange={(event) => setDraft((current) => ({ ...current, tasks: event.target.value }))} className="min-h-28 w-full rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm outline-none focus:border-[#b65f3a]" placeholder="Review charging document\nPrepare client questions\nConfirm courtroom logistics" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">Document requests</span><textarea value={draft.documents} onChange={(event) => setDraft((current) => ({ ...current, documents: event.target.value }))} className="min-h-28 w-full rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm outline-none focus:border-[#b65f3a]" placeholder="Charging document\nCourt notice\nPreparation outline" /></label>
        </div>
        {draftError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{draftError}</p> : null}
        <Button onClick={saveDraft} className="mt-4 bg-[#b65f3a] hover:bg-[#9f5030]">{editingId ? "Save workflow" : "Add workflow"} <Plus /></Button>
      </div>
      <div className="space-y-2">
        {workflows.length ? workflows.map((workflow) => <div key={workflow.id} className={cn("rounded-xl border bg-[#fbfaf7] p-4", workflow.active ? "border-[#e2d7cd]" : "border-[#e8e3da] opacity-65")}><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e5db] text-[#a24f31]"><Workflow className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#39443f]">{workflow.label}</p><StatusPill tone={workflow.active ? "good" : "neutral"}>{workflow.active ? "Active" : "Hidden"}</StatusPill></div><p className="mt-1 text-[11px] text-[#8b8d88]">{workflow.tag} · {workflow.durationMinutes} min · {workflow.tasks.length} tasks · {workflow.documents.length} documents</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => edit(workflow)} className="border-[#ded9d0] px-2.5 text-[11px]"><Pencil /> Edit</Button><Button size="sm" variant="outline" onClick={() => duplicate(workflow)} className="border-[#ded9d0] px-2.5 text-[11px]"><CopyPlus /> Duplicate</Button><Button size="sm" variant="ghost" onClick={() => onChange(workflows.map((item) => item.id === workflow.id ? { ...item, active: !item.active } : item))} className="px-2.5 text-[11px] text-[#a24f31]">{workflow.active ? "Hide" : "Show"}</Button><Button size="sm" variant="ghost" onClick={() => onChange(workflows.filter((item) => item.id !== workflow.id))} className="px-2.5 text-[11px] text-rose-700"><Trash2 /> Delete</Button></div></div>) : <div className="rounded-xl border border-dashed border-[#d8d1c6] bg-[#fbfaf7] px-4 py-8 text-center"><Workflow className="mx-auto size-6 text-[#c8b6a8]" /><p className="mt-3 text-sm font-semibold text-[#4d5851]">No custom workflows yet.</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Add the first firm-specific workflow on the left.</p></div>}
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><Link href="/matterpilot/operations#recurring-work" className="rounded-xl border border-[#e8e3da] bg-white p-4 transition-colors hover:border-[#c08a6d]"><Clock3 className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Recurring work templates</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Create matter-specific repeating work, choose cadence, and materialize it onto appointments.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#a24f31]">Open Operations <ExternalLink className="size-3.5" /></span></Link><Link href="/matterpilot/operations#court-rules" className="rounded-xl border border-[#e8e3da] bg-white p-4 transition-colors hover:border-[#c08a6d]"><Gavel className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Court-rule recipes</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Keep the verified built-ins and add firm-specific jurisdiction rules with human review before saving dates.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#a24f31]">Open Operations <ExternalLink className="size-3.5" /></span></Link></div>
  </div>
}

export function SettingsCenter({ userEmail, initialPreferences }: { userEmail: string; initialPreferences: Record<string, unknown> }) {
  const [section, setSection] = useState<SectionId>("profile")
  const [search, setSearch] = useState("")
  const [settings, setSettings] = useState<SettingsState>(() => ({ ...defaultSettings, ...initialPreferences, customWorkflows: parseCustomWorkflows(initialPreferences.customWorkflows) } as SettingsState))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()
    return categories.filter((item) => !query || `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query))
  }, [search])

  const groupedCategories = useMemo(() => filteredCategories.reduce<Record<string, typeof categories>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item]
    return groups
  }, {}), [filteredCategories])

  const current = categories.find((item) => item.id === section) ?? categories[0]

  function update<Key extends keyof SettingsState>(key: Key, value: SettingsState[Key]) {
    setSaved(false)
    setError("")
    setSettings((currentSettings) => ({ ...currentSettings, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError("")
    const result = await saveUserPreferencesAction(settings)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2400)
  }

  function reset() {
    setSettings(defaultSettings)
    setSaved(false)
    setError("")
  }

  function renderSection() {
    switch (section) {
      case "profile":
        return <div className="space-y-6"><Card eyebrow="Personal settings" title="Your profile" description="Control the identity MatterPilot uses for internal assignments, client communications, and document signatures."><div className="grid gap-4 py-5 sm:grid-cols-2"><Field label="Full name" value={settings.fullName} onChange={(value) => update("fullName", value)} /><Field label="Role or title" value={settings.title} onChange={(value) => update("title", value)} /><Field label="Account email" value={userEmail} onChange={() => undefined} /><Field label="Time zone" value={settings.timezone} onChange={(value) => update("timezone", value)} /></div><label className="block border-t border-[#eee8df] pt-5"><span className="mb-1.5 block text-xs font-semibold text-[#59645e]">Default email signature</span><textarea value={settings.signature} onChange={(event) => update("signature", event.target.value)} className="min-h-24 w-full rounded-lg border border-[#ded9d0] bg-white px-3 py-2 text-sm text-[#35433e] outline-none transition-colors focus:border-[#b65f3a]" /></label></Card><Card eyebrow="Personal defaults" title="How MatterPilot opens for you" description="Give each user a starting point that matches the work they do most often."><SettingRow label="Start page" description="Choose where MatterPilot lands after sign-in."><select value={settings.startPage} onChange={(event) => update("startPage", event.target.value as SettingsState["startPage"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="overview">Command desk</option><option value="calendar">Full calendar</option><option value="matters">Matters</option></select></SettingRow><SettingRow label="Week begins on" description="Used by calendar and date pickers."><select value={settings.weekStartsOn} onChange={(event) => update("weekStartsOn", event.target.value as SettingsState["weekStartsOn"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="monday">Monday</option><option value="sunday">Sunday</option></select></SettingRow></Card></div>
      case "firm":
        return <div className="space-y-6"><Card eyebrow="Workspace settings" title="Firm identity" description="These details become the source of truth for booking pages, client-facing documents, and firm communications."><div className="grid gap-4 py-5 sm:grid-cols-2"><Field label="Firm name" value={settings.firmName} onChange={(value) => update("firmName", value)} /><Field label="Default jurisdiction" value={settings.defaultJurisdiction} onChange={(value) => update("defaultJurisdiction", value)} /><Field label="Website" value="matterpilot.app" onChange={() => undefined} /><Field label="Default time zone" value={settings.timezone} onChange={(value) => update("timezone", value)} /></div><div className="mt-1 rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4 text-xs leading-5 text-[#8b6f60]"><strong className="text-[#6f4f3c]">Brand kit:</strong> Logo upload, firm colors, letterhead, and default footer are ready to become the next firm-wide customization layer.</div></Card><Card eyebrow="Regional defaults" title="Locale & formatting" description="Set the defaults that keep dates, money, and generated records consistent across the firm."><div className="grid gap-4 py-5 sm:grid-cols-3"><SelectField label="Date format" value="mdy" onChange={() => undefined} options={[{ label: "MM/DD/YYYY", value: "mdy" }, { label: "DD/MM/YYYY", value: "dmy" }, { label: "YYYY-MM-DD", value: "iso" }]} /><SelectField label="Currency" value="usd" onChange={() => undefined} options={[{ label: "USD · US Dollar", value: "usd" }, { label: "CAD · Canadian Dollar", value: "cad" }]} /><SelectField label="Language" value="en" onChange={() => undefined} options={[{ label: "English", value: "en" }, { label: "Spanish · Coming soon", value: "es" }]} /></div></Card></div>
      case "team":
        return <div className="space-y-6"><Card eyebrow="Access control" title="Team, roles & permissions" description="Use least-privilege roles while keeping matter access flexible for attorneys, investigators, paralegals, and support staff."><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8df] py-5"><div><p className="text-sm font-semibold text-[#35433e]">Team directory</p><p className="mt-1 text-xs text-[#8b8d88]">Invite users, deactivate accounts, and assign matter access.</p></div><Button size="sm" onClick={() => undefined}><UsersRound /> Manage team</Button></div><SettingRow label="Default new-user role" description="Applied when an invitation is created."><select className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option>Paralegal</option><option>Investigator</option><option>Attorney</option><option>Support</option></select></SettingRow><SettingRow label="Matter visibility" description="Choose whether new matters start private to their assigned team or visible firm-wide."><select className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option>Assigned team only</option><option>Entire firm</option><option>Ask when creating</option></select></SettingRow><SettingRow label="Custom roles" description="Create role templates with granular permissions for billing, reports, audit activity, and client communications."><StatusPill tone="soon">Planned next</StatusPill></SettingRow></Card><Card eyebrow="Permission design" title="Recommended role boundaries" description="A useful starting point for a small firm. Customize these when granular permissions are enabled."><div className="grid gap-3 py-5 sm:grid-cols-2"><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Attorney / administrator</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Firm settings, matter management, reports, billing, integrations, and audit review.</p></div><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Investigator</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Assigned matters, evidence, timeline, subjects, contradictions, and preparation work.</p></div><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Paralegal</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Assigned matters, intake, documents, scheduling, tasks, and client follow-up.</p></div><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Billing / operations</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Time, invoices, payment status, calendar operations, and firm activity without case theory access.</p></div></div></Card></div>
      case "appearance":
        return <div className="space-y-6"><Card eyebrow="Personal settings" title="Make the command desk yours" description="Choose a visual rhythm that fits how you work without changing the firm’s client-facing brand."><SettingRow label="Theme" description="Paper is the default MatterPilot workspace. Slate and high contrast are useful alternatives."><select value={settings.theme} onChange={(event) => update("theme", event.target.value as SettingsState["theme"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="paper">Warm paper</option><option value="slate">Slate</option><option value="high-contrast">High contrast</option></select></SettingRow><SettingRow label="Information density" description="Control how much data is visible in tables, lists, and the calendar."><select value={settings.density} onChange={(event) => update("density", event.target.value as SettingsState["density"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></SettingRow><SettingRow label="Show readiness counts" description="Keep ready, at-risk, and blocked appointment totals visible on the command desk."><Toggle checked={settings.showReadiness} onChange={(value) => update("showReadiness", value)} label="Show readiness counts" /></SettingRow><SettingRow label="Show navigation counts" description="Show open task, queued communication, deadline, and portal counts in the sidebar."><Toggle checked={settings.showCounts} onChange={(value) => update("showCounts", value)} label="Show navigation counts" /></SettingRow></Card></div>
      case "calendar":
        return <div className="space-y-6"><Card eyebrow="Scheduling defaults" title="Calendar & booking" description="Set the rules that make public booking predictable and keep attorney time protected."><div className="grid gap-4 py-5 sm:grid-cols-3"><SelectField label="Default appointment length" value={settings.defaultDuration} onChange={(value) => update("defaultDuration", value)} options={[{ label: "30 minutes", value: "30" }, { label: "45 minutes", value: "45" }, { label: "60 minutes", value: "60" }, { label: "90 minutes", value: "90" }]} /><SelectField label="Buffer between meetings" value={settings.bufferMinutes} onChange={(value) => update("bufferMinutes", value)} options={[{ label: "No buffer", value: "0" }, { label: "15 minutes", value: "15" }, { label: "30 minutes", value: "30" }]} /><SelectField label="Minimum booking notice" value={settings.minimumNotice} onChange={(value) => update("minimumNotice", value)} options={[{ label: "2 hours", value: "2" }, { label: "24 hours", value: "24" }, { label: "48 hours", value: "48" }, { label: "1 week", value: "168" }]} /></div><SettingRow label="Public booking page" description="Allow prospective clients to request an intake appointment through your booking link."><Toggle checked={settings.publicBooking} onChange={(value) => update("publicBooking", value)} label="Public booking page" /></SettingRow><SettingRow label="24-hour reminder" description="Send the standard reminder before an appointment begins."><Toggle checked={settings.reminder24Hours} onChange={(value) => update("reminder24Hours", value)} label="24-hour reminder" /></SettingRow><SettingRow label="2-hour reminder" description="Add a short-window reminder for appointments that need a final readiness check."><Toggle checked={settings.reminder2Hours} onChange={(value) => update("reminder2Hours", value)} label="2-hour reminder" /></SettingRow></Card><Card eyebrow="Calendar connections" title="External calendars" description="Connect Google Calendar or Microsoft Outlook so firm availability and MatterPilot appointments stay aligned."><div className="grid gap-3 py-5 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f1eee8] text-[#a24f31]">G</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Google Calendar</span><span className="mt-1 block text-xs text-[#8b8d88]">Connect calendars and sync busy time.</span></span><StatusPill tone="soon">Manage in Operations</StatusPill></div><div className="flex items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] text-[#385367]">O</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Outlook Calendar</span><span className="mt-1 block text-xs text-[#8b8d88]">Connect Microsoft 365 availability.</span></span><StatusPill tone="soon">Manage in Operations</StatusPill></div></div><Link href="/matterpilot/operations#calendar" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a24f31] hover:underline">Open calendar operations <ExternalLink className="size-3.5" /></Link></Card></div>
      case "workflows":
        return <div className="space-y-6"><Card eyebrow="Firm customization" title="Workflow studio" description="Keep MatterPilot’s tested legal workflows, then add the way your firm actually prepares, meets, and follows up."><WorkflowStudio workflows={settings.customWorkflows} onChange={(workflows) => update("customWorkflows", workflows)} /></Card><Card eyebrow="Matter defaults" title="Starter behavior" description="These existing matter defaults continue to shape new workspaces alongside your custom appointment workflows."><div className="grid gap-4 sm:grid-cols-3"><Field label="Matter number format" value={settings.matterNumberFormat} onChange={(value) => update("matterNumberFormat", value)} /><SelectField label="Default status" value={settings.defaultMatterStatus} onChange={(value) => update("defaultMatterStatus", value)} options={[{ label: "Active", value: "Active" }, { label: "Intake", value: "Intake" }, { label: "Pending", value: "Pending" }]} /><Field label="Default jurisdiction" value={settings.defaultJurisdiction} onChange={(value) => update("defaultJurisdiction", value)} /></div></Card></div>
      case "matters":
        return <div className="space-y-6"><Card eyebrow="Matter defaults" title="Create matters your way" description="These defaults reduce repetitive decisions when a new matter is opened."><div className="grid gap-4 py-5 sm:grid-cols-2"><Field label="Matter number format" value={settings.matterNumberFormat} onChange={(value) => update("matterNumberFormat", value)} /><SelectField label="Default matter status" value={settings.defaultMatterStatus} onChange={(value) => update("defaultMatterStatus", value)} options={[{ label: "Active", value: "Active" }, { label: "Intake", value: "Intake" }, { label: "Pending", value: "Pending" }]} /><SelectField label="Default owner" value="me" onChange={() => undefined} options={[{ label: "Me · Maya Chen", value: "me" }, { label: "Ask every time", value: "ask" }]} /><SelectField label="Default case mode" value="investigation" onChange={() => undefined} options={[{ label: "Investigation", value: "investigation" }, { label: "Litigation", value: "litigation" }, { label: "General", value: "general" }]} /></div><SettingRow label="Auto-create readiness workflow" description="Start new intake matters with the standard questionnaire, engagement letter, and conflict review tasks."><Toggle checked={true} onChange={() => undefined} label="Auto-create readiness workflow" /></SettingRow></Card><Card eyebrow="Matter structure" title="Practice areas & custom fields" description="Shape your workspace around the areas of law and intake data your firm actually uses."><div className="grid gap-3 py-5 sm:grid-cols-3"><div className="rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4"><p className="text-sm font-semibold">Practice areas</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Personal injury, criminal defense, family law, immigration, and more.</p></div><div className="rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4"><p className="text-sm font-semibold">Custom fields</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Add firm-specific matter and contact fields.</p></div><div className="rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4"><p className="text-sm font-semibold">Matter templates</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Start each matter with the right tasks, documents, and deadlines.</p></div></div><StatusPill tone="soon">Admin tools planned next</StatusPill></Card></div>
      case "intake":
        return <div className="space-y-6"><Card eyebrow="New-client workflow" title="Intake & conflict checks" description="Make the first contact consistent, safe, and easy for the team to review."><SettingRow label="Require conflict review before confirmation" description="Keep every public booking in a review queue until the firm clears it."><Toggle checked={settings.requireConflictReview} onChange={(value) => update("requireConflictReview", value)} label="Require conflict review" /></SettingRow><SettingRow label="Conflict match sensitivity" description="Balanced is the recommended default. Broad catches more possible matches; strict reduces noise."><select value={settings.conflictSensitivity} onChange={(event) => update("conflictSensitivity", event.target.value as SettingsState["conflictSensitivity"])} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="balanced">Balanced</option><option value="broad">Broad</option><option value="strict">Strict</option></select></SettingRow><SettingRow label="Allow intake before a matter exists" description="Capture a new client’s request first, then create or associate a matter during review."><Toggle checked={settings.allowNewClientIntake} onChange={(value) => update("allowNewClientIntake", value)} label="Allow intake without matter" /></SettingRow><SettingRow label="Automatic acknowledgement" description="Send a polite receipt when a prospective client submits the public intake form."><Toggle checked={settings.autoAcknowledgeIntake} onChange={(value) => update("autoAcknowledgeIntake", value)} label="Automatic acknowledgement" /></SettingRow></Card><Card eyebrow="Intake design" title="Questionnaire controls" description="Choose which questions are required and which client-facing language the firm uses."><div className="grid gap-3 py-5 sm:grid-cols-2"><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Required fields</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Name, email, opposing parties, incident date, and a plain-language summary.</p></div><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><p className="text-sm font-semibold">Conflict language</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Explain that submission does not create an attorney-client relationship.</p></div></div><Button size="sm" variant="outline" onClick={() => undefined}>Edit intake questions <ChevronRight /></Button></Card></div>
      case "documents":
        return <div className="space-y-6"><Card eyebrow="Document defaults" title="Documents & templates" description="Set the defaults behind ready-made intake questionnaires, engagement letters, requests, and appointment packets."><div className="grid gap-4 py-5 sm:grid-cols-2"><SelectField label="Default intake questionnaire" value={settings.intakeTemplate} onChange={(value) => update("intakeTemplate", value)} options={[{ label: "New client intake questionnaire", value: "New client intake questionnaire" }, { label: "Criminal defense intake", value: "Criminal defense intake" }, { label: "Personal injury intake", value: "Personal injury intake" }]} /><SelectField label="Default engagement letter" value={settings.engagementTemplate} onChange={(value) => update("engagementTemplate", value)} options={[{ label: "Standard engagement letter", value: "Standard engagement letter" }, { label: "Limited-scope engagement", value: "Limited-scope engagement" }, { label: "Contingency engagement", value: "Contingency engagement" }]} /><SelectField label="New document visibility" value={settings.documentVisibility} onChange={(value) => update("documentVisibility", value as SettingsState["documentVisibility"])} options={[{ label: "Internal draft", value: "internal" }, { label: "Client-visible draft", value: "client" }]} /><Field label="File naming convention" value={settings.namingConvention} onChange={(value) => update("namingConvention", value)} /></div><SettingRow label="Require signature for engagement letter" description="Keep the readiness check blocked until the engagement letter is signed or waived."><Toggle checked={settings.requireSignature} onChange={(value) => update("requireSignature", value)} label="Require engagement signature" /></SettingRow></Card><Card eyebrow="Template library" title="Reusable firm documents" description="Keep the documents your team uses repeatedly in one place, with version history and client-visibility controls."><div className="space-y-2 py-5"><div className="flex items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><FileText className="size-5 text-[#a24f31]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Engagement letter</span><span className="mt-1 block text-xs text-[#8b8d88]">Ready-made · client-facing · signature enabled</span></span><StatusPill tone="good">Active</StatusPill></div><div className="flex items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><FileText className="size-5 text-[#a24f31]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Intake questionnaire</span><span className="mt-1 block text-xs text-[#8b8d88]">Ready-made · client-facing · required on intake</span></span><StatusPill tone="good">Active</StatusPill></div></div><StatusPill tone="soon">Template editor planned next</StatusPill></Card></div>
      case "communications":
        return <div className="space-y-6"><Card eyebrow="Notifications" title="Keep the right work visible" description="Choose which updates appear in MatterPilot and which ones reach the team by email."><SettingRow label="Email notifications" description="Send operational updates, client replies, and assignment changes to your account email."><Toggle checked={settings.emailNotifications} onChange={(value) => update("emailNotifications", value)} label="Email notifications" /></SettingRow><SettingRow label="In-app notifications" description="Keep the notification queue visible in Operations."><Toggle checked={settings.inAppNotifications} onChange={(value) => update("inAppNotifications", value)} label="In-app notifications" /></SettingRow><SettingRow label="Deadline alerts" description="Alert owners when court, filing, discovery, or client deadlines approach or are missed."><Toggle checked={settings.deadlineAlerts} onChange={(value) => update("deadlineAlerts", value)} label="Deadline alerts" /></SettingRow><SettingRow label="Readiness alerts" description="Alert the assigned team when a preparation task blocks an upcoming appointment."><Toggle checked={settings.readinessAlerts} onChange={(value) => update("readinessAlerts", value)} label="Readiness alerts" /></SettingRow><SettingRow label="Quiet hours" description="Pause non-urgent notifications during your personal hours."><Toggle checked={settings.quietHours} onChange={(value) => update("quietHours", value)} label="Quiet hours" /></SettingRow></Card><Card eyebrow="Message defaults" title="Email & SMS behavior" description="These controls will become the place to manage sender identity, signature, templates, and delivery channels."><div className="rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4 text-xs leading-5 text-[#8b6f60]"><Mail className="mb-2 size-4 text-[#a24f31]" /><strong className="text-[#6f4f3c]">Recommended setup:</strong> use a verified firm address for outbound client messages, keep an attorney signature separate from automated reminders, and require review before sending sensitive communications.</div><Link href="/matterpilot/operations#notifications" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a24f31] hover:underline">Open notification operations <ExternalLink className="size-3.5" /></Link></Card></div>
      case "portal":
        return <div className="space-y-6"><Card eyebrow="Client experience" title="Client portal" description="Decide how clients receive packets, upload documents, and communicate with the firm."><SettingRow label="Use firm branding" description="Show firm identity and MatterPilot’s calm, structured client experience in the portal."><Toggle checked={settings.portalBranding} onChange={(value) => update("portalBranding", value)} label="Use portal branding" /></SettingRow><SettingRow label="Allow client uploads" description="Let clients respond to document requests directly from their secure portal."><Toggle checked={settings.portalUploads} onChange={(value) => update("portalUploads", value)} label="Allow client uploads" /></SettingRow><SettingRow label="Portal link expiration" description="Automatically expire secure links after the selected number of days."><select value={settings.portalLinkExpiration} onChange={(event) => update("portalLinkExpiration", event.target.value)} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="never">Never</option></select></SettingRow><SettingRow label="New message alerts" description="Notify the assigned team when a client sends a portal message."><Toggle checked={settings.portalMessageAlerts} onChange={(value) => update("portalMessageAlerts", value)} label="New message alerts" /></SettingRow></Card><Card eyebrow="Portal safety" title="Client-facing guardrails" description="Make sure the portal reinforces the boundaries of secure client communication."><div className="grid gap-3 py-5 sm:grid-cols-3"><div className="rounded-xl bg-[#f1eee8] p-4"><LockKeyhole className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Secure links</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Time-limited access with revocation controls.</p></div><div className="rounded-xl bg-[#f1eee8] p-4"><ShieldCheck className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Review gates</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Keep uploads pending until a team member reviews them.</p></div><div className="rounded-xl bg-[#f1eee8] p-4"><Mail className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Clear expectations</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Set response windows and emergency-contact language.</p></div></div></Card></div>
      case "integrations":
        return <div className="space-y-6"><Card eyebrow="Connected tools" title="Integrations" description="Keep the tools your firm already uses connected to the MatterPilot workflow without scattering credentials across the app."><div className="space-y-3 py-5"><div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f1eee8] font-semibold text-[#a24f31]">G</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Google Calendar</span><span className="mt-1 block text-xs text-[#8b8d88]">Availability, event sync, and calendar sharing.</span></span><StatusPill>Configure in Operations</StatusPill></div><div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef0] font-semibold text-[#385367]">O</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Microsoft Outlook</span><span className="mt-1 block text-xs text-[#8b8d88]">Microsoft 365 calendar connection.</span></span><StatusPill>Configure in Operations</StatusPill></div><div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e3da] bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f2e4d9] text-[#a24f31]"><Sparkles className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">AI assistance</span><span className="mt-1 block text-xs text-[#8b8d88]">Draft summaries, priorities, and analysis with human review.</span></span><StatusPill tone="soon">Provider settings</StatusPill></div></div><Link href="/matterpilot/operations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a24f31] hover:underline">Open integrations in Operations <ExternalLink className="size-3.5" /></Link></Card><Card eyebrow="Developer access" title="API & webhooks" description="Connect MatterPilot to intake forms, accounting tools, and firm automations when your team is ready."><div className="flex items-center gap-3 rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4"><CircleHelp className="size-5 text-[#a24f31]" /><p className="text-xs leading-5 text-[#8b6f60]">API keys, webhook endpoints, and scoped app connections will live here. Keep this area admin-only and rotate keys from the source provider.</p></div></Card></div>
      case "security":
        return <div className="space-y-6"><Card eyebrow="Account protection" title="Security & compliance" description="Give administrators a clear place to protect access, review activity, and establish firm retention rules."><SettingRow label="Login alerts" description="Notify you when a new device signs in to the workspace."><Toggle checked={settings.loginAlerts} onChange={(value) => update("loginAlerts", value)} label="Login alerts" /></SettingRow><SettingRow label="Require multi-factor authentication" description="Require a second factor for every team member before accessing firm data."><Toggle checked={settings.mfaRequired} onChange={(value) => update("mfaRequired", value)} label="Require multi-factor authentication" /></SettingRow><SettingRow label="Session timeout" description="Automatically end inactive sessions after the selected period."><select value={settings.sessionTimeout} onChange={(event) => update("sessionTimeout", event.target.value)} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="2">2 hours</option><option value="8">8 hours</option><option value="24">24 hours</option><option value="never">Never</option></select></SettingRow><SettingRow label="Audit retention" description="Keep a durable activity record for the selected period."><select value={settings.auditRetention} onChange={(event) => update("auditRetention", event.target.value)} className="h-9 rounded-lg border border-[#ded9d0] bg-white px-3 text-sm"><option value="1">1 year</option><option value="3">3 years</option><option value="7">7 years</option><option value="forever">Indefinitely</option></select></SettingRow></Card><Card eyebrow="Review & response" title="Security tools" description="When something looks wrong, the firm should be able to see what happened and limit access quickly."><div className="grid gap-3 py-5 sm:grid-cols-3"><Link href="/matterpilot/operations#activity" className="rounded-xl border border-[#e8e3da] bg-white p-4 transition-colors hover:border-[#c08a6d]"><Clock3 className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Activity timeline</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Review firm activity and changes.</p></Link><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><ShieldCheck className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Active sessions</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Session review and revoke-all controls.</p><StatusPill tone="soon">Admin next</StatusPill></div><div className="rounded-xl border border-[#e8e3da] bg-white p-4"><FileText className="size-4 text-[#a24f31]" /><p className="mt-3 text-sm font-semibold">Data export</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Export firm records for continuity.</p><StatusPill tone="soon">Admin next</StatusPill></div></div></Card></div>
      case "billing":
        return <div className="space-y-6"><Card eyebrow="Subscription" title="Billing & plan" description="Keep plan, payment, and usage controls separate from matter work so administrators can manage the business side safely."><div className="flex flex-wrap items-start gap-4 py-5"><div className="flex size-12 items-center justify-center rounded-xl bg-[#ead9c4] text-[#6f4f3c]"><WalletCards className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-lg font-semibold text-[#23313d]">MatterPilot workspace</p><p className="mt-1 text-xs leading-5 text-[#8b8d88]">Plan, payment method, seats, invoices, and usage limits will live here.</p></div><StatusPill tone="soon">Billing coming next</StatusPill></div><div className="grid gap-3 border-t border-[#eee8df] pt-5 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Users</p><p className="mt-2 text-xl font-semibold">1 seat</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Matters</p><p className="mt-2 text-xl font-semibold">Active workspace</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b8d88]">Invoices</p><p className="mt-2 text-xl font-semibold">Not configured</p></div></div></Card><Card eyebrow="Legal operations" title="Billing defaults to plan" description="The next billing slice should connect time entries, rates, invoices, trust accounting, payments, and firm reporting without exposing financial details to every role."><div className="rounded-xl border border-dashed border-[#d8c7bb] bg-[#fffaf6] p-4 text-xs leading-5 text-[#8b6f60]">For now, billing controls remain intentionally separate from the core calendar and readiness workflow. Nothing here changes financial records yet.</div></Card></div>
    }
  }

  return <div className="min-h-svh bg-[#f4f1eb] text-[#23313d]"><div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-7 sm:py-8"><header className="mb-6 flex flex-col gap-5 border-b border-[#ded9d0] pb-6 lg:flex-row lg:items-end lg:justify-between"><div><BackToDashboard /><h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold tracking-[-0.04em] text-[#23313d] sm:text-5xl">Shape the workspace around your firm.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#727a74]">Every firm works differently. Set the defaults, guardrails, and personal preferences that make MatterPilot feel like it was built for your practice.</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={reset}><X /> Reset</Button><Button size="sm" onClick={() => void save()} disabled={saving}>{saved ? <><Check /> Saved</> : saving ? "Saving…" : "Save changes"}</Button></div></header>{error ? <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"><CircleHelp className="size-4 shrink-0" />{error}</div> : null}<div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="h-fit rounded-2xl border border-[#ded9d0] bg-[#fbfaf7] p-3 shadow-sm lg:sticky lg:top-6"><div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#9b9d97]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search settings" className="h-9 w-full rounded-lg border border-[#ded9d0] bg-white pl-9 pr-3 text-xs outline-none placeholder:text-[#a1a39d] focus:border-[#b65f3a]" /></div><nav aria-label="Settings categories" className="space-y-4">{Object.entries(groupedCategories).map(([group, items]) => <div key={group}><p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b9d97]">{group}</p><div className="space-y-0.5">{items.map((item) => { const Icon = item.icon; const active = item.id === current.id; return <button key={item.id} type="button" onClick={() => { setSection(item.id); setSearch("") }} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active ? "bg-[#23313d] text-white shadow-sm" : "text-[#59645e] hover:bg-[#f1eee8]")}><Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-[#d5a083]" : "text-[#a24f31]")} /><span className="min-w-0"><span className="block text-xs font-semibold">{item.label}</span><span className={cn("mt-0.5 block text-[10px] leading-4", active ? "text-[#b9c5ca]" : "text-[#9b9d97]")}>{item.description}</span></span></button> })}</div></div>)}</nav></aside><main className="min-w-0"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b65f3a]">{current.group}</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#23313d]">{current.label}</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eee8] px-3 py-1.5 text-[10px] font-semibold text-[#737872]"><Check className="size-3.5 text-emerald-600" /> Synced to your account</span></div>{renderSection()}<p className="mt-6 text-center text-[11px] leading-5 text-[#9b9d97]">Personal preferences are stored securely with your MatterPilot account. Firm-wide roles, shared branding, and billing controls remain administrator-managed.</p></main></div></div></div>
}
