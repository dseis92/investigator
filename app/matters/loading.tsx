import { Skeleton } from "@/components/ui/skeleton"

export default function MattersLoading() {
  return (
    <div className="min-h-svh bg-[#f4f1eb] p-4 sm:p-7">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <Skeleton className="h-20 w-full rounded-2xl bg-[#e5dfd5]" />
        <Skeleton className="h-64 w-full rounded-2xl bg-[#d8d2c8]" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-[#e5dfd5]" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl bg-[#e5dfd5]" />)}
        </div>
      </div>
    </div>
  )
}
