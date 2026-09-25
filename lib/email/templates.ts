function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character] ?? character
  })
}

export function renderMatterPilotEmail(input: { subject: string; body: string }) {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;color:#4d5851">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("")

  return {
    text: input.body,
    html: `<!doctype html><html><body style="margin:0;background:#f6f3ee;padding:32px 16px;font-family:Arial,sans-serif;color:#23313d"><div style="max-width:600px;margin:0 auto;background:#fffdf9;border:1px solid #e5ded4;border-radius:18px;overflow:hidden"><div style="background:#23313d;padding:22px 28px"><div style="color:#f0c9b1;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">MatterPilot</div><div style="margin-top:6px;color:#fffdf9;font-size:22px;font-weight:700">${escapeHtml(input.subject)}</div></div><div style="padding:28px">${paragraphs}<div style="border-top:1px solid #e5ded4;padding-top:18px;color:#8b8d88;font-size:12px">MatterPilot · Legal operations for modern firms</div></div></div></body></html>`,
  }
}
