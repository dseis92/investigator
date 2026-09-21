import { format, formatDistanceToNow } from "date-fns"

export function formatDate(value: string | null | undefined, pattern = "MMM d, yyyy") {
  if (!value) return "—"
  return format(new Date(value), pattern)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a")
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "—"
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

export function humanizeEnum(value: string | null | undefined) {
  if (!value) return "—"
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
