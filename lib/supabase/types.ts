export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
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
            foreignKeyName: "analyses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
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
            foreignKeyName: "analysis_conclusion_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
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
            foreignKeyName: "contradictions_proposition_b_id_fkey"
            columns: ["proposition_b_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_statement_a_id_fkey"
            columns: ["statement_a_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_statement_b_id_fkey"
            columns: ["statement_b_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
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
            foreignKeyName: "entity_attributes_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "entity_attributes"
            referencedColumns: ["id"]
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
            foreignKeyName: "evidence_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
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
            foreignKeyName: "evidence_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
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
            foreignKeyName: "evidence_links_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
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
            foreignKeyName: "leads_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
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
          created_at: string
          filters: Json | null
          generated_at: string
          generated_by: string | null
          id: string
          matter_id: string
          report_type: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          matter_id: string
          report_type: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          matter_id?: string
          report_type?: string
          status?: string
          title?: string
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
      create_matter: {
        Args: {
          p_case_mode: string
          p_jurisdiction?: string
          p_matter_number: string
          p_name: string
          p_role?: string
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
