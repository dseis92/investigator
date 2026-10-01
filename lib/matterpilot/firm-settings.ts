import { z } from "zod"

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const firmSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200),
  contact_email: z.union([z.string().trim().email(), z.literal("")]),
  contact_phone: z.string().trim().max(80),
  website: z.union([z.string().trim().url().startsWith("https://"), z.literal("")]),
  address: z.string().trim().max(1000),
  timezone: z.string().trim().refine((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true } catch { return false } }, "Choose a valid time zone."),
  jurisdiction: z.string().trim().max(200),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  document_footer: z.string().trim().max(2000),
  business_hours: z.array(z.object({ day: z.number().int().min(1).max(7), start: time, end: time }).refine((hour) => hour.end > hour.start, "Closing time must follow opening time.")).min(1).max(7).refine((hours) => new Set(hours.map((hour) => hour.day)).size === hours.length, "Use one opening window per day."),
})
export type FirmSettings = z.infer<typeof firmSettingsSchema>
export type SharedFirm = FirmSettings & { id: string; updated_at: string }
export type PublicFirmIdentity = Pick<FirmSettings, "name" | "contact_email" | "contact_phone" | "website" | "address" | "timezone" | "brand_color" | "document_footer">
export const defaultFirmSettings: FirmSettings = {
  name: "", contact_email: "", contact_phone: "", website: "", address: "", timezone: "America/Chicago", jurisdiction: "", brand_color: "#b65f3a", document_footer: "",
  business_hours: [1, 2, 3, 4, 5].map((day) => ({ day, start: "09:00", end: "17:00" })),
}
