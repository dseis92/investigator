import { Skeleton } from "@/components/ui/skeleton"

export default function MatterLoading() {
  return (
    <div className="space-y-6 pb-16">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
