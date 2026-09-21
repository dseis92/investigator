import { ShieldAlert } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export function PermissionDeniedState({
  title = "You don't have access to this",
  description = "Your role on this matter doesn't permit viewing this item. Contact an attorney or admin on the matter if you believe this is incorrect.",
}: {
  title?: string
  description?: string
}) {
  return <EmptyState icon={ShieldAlert} title={title} description={description} />
}
