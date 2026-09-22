"use client"

import {
  FileText,
  GitCompareArrows,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  Scale,
  Sparkles,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const navItems = (matterId: string) => [
  { href: `/matters/${matterId}`, label: "Command Center", icon: LayoutDashboard, exact: true },
  { href: `/matters/${matterId}/questions`, label: "Questions", icon: HelpCircle },
  { href: `/matters/${matterId}/subjects`, label: "Subjects", icon: Users },
  { href: `/matters/${matterId}/evidence`, label: "Evidence", icon: ListTree },
  { href: `/matters/${matterId}/timeline`, label: "Timeline", icon: GitCompareArrows },
  { href: `/matters/${matterId}/contradictions`, label: "Contradictions", icon: GitCompareArrows },
  { href: `/matters/${matterId}/analysis`, label: "Analysis", icon: Sparkles },
  { href: `/matters/${matterId}/reports`, label: "Reports", icon: FileText },
]

export function MatterShellNav({ matterId }: { matterId: string }) {
  const pathname = usePathname()
  const items = navItems(matterId)

  return (
    <nav aria-label="Matter navigation" className="print:hidden">
      <div className="flex items-center gap-2 px-1 pb-2 text-sm font-medium tracking-tight lg:pb-4">
        <Scale className="size-4" />
        <Link href="/matters">TraceLine</Link>
      </div>
      <ul className="flex gap-0.5 overflow-x-auto border-b border-border pb-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
