"use client"

import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Wraps an action control (usually a Button) and disables it with an
 * explanatory tooltip when `allowed` is false. This is a UX affordance only
 * — the real enforcement is server-side RLS + the Server Action's own role
 * check, since a disabled attribute is trivially bypassable client-side.
 */
export function RoleGate({
  allowed,
  reason = "Your role on this matter doesn't permit this action.",
  children,
}: {
  allowed: boolean
  reason?: string
  children: ReactNode
}) {
  if (allowed) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span tabIndex={0} className="inline-flex cursor-not-allowed [&>*]:pointer-events-none [&>*]:opacity-50" />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
