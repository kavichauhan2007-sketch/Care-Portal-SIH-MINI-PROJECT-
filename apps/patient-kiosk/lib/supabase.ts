import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Kiosk mode - don't persist sessions
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Server-side client with service role key
export const supabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Database types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string | null;
          hospital_id: string | null;
          abha_id: string | null;
          name: string;
          date_of_birth: string | null;
          age: number | null;
          gender: 'male' | 'female' | 'other';
          contact_number: string | null;
          preferred_language: 'en' | 'hi';
          emergency_contact: string | null;
          address: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      patient_sessions: {
        Row: {
          id: string;
          patient_id: string | null;
          status: 'active' | 'completed' | 'abandoned' | 'timeout';
          language: 'en' | 'hi';
          department: string | null;
          current_step: string | null;
          progress: number;
          device_info: Json | null;
          started_at: string;
          completed_at: string | null;
          last_activity: string;
        };
        Insert: Omit<Database['public']['Tables']['patient_sessions']['Row'], 'id' | 'started_at' | 'last_activity'>;
        Update: Partial<Database['public']['Tables']['patient_sessions']['Insert']>;
      };
      clinical_histories: {
        Row: {
          id: string;
          patient_id: string;
          session_id: string | null;
          chief_complaint: string;
          history_of_present_illness: string | null;
          socrates: Json | null;
          past_medical_history: string[];
          past_surgical_history: string[];
          medications: Json;
          allergies: Json;
          family_history: Json;
          personal_history: Json;
          review_of_systems: Json;
          completeness_score: number;
          missing_information: string[];
          status: 'in_progress' | 'completed' | 'verified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clinical_histories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clinical_histories']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          patient_id: string;
          session_id: string | null;
          type: string;
          file_url: string;
          thumbnail_url: string | null;
          mime_type: string;
          file_size: number | null;
          upload_date: string;
          ocr_status: string;
          extraction_status: string;
          verification_status: string;
          uploaded_via: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'upload_date' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          patient_id: string;
          session_id: string | null;
          alert_type: string;
          severity: 'info' | 'warning' | 'critical';
          title: string;
          description: string | null;
          reason: string | null;
          triggered_at: string;
          acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'triggered_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
      clinical_summaries: {
        Row: {
          id: string;
          patient_id: string;
          clinical_history_id: string;
          session_id: string | null;
          chief_complaint: string | null;
          history_present_illness: string | null;
          past_medical_history: string | null;
          past_surgical_history: string | null;
          medications: string | null;
          allergies: string | null;
          family_history: string | null;
          personal_history: string | null;
          review_of_systems: string | null;
          prior_investigations: string | null;
          ayush_summary: string | null;
          red_flags: string[];
          missing_information: string[];
          generated_by: string;
          ai_confidence: number | null;
          status: string;
          doctor_edits: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clinical_summaries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clinical_summaries']['Insert']>;
      };
      questions: {
        Row: {
          id: string;
          category: string;
          question_en: string;
          question_hi: string;
          question_type: string;
          options: Json | null;
          validation: Json | null;
          required: boolean;
          follow_up_rules: Json | null;
          priority: number;
          department: string | null;
          condition: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_audit_log: {
        Args: {
          p_action: string;
          p_resource_type: string;
          p_resource_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
      calculate_completeness_score: {
        Args: {
          p_history_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
