import { Skeleton } from "@/components/ui/skeleton"

export default function QuestionsLoading() {
  return (
    <div className="space-y-4 pb-16">
      <Skeleton className="h-16 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  )
}
