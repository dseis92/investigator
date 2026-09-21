import {
  Building2,
  Calendar,
  FileText,
  Gavel,
  Home,
  Landmark,
  type LucideIcon,
  User,
  UserSquare2,
  Wallet,
} from "lucide-react"

import type { SubjectType } from "@/lib/domain"

const ICONS: Record<SubjectType, LucideIcon> = {
  person: User,
  business: Building2,
  organization: Landmark,
  account: Wallet,
  address: Home,
  document: FileText,
  witness: UserSquare2,
  expert: UserSquare2,
  event: Calendar,
  case: Gavel,
}

export function SubjectTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type as SubjectType] ?? User
  return <Icon className={className} />
}
