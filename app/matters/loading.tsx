import { Skeleton } from "@/components/ui/skeleton"

export default function MattersLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-6 py-10">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}
