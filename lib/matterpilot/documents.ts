export type DocumentDraftContext = {
  clientName: string
  matterName: string
  matterNumber: string
  appointmentDate: string
  appointmentTime: string
  location: string
  attorneyOrFirmName: string
}

export type DocumentTemplate = {
  key: string
  name: string
  description: string
  body: string
}

export type DocumentFieldDefinition = {
  key: string
  label: string
  type: "text" | "email" | "date" | "textarea"
  required?: boolean
  clientEditable?: boolean
}

const CLIENT_FIELD = { clientEditable: true } as const

const DOCUMENT_FIELDS: Record<string, DocumentFieldDefinition[]> = {
  intake_questionnaire: [
    { key: "full_name", label: "Full legal name", type: "text", required: true, ...CLIENT_FIELD },
    { key: "preferred_name", label: "Preferred name and pronouns", type: "text", ...CLIENT_FIELD },
    { key: "phone", label: "Best phone number", type: "text", ...CLIENT_FIELD },
    { key: "email", label: "Best email address", type: "email", required: true, ...CLIENT_FIELD },
    { key: "matter_overview", label: "What happened?", type: "textarea", ...CLIENT_FIELD },
    { key: "desired_outcome", label: "What outcome are you seeking?", type: "textarea", ...CLIENT_FIELD },
    { key: "deadlines", label: "Deadlines, hearings, or urgent concerns", type: "textarea", ...CLIENT_FIELD },
    { key: "key_people", label: "Key people and entities", type: "textarea", ...CLIENT_FIELD },
    { key: "key_documents", label: "Key documents and evidence", type: "textarea", ...CLIENT_FIELD },
    { key: "prior_proceedings", label: "Prior advice or proceedings", type: "textarea", ...CLIENT_FIELD },
  ],
  engagement_letter: [
    { key: "scope", label: "Scope of representation", type: "textarea", required: true, ...CLIENT_FIELD },
    { key: "fee_arrangement", label: "Fee arrangement", type: "text", required: true, ...CLIENT_FIELD },
    { key: "initial_retainer", label: "Initial deposit or retainer", type: "text", ...CLIENT_FIELD },
    { key: "billing_terms", label: "Billing frequency and payment method", type: "text", ...CLIENT_FIELD },
  ],
}

const commonHeader = (title: string) => `DRAFT — ATTORNEY REVIEW REQUIRED
CONFIDENTIAL — INTERNAL WORK PRODUCT

${title}
Client: {CLIENT_NAME}
Matter: {MATTER_NAME} ({MATTER_NUMBER})
Appointment: {APPOINTMENT_DATE} at {APPOINTMENT_TIME}
Location: {LOCATION}
Prepared for: {ATTORNEY_OR_FIRM_NAME}

This ready-made draft is a starting point for the matter team. Review, revise, and approve it before sharing, filing, or relying on it.`

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    key: "intake_questionnaire",
    name: "Intake questionnaire",
    description: "A structured first-meeting questionnaire for the client or prospective client.",
    body: `${commonHeader("CLIENT INTAKE QUESTIONNAIRE")}

CLIENT BASICS
Full legal name: ______________________________________________
Preferred name and pronouns: __________________________________
Best phone and email: _________________________________________
Preferred contact method: _____________________________________

MATTER OVERVIEW
1. In your own words, what happened?
________________________________________________________________
________________________________________________________________

2. What outcome are you seeking?
________________________________________________________________

3. What deadlines, hearings, or urgent concerns should we know about?
________________________________________________________________

KEY PEOPLE AND ENTITIES
Names, roles, contact information, and relationship to the matter:
________________________________________________________________

KEY DOCUMENTS AND EVIDENCE
What records, messages, photographs, contracts, notices, or other materials exist?
________________________________________________________________

PRIOR ADVICE OR PROCEEDINGS
Have you spoken with another lawyer, received a notice, or appeared in court about this issue?
________________________________________________________________

CLIENT ACKNOWLEDGMENT
The client confirms that the information provided is complete and accurate to the best of their current knowledge and understands that this questionnaire is not a legal opinion or engagement agreement.

Client signature: __________________________  Date: ______________
Attorney notes: __________________________________________________
________________________________________________________________`,
  },
  {
    key: "engagement_letter",
    name: "Engagement letter",
    description: "A review-ready engagement letter framework with scope, fees, and communication terms.",
    body: `${commonHeader("LETTER OF ENGAGEMENT")}

Dear {CLIENT_NAME},

Thank you for asking {ATTORNEY_OR_FIRM_NAME} to assist with the matter identified above. This draft is intended to capture the proposed terms of representation for attorney review and client signature.

SCOPE OF REPRESENTATION
Our proposed services are limited to: ______________________________
________________________________________________________________
Any work outside this scope requires a written update or separate agreement.

FEES AND COSTS
Fee arrangement: ________________________________________________
Initial deposit or retainer: ______________________________________
Billing frequency and payment method: ____________________________
Client remains responsible for approved third-party costs and expenses.

COMMUNICATION AND RESPONSIBILITIES
We will provide material updates and reasonable notice of deadlines. The client agrees to provide complete information, preserve relevant materials, keep contact information current, and respond promptly to requests.

CONFIDENTIALITY AND CONFLICTS
Representation is subject to completion of the firm’s conflict review. Information will be handled consistent with applicable professional obligations.

TERMINATION AND CONCLUSION
Either party may end the representation as permitted by applicable rules. On conclusion, we will confirm the status of open work and return or retain materials according to the agreed file-retention policy.

Please review every term with the responsible attorney before sending. This draft does not create an attorney-client relationship until accepted and signed by the appropriate parties.

Agreed and accepted:

Client signature: __________________________  Date: ______________
Attorney signature: ________________________  Date: ______________`,
  },
  {
    key: "consultation_agenda",
    name: "Consultation agenda",
    description: "A focused agenda for the initial consultation and next-step decision.",
    body: `${commonHeader("INITIAL CONSULTATION AGENDA")}

MEETING OUTCOMES
- Understand the client’s goals and urgent risks.
- Identify conflicts, deadlines, and preservation needs.
- Decide whether further investigation or representation is appropriate.

AGENDA
1. Welcome, confidentiality, and meeting purpose
2. Client narrative and desired outcome
3. Timeline of key events
4. People, documents, and evidence already available
5. Immediate deadlines and risk controls
6. Scope, fees, and next steps

FOLLOW-UP ACTIONS
Owner: __________________  Action: __________________  Due: __________
Owner: __________________  Action: __________________  Due: __________
Owner: __________________  Action: __________________  Due: __________

Attorney notes: __________________________________________________
________________________________________________________________`,
  },
  {
    key: "meeting_agenda",
    name: "Meeting agenda",
    description: "A repeatable agenda for a client or matter-team meeting.",
    body: `${commonHeader("MATTER MEETING AGENDA")}

PURPOSE
Meeting objective: _______________________________________________
Decision needed today: __________________________________________

AGENDA
1. Current posture and urgent developments
2. Open evidence, questions, or deadlines
3. Decisions and recommendations
4. Client questions and communication plan
5. Owners, due dates, and next meeting

ACTION REGISTER
Action: __________________ Owner: __________________ Due: __________
Action: __________________ Owner: __________________ Due: __________
Action: __________________ Owner: __________________ Due: __________`,
  },
  {
    key: "deposition_notice",
    name: "Deposition notice",
    description: "A preparation shell for deposition logistics and required notice review.",
    body: `${commonHeader("DEPOSITION NOTICE REVIEW")}

DEPONENT
Name: __________________________  Role: __________________________
Date and time: __________________  Location: ______________________
Method: _________________________________________________________

REVIEW CHECKLIST
[ ] Notice and service reviewed
[ ] Governing deadline confirmed
[ ] Topics and exhibits identified
[ ] Interpreter, accessibility, or technology needs addressed
[ ] Objections and protective-order issues flagged

Open questions: __________________________________________________
________________________________________________________________`,
  },
  {
    key: "witness_packet",
    name: "Witness packet",
    description: "An internal witness-preparation packet outline with document and issue prompts.",
    body: `${commonHeader("WITNESS PREPARATION PACKET")}

WITNESS PROFILE
Name: __________________________  Role: __________________________
Relationship to matter: __________________________________________
Contact and availability: _________________________________________

PREPARATION MATERIALS
[ ] Timeline and key events
[ ] Prior statements or testimony
[ ] Exhibits and documents to review
[ ] Known inconsistencies or credibility issues
[ ] Topics to avoid or clarify

CORE QUESTIONS
1. What does the witness know firsthand?
2. What can the witness confirm, and what is uncertain?
3. What documents or people corroborate the account?

Attorney notes: __________________________________________________`,
  },
  {
    key: "prep_outline",
    name: "Prep outline",
    description: "A practical preparation outline for a deposition, hearing, or key meeting.",
    body: `${commonHeader("PREPARATION OUTLINE")}

OBJECTIVE
What must be accomplished: _______________________________________
Decision-maker or audience: _____________________________________

KEY FACTS
________________________________________________________________
________________________________________________________________

ISSUES TO COVER
1. ______________________________________________________________
2. ______________________________________________________________
3. ______________________________________________________________

RISKS AND RESPONSES
Risk: __________________________ Response: ______________________
Risk: __________________________ Response: ______________________

FINAL CHECK
[ ] Materials reviewed  [ ] Questions assigned  [ ] Client briefed
[ ] Logistics confirmed  [ ] Follow-up owner assigned`,
  },
  {
    key: "mediation_statement",
    name: "Mediation statement",
    description: "A confidential mediation-position draft with facts, issues, and requested resolution.",
    body: `${commonHeader("CONFIDENTIAL MEDIATION STATEMENT")}

POSITION SUMMARY
Our client’s position: ____________________________________________
Requested resolution: ____________________________________________

FACTUAL BACKGROUND
Provide a neutral, sourced chronology of the material events:
________________________________________________________________
________________________________________________________________

DISPUTED ISSUES
Issue 1: ________________________________________________________
Issue 2: ________________________________________________________
Issue 3: ________________________________________________________

DAMAGES, EXPOSURE, AND AUTHORITY
Known damages or exposure: _______________________________________
Settlement range or authority: ___________________________________
Key limitations or unresolved facts: ______________________________

This draft is confidential and must be checked against the evidence record before circulation.`,
  },
  {
    key: "damages_summary",
    name: "Damages summary",
    description: "A structured summary of claimed, supported, disputed, and outstanding damages.",
    body: `${commonHeader("DAMAGES SUMMARY")}

CATEGORY                         CLAIMED        SUPPORTED       DISPUTED
Economic loss                    __________     __________      __________
Medical or treatment costs       __________     __________      __________
Property or repair costs         __________     __________      __________
Fees, interest, or penalties     __________     __________      __________
Other                            __________     __________      __________

TOTALS                           __________     __________      __________

SOURCE AND LIMITATIONS
Supporting records: ______________________________________________
Missing records or assumptions: __________________________________
Last verified: __________________  Reviewer: _____________________`,
  },
  {
    key: "settlement_authority",
    name: "Settlement authority",
    description: "An internal approval memo for settlement range, authority, and conditions.",
    body: `${commonHeader("INTERNAL SETTLEMENT AUTHORITY MEMO")}

RECOMMENDATION
Recommended range: _______________________________________________
Requested authority: _____________________________________________
Walk-away or reservation point: __________________________________

RATIONALE
Strengths: _______________________________________________________
Weaknesses: _____________________________________________________
Evidence and damages considered: _________________________________
Costs and timing of continued litigation: _________________________

CONDITIONS
Non-monetary terms: ______________________________________________
Approval conditions: _____________________________________________

Approved by: __________________________  Date: __________________
This is an internal draft and is not a settlement offer.`,
  },
  {
    key: "court_notice",
    name: "Court notice",
    description: "A hearing and filing notice checklist for calendar and service review.",
    body: `${commonHeader("COURT NOTICE REVIEW")}

COURT EVENT
Court: __________________________  Case number: __________________
Event: __________________________  Date/time: ____________________
Judge or department: _____________________________________________

NOTICE REVIEW
[ ] Notice received and saved
[ ] Service and response deadline calculated
[ ] Appearance method confirmed
[ ] Client and team calendar updated
[ ] Filing, exhibit, or fee requirements assigned

Questions or follow-up: __________________________________________`,
  },
  {
    key: "hearing_outline",
    name: "Hearing outline",
    description: "A hearing-preparation outline for issues, authorities, exhibits, and requests.",
    body: `${commonHeader("HEARING OUTLINE")}

RELIEF OR RESULT SOUGHT
________________________________________________________________

KEY ISSUES AND AUTHORITIES
Issue: __________________________ Authority: _____________________
Issue: __________________________ Authority: _____________________

EVIDENCE AND EXHIBITS
Exhibit: ________________________ Foundation/witness: ____________
Exhibit: ________________________ Foundation/witness: ____________

ANTICIPATED QUESTIONS OR OPPOSITION
________________________________________________________________
________________________________________________________________

Final logistics check: ___________________________________________`,
  },
  {
    key: "expert_packet",
    name: "Expert packet",
    description: "An expert briefing packet with opinions, materials, assumptions, and open questions.",
    body: `${commonHeader("EXPERT BRIEFING PACKET")}

EXPERT PROFILE
Name and discipline: _____________________________________________
Role and opinions requested: ____________________________________
Disclosure or report deadline: ___________________________________

MATERIALS PROVIDED
[ ] Pleadings and procedural history
[ ] Relevant records and photographs
[ ] Timeline and disputed facts
[ ] Prior opinions or publications
[ ] Questions and assumptions

OPEN QUESTIONS AND LIMITATIONS
________________________________________________________________
________________________________________________________________`,
  },
  {
    key: "prior_opinions",
    name: "Prior opinions",
    description: "A review sheet for prior expert opinions, publications, and admissibility concerns.",
    body: `${commonHeader("PRIOR OPINIONS REVIEW")}

SOURCE
Author: __________________________ Date: _________________________
Matter or publication: ___________________________________________

REVIEW
Subject and methodology: ________________________________________
Consistency with current opinion: ________________________________
Adverse or limiting language: ____________________________________
Disclosure, foundation, or challenge risk: ________________________

Follow-up requested from expert: _________________________________`,
  },
  {
    key: "interview_outline",
    name: "Interview outline",
    description: "A fact-development outline for a witness or source interview.",
    body: `${commonHeader("WITNESS INTERVIEW OUTLINE")}

INTERVIEW PLAN
Purpose: _________________________________________________________
Consent and recording plan: _____________________________________

FOUNDATION
Identity, role, and relationship to the matter: ___________________
How the witness learned the information: _________________________

FACT QUESTIONS
1. ______________________________________________________________
2. ______________________________________________________________
3. ______________________________________________________________

FOLLOW-UP SOURCES
Documents: _______________________ People: _______________________
Next action and owner: ___________________________________________`,
  },
  {
    key: "conference_agenda",
    name: "Conference agenda",
    description: "An internal team-conference agenda focused on decisions and ownership.",
    body: `${commonHeader("INTERNAL CASE CONFERENCE AGENDA")}

DECISIONS FOR TODAY
1. ______________________________________________________________
2. ______________________________________________________________
3. ______________________________________________________________

MATTER UPDATE
New facts: _______________________________________________________
Evidence gaps: __________________________________________________
Upcoming deadlines: ______________________________________________

OWNERS AND NEXT STEPS
Action: __________________ Owner: __________________ Due: __________
Action: __________________ Owner: __________________ Due: __________`,
  },
  {
    key: "filing_checklist",
    name: "Filing checklist",
    description: "A final pre-filing checklist for deadlines, documents, service, and confirmation.",
    body: `${commonHeader("FILING CHECKLIST")}

FILING DETAILS
Court or agency: __________________  Due date/time: ______________
Filing type: _______________________  Responsible owner: __________

FINAL REVIEW
[ ] Caption, case number, and parties verified
[ ] Signature and verification requirements complete
[ ] Exhibits and attachments labeled
[ ] Page limits, formatting, and fees checked
[ ] Service list and method confirmed
[ ] Filing confirmation saved to the matter

Notes or exceptions: ______________________________________________`,
  },
]

export function getDocumentTemplate(name: string) {
  const normalized = name.trim().toLowerCase()
  return DOCUMENT_TEMPLATES.find((template) => template.name.toLowerCase() === normalized) ?? null
}

export function getDocumentFieldDefinitions(templateKey: string): DocumentFieldDefinition[] {
  return DOCUMENT_FIELDS[templateKey] ?? []
}

export function renderDocumentTemplate(template: DocumentTemplate, context: DocumentDraftContext) {
  const values: Record<string, string> = {
    CLIENT_NAME: context.clientName || "Client name to confirm",
    MATTER_NAME: context.matterName || "Matter name to confirm",
    MATTER_NUMBER: context.matterNumber || "Matter number to confirm",
    APPOINTMENT_DATE: context.appointmentDate || "Date to confirm",
    APPOINTMENT_TIME: context.appointmentTime || "Time to confirm",
    LOCATION: context.location || "Location to confirm",
    ATTORNEY_OR_FIRM_NAME: context.attorneyOrFirmName || "Responsible attorney or firm",
  }

  return Object.entries(values).reduce((content, [key, value]) => content.replaceAll(`{${key}}`, value), template.body)
}
