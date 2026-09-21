import { Skeleton } from "@/components/ui/skeleton"

export default function EvidenceLoading() {
  return (
    <div className="space-y-6 pb-16">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
