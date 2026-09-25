# MatterPilot domain glossary

## Matter

A legal work context that owns its appointments, preparation records, evidence, documents, and activity. A user may belong to more than one matter, but matter-owned records do not cross matter boundaries.

## Preparation document

A document requested or generated as part of an appointment workflow. The request/receipt state belongs to the appointment document; the working text belongs to its draft.

## Draft

The current editable working copy of a preparation document. A draft may be internal or client-visible, and may be in draft or final review status.

## Final

An attorney-reviewed state of the current draft. Final does not by itself mean that the document has been shared with a client.

## Client-visible

An explicit sharing decision that permits the current final draft to appear in a secure client preparation packet. Internal-only drafts remain unavailable through client links.

## Version

An immutable snapshot of a draft's content, review status, visibility decision, author, and creation time. Restoring a version creates a new current change; it does not rewrite history.

## Client packet

A one-time, expiring, revocable link containing only the appointment information and preparation documents that are both final and client-visible.

## Fillable field

A template-defined, structured answer slot attached to a preparation document. Client-editable fields are validated when the packet is submitted; internal fields are never exposed through the client link.

## Signature attestation

A typed-name and consent record tied to a requested document version. It records what the client affirmed inside the secure packet; it is not a claim that MatterPilot is a regulated third-party electronic-signature provider.

## Evidence artifact lifecycle

The state of a private file attached to an evidence record. An artifact may be active, superseded by a replacement, or released from retention. The lifecycle state does not change the evidence record's authentication status.

## Replacement artifact

A new private file attached to the same evidence record that explicitly points back to the prior artifact. The prior artifact remains preserved as a superseded record instead of being overwritten.

## Retention control

The legal-hold flag and optional retention date governing when an artifact may be released. Release does not silently delete the file; it makes the artifact unavailable for download and eligible for an intentional cleanup action after the hold and retention window are clear.

## Client portal grant

A matter-scoped authorization that allows a client with a matching verified email address to use the client portal. A grant can be active or revoked and does not give the client direct access to staff tables.

## Verified client access

Supabase email OTP authentication used before returning any portal data. The verified email must match an active client portal grant; authentication alone never grants matter access.

## Client-visible portal content

Only appointment details associated with the verified client and preparation documents whose current draft is both final and explicitly marked client-visible. Internal drafts, evidence, analysis, and staff records remain unavailable.

## Recurring task template

A reusable definition of work that may be materialized onto a specific appointment. The template is not itself completed work; each materialization creates an ordinary appointment task that can be assigned, dated, blocked, and audited.

## Built-in workflow

A MatterPilot-provided appointment workflow with a fixed legal-operations pattern. Built-in workflows remain available even when a firm adds or hides its own workflow choices.

## Custom workflow template

A user-owned appointment workflow that defines its duration, category, default location, preparation tasks, and document requests. A custom workflow is stored as an account preference and is expanded into ordinary appointment tasks and documents when selected.

## Workflow studio

The settings surface where a user manages custom workflow templates while keeping MatterPilot’s built-in workflows intact. Matter-specific recurring work and court-rule recipes remain operational records managed in Operations.

## Court-rule calculation

A proposed deadline produced from a saved jurisdiction rule and a recorded trigger date. The calculation preserves the rule, offset, and trigger so a human can verify or correct the result before relying on it.

## Matter activity

A chronological view of auditable changes to matter-owned work. Activity is a presentation of authoritative audit records, not a separate source of truth.

## Calendar connection

Provider-specific metadata describing whether a user's Google or Outlook calendar is connected and when it last synchronized. Connection metadata never implies that an external event was written successfully; each external event requires a recorded sync result.

## Scheduled operations engine

The protected hourly job that materializes due recurring task templates onto the next matching future appointment and creates deduplicated overdue task/deadline notifications for every matter member. It is idempotent, records each template run, and does not replace human review or external calendar synchronization.

## AI assistance run

A matter-scoped, versioned draft produced from structured records for human review. An assistance run is never a final legal conclusion, and its status, model, prompt version, and review decision remain auditable.

## Time entry and invoice

A time entry records work performed, duration, rate, and billable state. An invoice is a draft financial summary that groups submitted time entries; payment processing is a separate provider integration and is not implied by invoice creation.
