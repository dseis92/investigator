export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type MatterPilotTable<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type AppointmentTypeRow = { id: string; matter_id: string; name: string; duration_minutes: number; category: string; required_checklist: Json; required_documents: Json; created_by: string; created_at: string }
type AppointmentRow = { id: string; matter_id: string; appointment_type_id: string | null; workflow_key: string; title: string; starts_at: string; ends_at: string; status: string; conflict_status: string; location: string | null; notes: string | null; client_name: string | null; client_email: string | null; series_id: string | null; occurrence_index: number | null; created_by: string; created_at: string; updated_at: string }
type AppointmentParticipantRow = { id: string; matter_id: string; appointment_id: string; display_name: string; email: string | null; participant_role: string; response_status: string; is_required: boolean; created_at: string }
type AppointmentTaskRow = { id: string; matter_id: string; appointment_id: string; label: string; status: string; is_blocking: boolean; due_at: string | null; assigned_to: string | null; created_by: string; created_at: string; updated_at: string }
type AppointmentTaskDependencyRow = { id: string; matter_id: string; task_id: string; depends_on_task_id: string; created_by: string; created_at: string }
type AppointmentTaskTemplateRow = { id: string; matter_id: string; label: string; frequency: string; interval_count: number; is_blocking: boolean; assigned_to: string | null; next_run_at: string | null; active: boolean; created_by: string; created_at: string; updated_at: string }
type MatterNotificationRow = { id: string; matter_id: string; recipient_id: string; kind: string; title: string; body: string; href: string | null; dedupe_key: string | null; read_at: string | null; created_at: string }
type AppointmentTaskTemplateRunRow = { id: string; matter_id: string; template_id: string; appointment_id: string; task_id: string | null; scheduled_for: string; status: string; error_message: string | null; created_at: string }
type CourtRuleDefinitionRow = { id: string; name: string; jurisdiction: string; trigger_kind: string; offset_days: number; business_days: boolean; description: string | null; active: boolean; created_by: string; created_at: string; updated_at: string }
type CalendarSyncConnectionRow = { id: string; provider: string; user_id: string; matter_id: string | null; status: string; provider_account_email: string | null; external_calendar_id: string | null; last_sync_at: string | null; error_message: string | null; oauth_state_hash: string | null; scope: string | null; calendar_name: string | null; created_at: string; updated_at: string }
type CalendarSyncEventRow = { id: string; connection_id: string; matter_id: string; appointment_id: string; external_event_id: string; external_etag: string | null; last_pushed_at: string | null; created_at: string }
type CalendarSyncSecretRow = { id: string; connection_id: string; access_token_encrypted: string; refresh_token_encrypted: string | null; access_token_expires_at: string | null; created_at: string; updated_at: string }
type TimeEntryRow = { id: string; matter_id: string; user_id: string; appointment_id: string | null; description: string; started_at: string | null; ended_at: string | null; duration_minutes: number; billable: boolean; rate_cents: number; status: string; created_by: string; created_at: string; updated_at: string }
type BillingInvoiceRow = { id: string; matter_id: string; invoice_number: string; status: string; issued_at: string | null; due_at: string | null; subtotal_cents: number; notes: string | null; created_by: string; created_at: string; updated_at: string }
type BillingInvoiceItemRow = { id: string; matter_id: string; invoice_id: string; time_entry_id: string | null; description: string; quantity_minutes: number; rate_cents: number; amount_cents: number; created_at: string }
type AiAssistanceRunRow = { id: string; matter_id: string; run_type: string; status: string; model: string | null; prompt_version: string; input_hash: string | null; output: Json; redaction_applied: boolean; token_count: number | null; error_message: string | null; created_by: string; created_at: string; reviewed_at: string | null; reviewed_by: string | null }
type AppointmentDocumentRow = { id: string; matter_id: string; appointment_id: string; name: string; status: string; is_required: boolean; requested_at: string; received_at: string | null; created_by: string; created_at: string }
type AppointmentDocumentDraftRow = { id: string; matter_id: string; appointment_document_id: string; template_key: string; content: string; status: string; visibility: string; field_schema: Json; field_values: Json; created_by: string; updated_by: string; created_at: string; updated_at: string }
type AppointmentDocumentVersionRow = { id: string; matter_id: string; appointment_document_id: string; version_number: number; content: string; status: string; visibility: string; field_schema: Json; field_values: Json; created_by: string; created_at: string }
type AppointmentDocumentSignatureRow = { id: string; matter_id: string; appointment_document_id: string; signer_role: string; status: string; signer_name: string | null; signer_email: string | null; signature_text: string | null; consent_text: string | null; requested_at: string; signed_at: string | null; signed_version_id: string | null; created_by: string; updated_at: string }
type AppointmentIntakeRow = { id: string; matter_id: string; appointment_id: string; full_name: string; email: string; phone: string | null; summary: string | null; goals: string | null; deadlines: string | null; engagement_acknowledged_at: string | null; client_completed_at: string | null; created_at: string; updated_at: string }
type AppointmentReminderRow = { id: string; matter_id: string; appointment_id: string; channel: string; send_at: string; status: string; created_at: string }
type AppointmentPacketRow = { id: string; matter_id: string; appointment_id: string; token: string; status: string; expires_at: string; viewed_at: string | null; completed_at: string | null; created_by: string; created_at: string; updated_at: string }
type AppointmentPacketReminderRow = { id: string; matter_id: string; packet_id: string; kind: string; send_at: string; status: string; created_at: string; updated_at: string }
type ClientPortalGrantRow = { id: string; matter_id: string; client_email: string; client_name: string | null; status: string; last_accessed_at: string | null; revoked_at: string | null; created_by: string; created_at: string; updated_at: string }
type AppointmentCommunicationRow = { id: string; matter_id: string; appointment_id: string; channel: string; direction: string; status: string; recipient: string | null; subject: string | null; body: string; provider: string | null; provider_message_id: string | null; error_message: string | null; sent_at: string | null; created_by: string; created_at: string; updated_at: string }
type MatterDeadlineRow = { id: string; matter_id: string; title: string; kind: string; due_at: string; priority: string; status: string; notes: string | null; assigned_to: string | null; court_rule_id: string | null; trigger_at: string | null; calculation_note: string | null; created_by: string; created_at: string; updated_at: string }
type MatterContactRow = { id: string; matter_id: string; display_name: string; contact_type: string; email: string | null; phone: string | null; notes: string | null; status: string; created_by: string; created_at: string; updated_at: string }
type EvidenceArtifactRow = { id: string; matter_id: string; evidence_id: string; storage_path: string; file_name: string; mime_type: string; size_bytes: number; sha256_hash: string | null; created_by: string; created_at: string; lifecycle_status: string; replaces_artifact_id: string | null; retention_until: string | null; legal_hold: boolean; released_at: string | null }
type BookingPageRow = { id: string; matter_id: string; slug: string; firm_name: string; active: boolean; created_by: string; created_at: string }
type BookingRequestRow = { id: string; matter_id: string; booking_page_id: string; appointment_type_name: string; requested_start: string; full_name: string; email: string; summary: string | null; status: string; created_at: string; reviewed_at: string | null }
type CalendarNoteRow = { id: string; matter_id: string | null; title: string; note: string; starts_at: string; ends_at: string; created_by: string; created_at: string; updated_at: string }
type IntakeReviewRow = { id: string; matter_id: string; booking_request_id: string; reviewer_id: string; decision: string; conflict_status: string; reviewer_note: string | null; created_at: string; updated_at: string }
type CalendarAvailabilityRuleRow = { id: string; matter_id: string; weekday: number; start_time: string; end_time: string; timezone: string; label: string | null; is_active: boolean; created_by: string; created_at: string; updated_at: string }
type CalendarBlackoutRow = { id: string; matter_id: string; starts_at: string; ends_at: string; reason: string; status: string; created_by: string; created_at: string; updated_at: string }
type UserPreferenceRow = { user_id: string; preferences: Json; created_at: string; updated_at: string }
type AppointmentRescheduleHistoryRow = { id: string; matter_id: string; appointment_id: string; previous_starts_at: string; previous_ends_at: string; next_starts_at: string; next_ends_at: string; reason: string | null; changed_by: string; created_at: string }
type ClientPortalMessageRow = { id: string; matter_id: string; sender_role: string; sender_email: string; body: string; created_by: string | null; created_at: string }
type ClientPortalActivityRow = { id: string; matter_id: string; activity_type: string; actor_role: string; summary: string; created_at: string }
type ClientPortalDocumentRequestRow = { id: string; matter_id: string; appointment_id: string | null; title: string; description: string; status: string; storage_path: string | null; file_name: string | null; mime_type: string | null; size_bytes: number | null; uploaded_by_email: string | null; uploaded_at: string | null; reviewed_by: string | null; reviewed_at: string | null; reviewer_note: string | null; requested_by: string; created_at: string; updated_at: string }

type MatterPilotInsert<T> = Partial<T>
type MatterPilotUpdate<T> = Partial<T>

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_series: {
        Row: {
          id: string
          matter_id: string
          frequency: string
          interval_count: number
          occurrence_count: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          matter_id: string
          frequency: string
          interval_count?: number
          occurrence_count: number
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          matter_id?: string
          frequency?: string
          interval_count?: number
          occurrence_count?: number
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      client_portal_messages: MatterPilotTable<ClientPortalMessageRow, MatterPilotInsert<ClientPortalMessageRow>, MatterPilotUpdate<ClientPortalMessageRow>>
      client_portal_activity: MatterPilotTable<ClientPortalActivityRow, MatterPilotInsert<ClientPortalActivityRow>, MatterPilotUpdate<ClientPortalActivityRow>>
      client_portal_document_requests: MatterPilotTable<ClientPortalDocumentRequestRow, MatterPilotInsert<ClientPortalDocumentRequestRow>, MatterPilotUpdate<ClientPortalDocumentRequestRow>>
      appointment_types: MatterPilotTable<AppointmentTypeRow, MatterPilotInsert<AppointmentTypeRow>, MatterPilotUpdate<AppointmentTypeRow>>
      appointments: MatterPilotTable<AppointmentRow, MatterPilotInsert<AppointmentRow>, MatterPilotUpdate<AppointmentRow>>
      appointment_participants: MatterPilotTable<AppointmentParticipantRow, MatterPilotInsert<AppointmentParticipantRow>, MatterPilotUpdate<AppointmentParticipantRow>>
      appointment_tasks: MatterPilotTable<AppointmentTaskRow, MatterPilotInsert<AppointmentTaskRow>, MatterPilotUpdate<AppointmentTaskRow>>
      appointment_task_dependencies: MatterPilotTable<AppointmentTaskDependencyRow, MatterPilotInsert<AppointmentTaskDependencyRow>, MatterPilotUpdate<AppointmentTaskDependencyRow>>
      appointment_task_templates: MatterPilotTable<AppointmentTaskTemplateRow, MatterPilotInsert<AppointmentTaskTemplateRow>, MatterPilotUpdate<AppointmentTaskTemplateRow>>
      matter_notifications: MatterPilotTable<MatterNotificationRow, MatterPilotInsert<MatterNotificationRow>, MatterPilotUpdate<MatterNotificationRow>>
      appointment_task_template_runs: MatterPilotTable<AppointmentTaskTemplateRunRow, MatterPilotInsert<AppointmentTaskTemplateRunRow>, MatterPilotUpdate<AppointmentTaskTemplateRunRow>>
      court_rule_definitions: MatterPilotTable<CourtRuleDefinitionRow, MatterPilotInsert<CourtRuleDefinitionRow>, MatterPilotUpdate<CourtRuleDefinitionRow>>
      calendar_sync_connections: MatterPilotTable<CalendarSyncConnectionRow, MatterPilotInsert<CalendarSyncConnectionRow>, MatterPilotUpdate<CalendarSyncConnectionRow>>
      calendar_sync_events: MatterPilotTable<CalendarSyncEventRow, MatterPilotInsert<CalendarSyncEventRow>, MatterPilotUpdate<CalendarSyncEventRow>>
      calendar_sync_secrets: MatterPilotTable<CalendarSyncSecretRow, MatterPilotInsert<CalendarSyncSecretRow>, MatterPilotUpdate<CalendarSyncSecretRow>>
      time_entries: MatterPilotTable<TimeEntryRow, MatterPilotInsert<TimeEntryRow>, MatterPilotUpdate<TimeEntryRow>>
      billing_invoices: MatterPilotTable<BillingInvoiceRow, MatterPilotInsert<BillingInvoiceRow>, MatterPilotUpdate<BillingInvoiceRow>>
      billing_invoice_items: MatterPilotTable<BillingInvoiceItemRow, MatterPilotInsert<BillingInvoiceItemRow>, MatterPilotUpdate<BillingInvoiceItemRow>>
      ai_assistance_runs: MatterPilotTable<AiAssistanceRunRow, MatterPilotInsert<AiAssistanceRunRow>, MatterPilotUpdate<AiAssistanceRunRow>>
      appointment_documents: MatterPilotTable<AppointmentDocumentRow, MatterPilotInsert<AppointmentDocumentRow>, MatterPilotUpdate<AppointmentDocumentRow>>
      appointment_document_drafts: MatterPilotTable<AppointmentDocumentDraftRow, MatterPilotInsert<AppointmentDocumentDraftRow>, MatterPilotUpdate<AppointmentDocumentDraftRow>>
      appointment_document_versions: MatterPilotTable<AppointmentDocumentVersionRow, MatterPilotInsert<AppointmentDocumentVersionRow>, MatterPilotUpdate<AppointmentDocumentVersionRow>>
      appointment_document_signatures: MatterPilotTable<AppointmentDocumentSignatureRow, MatterPilotInsert<AppointmentDocumentSignatureRow>, MatterPilotUpdate<AppointmentDocumentSignatureRow>>
      appointment_intake: MatterPilotTable<AppointmentIntakeRow, MatterPilotInsert<AppointmentIntakeRow>, MatterPilotUpdate<AppointmentIntakeRow>>
      appointment_reminders: MatterPilotTable<AppointmentReminderRow, MatterPilotInsert<AppointmentReminderRow>, MatterPilotUpdate<AppointmentReminderRow>>
      appointment_packets: MatterPilotTable<AppointmentPacketRow, MatterPilotInsert<AppointmentPacketRow>, MatterPilotUpdate<AppointmentPacketRow>>
      appointment_packet_reminders: MatterPilotTable<AppointmentPacketReminderRow, MatterPilotInsert<AppointmentPacketReminderRow>, MatterPilotUpdate<AppointmentPacketReminderRow>>
      client_portal_grants: MatterPilotTable<ClientPortalGrantRow, MatterPilotInsert<ClientPortalGrantRow>, MatterPilotUpdate<ClientPortalGrantRow>>
      appointment_communications: MatterPilotTable<AppointmentCommunicationRow, MatterPilotInsert<AppointmentCommunicationRow>, MatterPilotUpdate<AppointmentCommunicationRow>>
      matter_deadlines: MatterPilotTable<MatterDeadlineRow, MatterPilotInsert<MatterDeadlineRow>, MatterPilotUpdate<MatterDeadlineRow>>
      matter_contacts: MatterPilotTable<MatterContactRow, MatterPilotInsert<MatterContactRow>, MatterPilotUpdate<MatterContactRow>>
      evidence_artifacts: MatterPilotTable<EvidenceArtifactRow, MatterPilotInsert<EvidenceArtifactRow>, MatterPilotUpdate<EvidenceArtifactRow>>
      booking_pages: MatterPilotTable<BookingPageRow, MatterPilotInsert<BookingPageRow>, MatterPilotUpdate<BookingPageRow>>
      booking_requests: MatterPilotTable<BookingRequestRow, MatterPilotInsert<BookingRequestRow>, MatterPilotUpdate<BookingRequestRow>>
      calendar_notes: MatterPilotTable<CalendarNoteRow, MatterPilotInsert<CalendarNoteRow>, MatterPilotUpdate<CalendarNoteRow>>
      intake_reviews: MatterPilotTable<IntakeReviewRow, MatterPilotInsert<IntakeReviewRow>, MatterPilotUpdate<IntakeReviewRow>>
      calendar_availability_rules: MatterPilotTable<CalendarAvailabilityRuleRow, MatterPilotInsert<CalendarAvailabilityRuleRow>, MatterPilotUpdate<CalendarAvailabilityRuleRow>>
      calendar_blackouts: MatterPilotTable<CalendarBlackoutRow, MatterPilotInsert<CalendarBlackoutRow>, MatterPilotUpdate<CalendarBlackoutRow>>
      appointment_reschedule_history: MatterPilotTable<AppointmentRescheduleHistoryRow, MatterPilotInsert<AppointmentRescheduleHistoryRow>, MatterPilotUpdate<AppointmentRescheduleHistoryRow>>
      user_preferences: MatterPilotTable<UserPreferenceRow, MatterPilotInsert<UserPreferenceRow>, MatterPilotUpdate<UserPreferenceRow>>
      analyses: {
        Row: {
          ai_model: string | null
          ai_prompt_ref: string | null
          authored_by: string
          confidence_assessment: string | null
          contradicting_evidence_summary: string | null
          created_at: string
          generated_by: string
          id: string
          key_assumptions: string | null
          limitations: string | null
          matter_id: string
          missing_evidence_summary: string | null
          proposition_id: string | null
          question_id: string | null
          recommended_next_steps: string | null
          status: string
          summary: string
          supporting_evidence_summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_prompt_ref?: string | null
          authored_by: string
          confidence_assessment?: string | null
          contradicting_evidence_summary?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          key_assumptions?: string | null
          limitations?: string | null
          matter_id: string
          missing_evidence_summary?: string | null
          proposition_id?: string | null
          question_id?: string | null
          recommended_next_steps?: string | null
          status?: string
          summary: string
          supporting_evidence_summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_prompt_ref?: string | null
          authored_by?: string
          confidence_assessment?: string | null
          contradicting_evidence_summary?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          key_assumptions?: string | null
          limitations?: string | null
          matter_id?: string
          missing_evidence_summary?: string | null
          proposition_id?: string | null
          question_id?: string | null
          recommended_next_steps?: string | null
          status?: string
          summary?: string
          supporting_evidence_summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_proposition_id_fkey"
            columns: ["proposition_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_proposition_matter_fkey"
            columns: ["matter_id", "proposition_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "analyses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_question_matter_fkey"
            columns: ["matter_id", "question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      analysis_conclusion_evidence: {
        Row: {
          conclusion_id: string
          created_at: string
          evidence_id: string
          id: string
          locator_note: string | null
          matter_id: string
        }
        Insert: {
          conclusion_id: string
          created_at?: string
          evidence_id: string
          id?: string
          locator_note?: string | null
          matter_id: string
        }
        Update: {
          conclusion_id?: string
          created_at?: string
          evidence_id?: string
          id?: string
          locator_note?: string | null
          matter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_conclusion_evidence_conclusion_id_fkey"
            columns: ["conclusion_id"]
            isOneToOne: false
            referencedRelation: "analysis_conclusions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_conclusion_evidence_conclusion_matter_fkey"
            columns: ["matter_id", "conclusion_id"]
            isOneToOne: false
            referencedRelation: "analysis_conclusions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "analysis_conclusion_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_conclusion_evidence_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "analysis_conclusion_evidence_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_conclusions: {
        Row: {
          analysis_id: string
          classification: string
          conclusion_text: string
          created_at: string
          created_by: string
          id: string
          matter_id: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          classification: string
          conclusion_text: string
          created_at?: string
          created_by: string
          id?: string
          matter_id: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          classification?: string
          conclusion_text?: string
          created_at?: string
          created_by?: string
          id?: string
          matter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_conclusions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_conclusions_analysis_matter_fkey"
            columns: ["matter_id", "analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "analysis_conclusions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_conclusions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          matter_id: string
          new_value: Json | null
          previous_value: Json | null
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          matter_id: string
          new_value?: Json | null
          previous_value?: Json | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          matter_id?: string
          new_value?: Json | null
          previous_value?: Json | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      contradiction_evidence: {
        Row: {
          contradiction_id: string
          created_at: string
          created_by: string
          evidence_id: string
          id: string
          matter_id: string
          side: string
        }
        Insert: {
          contradiction_id: string
          created_at?: string
          created_by: string
          evidence_id: string
          id?: string
          matter_id: string
          side: string
        }
        Update: {
          contradiction_id?: string
          created_at?: string
          created_by?: string
          evidence_id?: string
          id?: string
          matter_id?: string
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "contradiction_evidence_contradiction_id_fkey"
            columns: ["contradiction_id"]
            isOneToOne: false
            referencedRelation: "contradictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradiction_evidence_contradiction_matter_fkey"
            columns: ["matter_id", "contradiction_id"]
            isOneToOne: false
            referencedRelation: "contradictions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradiction_evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradiction_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradiction_evidence_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradiction_evidence_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      contradiction_reviews: {
        Row: {
          absence_of_evidence_check: string | null
          contradiction_id: string
          correlation_vs_causation: string | null
          created_at: string
          evidence_against_theory: string | null
          fact_that_would_weaken_conclusion: string | null
          id: string
          matter_id: string
          opposing_counsel_attack: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          weakest_assumption: string | null
        }
        Insert: {
          absence_of_evidence_check?: string | null
          contradiction_id: string
          correlation_vs_causation?: string | null
          created_at?: string
          evidence_against_theory?: string | null
          fact_that_would_weaken_conclusion?: string | null
          id?: string
          matter_id: string
          opposing_counsel_attack?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          weakest_assumption?: string | null
        }
        Update: {
          absence_of_evidence_check?: string | null
          contradiction_id?: string
          correlation_vs_causation?: string | null
          created_at?: string
          evidence_against_theory?: string | null
          fact_that_would_weaken_conclusion?: string | null
          id?: string
          matter_id?: string
          opposing_counsel_attack?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          weakest_assumption?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contradiction_reviews_contradiction_id_fkey"
            columns: ["contradiction_id"]
            isOneToOne: true
            referencedRelation: "contradictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradiction_reviews_contradiction_matter_fkey"
            columns: ["matter_id", "contradiction_id"]
            isOneToOne: false
            referencedRelation: "contradictions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradiction_reviews_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradiction_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contradictions: {
        Row: {
          conflict_type: string
          created_at: string
          created_by: string
          id: string
          impact_if_a: string | null
          impact_if_b: string | null
          matter_id: string
          missing_evidence: string | null
          plausible_alternative_explanations: string | null
          proposition_a_id: string | null
          proposition_b_id: string | null
          resolution_status: string
          side_a_label: string
          side_a_summary: string
          side_b_label: string
          side_b_summary: string
          statement_a_id: string | null
          statement_b_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          created_by: string
          id?: string
          impact_if_a?: string | null
          impact_if_b?: string | null
          matter_id: string
          missing_evidence?: string | null
          plausible_alternative_explanations?: string | null
          proposition_a_id?: string | null
          proposition_b_id?: string | null
          resolution_status?: string
          side_a_label: string
          side_a_summary: string
          side_b_label: string
          side_b_summary: string
          statement_a_id?: string | null
          statement_b_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          created_by?: string
          id?: string
          impact_if_a?: string | null
          impact_if_b?: string | null
          matter_id?: string
          missing_evidence?: string | null
          plausible_alternative_explanations?: string | null
          proposition_a_id?: string | null
          proposition_b_id?: string | null
          resolution_status?: string
          side_a_label?: string
          side_a_summary?: string
          side_b_label?: string
          side_b_summary?: string
          statement_a_id?: string | null
          statement_b_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contradictions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_proposition_a_id_fkey"
            columns: ["proposition_a_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_proposition_a_matter_fkey"
            columns: ["matter_id", "proposition_a_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradictions_proposition_b_id_fkey"
            columns: ["proposition_b_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_proposition_b_matter_fkey"
            columns: ["matter_id", "proposition_b_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradictions_statement_a_id_fkey"
            columns: ["statement_a_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_statement_a_matter_fkey"
            columns: ["matter_id", "statement_a_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "contradictions_statement_b_id_fkey"
            columns: ["statement_b_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_statement_b_matter_fkey"
            columns: ["matter_id", "statement_b_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      entity_attributes: {
        Row: {
          attribute_key: string
          attribute_value: string
          created_at: string
          created_by: string
          evidence_id: string | null
          id: string
          matter_id: string
          notes: string | null
          status: string
          subject_id: string
          superseded_by: string | null
          updated_at: string
        }
        Insert: {
          attribute_key: string
          attribute_value: string
          created_at?: string
          created_by: string
          evidence_id?: string | null
          id?: string
          matter_id: string
          notes?: string | null
          status?: string
          subject_id: string
          superseded_by?: string | null
          updated_at?: string
        }
        Update: {
          attribute_key?: string
          attribute_value?: string
          created_at?: string
          created_by?: string
          evidence_id?: string | null
          id?: string
          matter_id?: string
          notes?: string | null
          status?: string
          subject_id?: string
          superseded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_attributes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attributes_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attributes_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "entity_attributes_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attributes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attributes_subject_matter_fkey"
            columns: ["matter_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "entity_attributes_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "entity_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attributes_superseded_by_matter_fkey"
            columns: ["matter_id", "superseded_by"]
            isOneToOne: false
            referencedRelation: "entity_attributes"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          confidence: string
          created_at: string
          created_by: string
          description: string | null
          event_end: string | null
          event_start: string
          favorability: string
          id: string
          matter_id: string
          primary_evidence_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          confidence?: string
          created_at?: string
          created_by: string
          description?: string | null
          event_end?: string | null
          event_start: string
          favorability?: string
          id?: string
          matter_id: string
          primary_evidence_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          confidence?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_end?: string | null
          event_start?: string
          favorability?: string
          id?: string
          matter_id?: string
          primary_evidence_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_primary_evidence_id_fkey"
            columns: ["primary_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_primary_evidence_matter_fkey"
            columns: ["matter_id", "primary_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      evidence: {
        Row: {
          artifact_hash: string | null
          artifact_ref: string | null
          artifact_type: string
          authentication_status: string
          captured_at: string | null
          collector: string | null
          created_at: string
          created_by: string
          custodian: string | null
          event_date: string | null
          evidence_number: string
          excluded_reason: string | null
          id: string
          identity_match_status: string
          is_excluded: boolean
          matter_id: string
          provenance_status: string
          record_date: string | null
          relevance: string | null
          review_state: string
          source_id: string | null
          source_locator: string | null
          superseded_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artifact_hash?: string | null
          artifact_ref?: string | null
          artifact_type: string
          authentication_status?: string
          captured_at?: string | null
          collector?: string | null
          created_at?: string
          created_by: string
          custodian?: string | null
          event_date?: string | null
          evidence_number: string
          excluded_reason?: string | null
          id?: string
          identity_match_status?: string
          is_excluded?: boolean
          matter_id: string
          provenance_status?: string
          record_date?: string | null
          relevance?: string | null
          review_state?: string
          source_id?: string | null
          source_locator?: string | null
          superseded_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artifact_hash?: string | null
          artifact_ref?: string | null
          artifact_type?: string
          authentication_status?: string
          captured_at?: string | null
          collector?: string | null
          created_at?: string
          created_by?: string
          custodian?: string | null
          event_date?: string | null
          evidence_number?: string
          excluded_reason?: string | null
          id?: string
          identity_match_status?: string
          is_excluded?: boolean
          matter_id?: string
          provenance_status?: string
          record_date?: string | null
          relevance?: string | null
          review_state?: string
          source_id?: string | null
          source_locator?: string | null
          superseded_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_source_matter_fkey"
            columns: ["matter_id", "source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_superseded_by_matter_fkey"
            columns: ["matter_id", "superseded_by"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      evidence_annotations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          evidence_id: string
          id: string
          matter_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          evidence_id: string
          id?: string
          matter_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          evidence_id?: string
          id?: string
          matter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_annotations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_annotations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_annotations_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_annotations_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          evidence_id: string
          id: string
          matter_id: string
          notes: string | null
          proposition_id: string | null
          relationship: string
          statement_id: string | null
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          evidence_id: string
          id?: string
          matter_id: string
          notes?: string | null
          proposition_id?: string | null
          relationship: string
          statement_id?: string | null
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          evidence_id?: string
          id?: string
          matter_id?: string
          notes?: string | null
          proposition_id?: string | null
          relationship?: string
          statement_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_event_matter_fkey"
            columns: ["matter_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_links_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_proposition_id_fkey"
            columns: ["proposition_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_proposition_matter_fkey"
            columns: ["matter_id", "proposition_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_links_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_statement_matter_fkey"
            columns: ["matter_id", "statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "evidence_links_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_subject_matter_fkey"
            columns: ["matter_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          matter_id: string
          question_id: string | null
          status: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          matter_id: string
          question_id?: string | null
          status?: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          matter_id?: string
          question_id?: string | null
          status?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_question_matter_fkey"
            columns: ["matter_id", "question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "leads_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_subject_matter_fkey"
            columns: ["matter_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      matter_members: {
        Row: {
          created_at: string
          id: string
          matter_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matter_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matter_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_members_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matters: {
        Row: {
          alternative_explanations: string | null
          case_mode: string
          created_at: string
          created_by: string
          defense_theory: string | null
          id: string
          jurisdiction: string | null
          matter_number: string
          name: string
          next_deadline_at: string | null
          opposing_theory: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          alternative_explanations?: string | null
          case_mode: string
          created_at?: string
          created_by: string
          defense_theory?: string | null
          id?: string
          jurisdiction?: string | null
          matter_number: string
          name: string
          next_deadline_at?: string | null
          opposing_theory?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          alternative_explanations?: string | null
          case_mode?: string
          created_at?: string
          created_by?: string
          defense_theory?: string | null
          id?: string
          jurisdiction?: string | null
          matter_number?: string
          name?: string
          next_deadline_at?: string | null
          opposing_theory?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      propositions: {
        Row: {
          assumptions: string | null
          created_at: string
          created_by: string
          id: string
          matter_id: string
          next_action: string | null
          question_id: string
          statement: string
          status: string
          updated_at: string
        }
        Insert: {
          assumptions?: string | null
          created_at?: string
          created_by: string
          id?: string
          matter_id: string
          next_action?: string | null
          question_id: string
          statement: string
          status?: string
          updated_at?: string
        }
        Update: {
          assumptions?: string | null
          created_at?: string
          created_by?: string
          id?: string
          matter_id?: string
          next_action?: string | null
          question_id?: string
          statement?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propositions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propositions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propositions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propositions_question_matter_fkey"
            columns: ["matter_id", "question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          matter_id: string
          owner_id: string | null
          priority: string
          prompt: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          matter_id: string
          owner_id?: string | null
          priority?: string
          prompt: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          matter_id?: string
          owner_id?: string | null
          priority?: string
          prompt?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          byte_size: number | null
          created_at: string
          file_name: string | null
          filters: Json | null
          generated_at: string
          generated_by: string | null
          id: string
          matter_id: string
          report_type: string
          status: string
          title: string
          output_format: string
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          file_name?: string | null
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          matter_id: string
          report_type: string
          status?: string
          title: string
          output_format?: string
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          file_name?: string | null
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          matter_id?: string
          report_type?: string
          status?: string
          title?: string
          output_format?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      review_decisions: {
        Row: {
          created_at: string
          decision: string
          entity_id: string
          entity_type: string
          id: string
          matter_id: string
          notes: string | null
          reviewer_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          entity_id: string
          entity_type: string
          id?: string
          matter_id: string
          notes?: string | null
          reviewer_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          entity_id?: string
          entity_type?: string
          id?: string
          matter_id?: string
          notes?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_decisions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_decisions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          created_by: string
          custodian: string | null
          id: string
          locator: string | null
          matter_id: string
          name: string
          reliability_notes: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          custodian?: string | null
          id?: string
          locator?: string | null
          matter_id: string
          name: string
          reliability_notes?: string | null
          source_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          custodian?: string | null
          id?: string
          locator?: string | null
          matter_id?: string
          name?: string
          reliability_notes?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          evidence_id: string
          id: string
          matter_id: string
          statement_date: string | null
          status: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          evidence_id: string
          id?: string
          matter_id: string
          statement_date?: string | null
          status?: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          evidence_id?: string
          id?: string
          matter_id?: string
          statement_date?: string | null
          status?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_evidence_matter_fkey"
            columns: ["matter_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["matter_id", "id"]
          },
          {
            foreignKeyName: "statements_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_subject_matter_fkey"
            columns: ["matter_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["matter_id", "id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          id: string
          matter_id: string
          subject_type: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          matter_id: string
          subject_type: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          matter_id?: string
          subject_type?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_appointment_packet: {
        Args: { p_token: string }
        Returns: Json
      }
      get_client_portal_home: {
        Args: Record<string, never>
        Returns: Json
      }
      get_client_portal_messages: {
        Args: { p_matter_id: string }
        Returns: Json
      }
      send_client_portal_message: {
        Args: { p_matter_id: string; p_body: string }
        Returns: string
      }
      get_client_portal_documents: {
        Args: { p_matter_id: string }
        Returns: Json
      }
      complete_client_portal_document_upload: {
        Args: { p_request_id: string; p_storage_path: string; p_file_name: string; p_mime_type: string; p_size_bytes: number }
        Returns: string
      }
      submit_appointment_packet: {
        Args: {
          p_token: string
          p_full_name: string
          p_email: string
          p_phone?: string | null
          p_summary?: string | null
          p_goals?: string | null
          p_deadlines?: string | null
          p_engagement_acknowledged?: boolean
          p_field_values?: Json
          p_signature_name?: string | null
          p_signature_consent?: boolean
        }
        Returns: Json
      }
      submit_public_booking_request: {
        Args: {
          p_appointment_type_name: string
          p_email: string
          p_full_name: string
          p_requested_start: string
          p_slug: string
          p_summary?: string | null
        }
        Returns: string
      }
      get_public_booking_slots: {
        Args: { p_appointment_type_name: string; p_days?: number; p_from_date: string; p_slug: string }
        Returns: { slot_start: string }[]
      }
      calendar_slot_check: {
        Args: { p_ends_at: string; p_ignore_appointment_id?: string | null; p_matter_id: string; p_starts_at: string }
        Returns: Json
      }
      create_matter: {
        Args: {
          p_case_mode: string
          p_jurisdiction?: string
          p_matter_number: string
          p_name: string
          p_venue?: string
        }
        Returns: {
          alternative_explanations: string | null
          case_mode: string
          created_at: string
          created_by: string
          defense_theory: string | null
          id: string
          jurisdiction: string | null
          matter_number: string
          name: string
          next_deadline_at: string | null
          opposing_theory: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        SetofOptions: {
          from: "*"
          to: "matters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_matter_role: {
        Args: { p_matter_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_matter_member: { Args: { p_matter_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_matter_id: string
          p_new_value?: Json
          p_previous_value?: Json
          p_summary: string
        }
        Returns: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          matter_id: string
          new_value: Json | null
          previous_value: Json | null
          summary: string
        }
        SetofOptions: {
          from: "*"
          to: "audit_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_review_decision: {
        Args: {
          p_decision: string
          p_entity_id: string
          p_entity_type: string
          p_matter_id: string
          p_notes?: string
        }
        Returns: {
          created_at: string
          decision: string
          entity_id: string
          entity_type: string
          id: string
          matter_id: string
          notes: string | null
          reviewer_id: string
        }
        SetofOptions: {
          from: "*"
          to: "review_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_entity_matter_id: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
