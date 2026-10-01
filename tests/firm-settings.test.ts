import assert from "node:assert/strict"
import { test } from "node:test"
import { defaultFirmSettings, firmSettingsSchema } from "../lib/matterpilot/firm-settings"
import { getDocumentTemplate, renderDocumentTemplate } from "../lib/matterpilot/documents"

test("firm settings validate identity and timezone", () => {
  assert.equal(firmSettingsSchema.safeParse({ ...defaultFirmSettings, name: "Fictional Law" }).success, true)
  for (const invalid of [{ timezone: "Unknown/Zone" }, { contact_email: "not-email" }, { website: "http://example.test" }, { brand_color: "red" }]) {
    assert.equal(firmSettingsSchema.safeParse({ ...defaultFirmSettings, name: "Fictional Law", ...invalid }).success, false)
  }
})
test("firm hours reject duplicates, reversed windows, and closed weeks", () => {
  for (const hours of [[], [{ day: 1, start: "17:00", end: "09:00" }], [{ day: 1, start: "09:00", end: "17:00" }, { day: 1, start: "10:00", end: "18:00" }]]) {
    assert.equal(firmSettingsSchema.safeParse({ ...defaultFirmSettings, name: "Fictional Law", business_hours: hours }).success, false)
  }
})
test("new document drafts include shared identity and footer without changing templates", () => {
  const template = getDocumentTemplate("Engagement letter")!
  const original = template.body
  const content = renderDocumentTemplate(template, { clientName: "Fictional client", matterName: "Demo", matterNumber: "TEST", appointmentDate: "October 1", appointmentTime: "9 AM", location: "Office", attorneyOrFirmName: "Fictional Law", firmContactDetails: "hello@example.test", timezone: "America/Chicago", firmFooter: "Attorney review required." })
  assert.ok(content.includes("Fictional Law"))
  assert.ok(content.includes("hello@example.test"))
  assert.ok(content.includes("America/Chicago"))
  assert.ok(content.endsWith("Attorney review required."))
  assert.equal(template.body, original)
})
