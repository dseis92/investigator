import { Skeleton } from "@/components/ui/skeleton"

export default function TimelineLoading() {
  return (
    <div className="space-y-2 pb-16">
      <Skeleton className="mb-4 h-16 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
