import { z } from 'zod';

// ===========================
// USER & AUTHENTICATION
// ===========================

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  ADMIN = 'admin',
  SYSTEM_ADMIN = 'system_admin',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
}

// ===========================
// PATIENT
// ===========================

export interface Patient {
  id: string;
  hospital_id?: string;
  abha_id?: string;
  name: string;
  date_of_birth?: string;
  age?: number;
  gender: Gender;
  contact_number?: string;
  preferred_language: Language;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export const PatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(0).max(150).optional(),
  date_of_birth: z.string().optional(),
  gender: z.nativeEnum(Gender),
  contact_number: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional(),
  preferred_language: z.nativeEnum(Language),
  hospital_id: z.string().optional(),
  abha_id: z.string().optional(),
  emergency_contact: z.string().optional(),
});

// ===========================
// CLINICAL HISTORY
// ===========================

export enum PainSeverity {
  NONE = 0,
  MILD = 1,
  MODERATE = 5,
  SEVERE = 8,
  WORST = 10,
}

export enum OnsetType {
  SUDDEN = 'sudden',
  GRADUAL = 'gradual',
}

export enum PainCharacter {
  SHARP = 'sharp',
  DULL = 'dull',
  ACHING = 'aching',
  BURNING = 'burning',
  STABBING = 'stabbing',
  CRAMPING = 'cramping',
  THROBBING = 'throbbing',
}

export interface PainLocation {
  region: string;
  laterality?: 'left' | 'right' | 'bilateral';
  x?: number;
  y?: number;
  z?: number;
}

export interface SOCRATES {
  site: PainLocation[];
  onset: {
    type: OnsetType;
    time: string;
    duration: string;
  };
  character: PainCharacter[];
  radiation: string[];
  associations: string[];
  time_course: string;
  exacerbating_factors: string[];
  relieving_factors: string[];
  severity: number;
}

export interface ClinicalHistory {
  id: string;
  patient_id: string;
  session_id: string;
  chief_complaint: string;
  history_of_present_illness: string;
  socrates?: SOCRATES;
  past_medical_history: string[];
  past_surgical_history: string[];
  medications: Medication[];
  allergies: Allergy[];
  family_history: FamilyHistory[];
  personal_history: PersonalHistory;
  review_of_systems: ReviewOfSystems;
  completeness_score: number;
  missing_information: string[];
  status: 'in_progress' | 'completed' | 'verified';
  created_at: string;
  updated_at: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  route?: string;
  start_date?: string;
  end_date?: string;
  current: boolean;
  source: string;
  source_id?: string;
  confidence?: number;
}

export interface Allergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  verified: boolean;
  source: string;
}

export interface FamilyHistory {
  relation: string;
  condition: string;
  age_of_onset?: number;
  alive: boolean;
  genetic_risk?: 'low' | 'moderate' | 'high';
}

export interface PersonalHistory {
  occupation?: string;
  marital_status?: string;
  diet: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'other';
  exercise?: string;
  sleep_hours?: number;
  alcohol?: 'never' | 'occasional' | 'regular' | 'heavy';
  smoking?: 'never' | 'former' | 'current';
  tobacco?: boolean;
  substance_use?: string;
}

export interface ReviewOfSystems {
  general?: string[];
  cardiovascular?: string[];
  respiratory?: string[];
  gastrointestinal?: string[];
  genitourinary?: string[];
  musculoskeletal?: string[];
  neurological?: string[];
  psychiatric?: string[];
  endocrine?: string[];
  hematologic?: string[];
  skin?: string[];
}

// ===========================
// AYUSH
// ===========================

export interface AyushAssessment {
  id: string;
  patient_id: string;
  session_id: string;
  department: 'ayurveda' | 'yoga' | 'unani' | 'siddha' | 'homeopathy';
  dashavidha_pariksha?: DashavidhaPariksha;
  prakriti?: Prakriti;
  ahara?: Ahara;
  vihara?: Vihara;
  nidana?: string[];
  created_at: string;
  updated_at: string;
}

export interface DashavidhaPariksha {
  prakriti: string;
  vikriti: string;
  sara: string;
  samhanana: string;
  pramana: string;
  satmya: string;
  sattva: string;
  ahara_shakti: string;
  vyayama_shakti: string;
  vaya: string;
}

export interface Prakriti {
  vata: number;
  pitta: number;
  kapha: number;
  dominant: 'vata' | 'pitta' | 'kapha' | 'vata_pitta' | 'pitta_kapha' | 'vata_kapha' | 'sama';
}

export interface Ahara {
  rasa_preference: string[];
  meal_timing: string;
  quantity: string;
  dietary_restrictions: string[];
}

export interface Vihara {
  sleep_pattern: string;
  exercise_routine: string;
  stress_level: 'low' | 'moderate' | 'high';
  daily_routine: string;
}

// ===========================
// DOCUMENTS
// ===========================

export enum DocumentType {
  PRESCRIPTION = 'prescription',
  LAB_REPORT = 'lab_report',
  DISCHARGE_SUMMARY = 'discharge_summary',
  MEDICAL_CERTIFICATE = 'medical_certificate',
  INVESTIGATION = 'investigation',
  SURGICAL_RECORD = 'surgical_record',
  IMAGING = 'imaging',
  OTHER = 'other',
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export interface Document {
  id: string;
  patient_id: string;
  session_id?: string;
  type: DocumentType;
  file_url: string;
  thumbnail_url?: string;
  mime_type: string;
  file_size: number;
  upload_date: string;
  ocr_status: DocumentStatus;
  extraction_status: DocumentStatus;
  verification_status: DocumentStatus;
  uploaded_via: 'camera' | 'qr_code' | 'upload';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  ocr_text: string;
  entities: MedicalEntity[];
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
}

export interface MedicalEntity {
  type: 'medication' | 'diagnosis' | 'procedure' | 'lab_result' | 'vital' | 'date' | 'doctor' | 'hospital';
  value: string;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
  metadata?: Record<string, any>;
  verified: boolean;
}

// ===========================
// MEDICAL TIMELINE
// ===========================

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_type: 'diagnosis' | 'surgery' | 'medication' | 'investigation' | 'hospitalization' | 'procedure' | 'consultation';
  title: string;
  description: string;
  date: string;
  source_type: 'patient_reported' | 'document' | 'doctor_verified';
  source_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ===========================
// RED FLAGS & ALERTS
// ===========================

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  patient_id: string;
  session_id?: string;
  alert_type: 'red_flag' | 'contradiction' | 'drug_interaction' | 'abnormal_lab' | 'missing_info';
  severity: AlertSeverity;
  title: string;
  description: string;
  reason: string;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata?: Record<string, any>;
}

// ===========================
// SUMMARY
// ===========================

export interface ClinicalSummary {
  id: string;
  patient_id: string;
  clinical_history_id: string;
  session_id: string;
  chief_complaint: string;
  history_present_illness: string;
  past_medical_history: string;
  past_surgical_history: string;
  medications: string;
  allergies: string;
  family_history: string;
  personal_history: string;
  review_of_systems: string;
  prior_investigations: string;
  ayush_summary?: string;
  red_flags: string[];
  missing_information: string[];
  generated_by: 'ai' | 'doctor';
  ai_confidence?: number;
  status: 'pending' | 'doctor_reviewed' | 'verified';
  doctor_edits?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// ===========================
// CONSENT
// ===========================

export interface Consent {
  id: string;
  patient_id: string;
  session_id: string;
  version: string;
  language: Language;
  purpose: string[];
  status: 'granted' | 'denied' | 'withdrawn';
  granted_at?: string;
  withdrawn_at?: string;
  device_info?: string;
  ip_address?: string;
  created_at: string;
}

// ===========================
// SESSION
// ===========================

export interface PatientSession {
  id: string;
  patient_id?: string;
  status: 'active' | 'completed' | 'abandoned' | 'timeout';
  language: Language;
  department?: string;
  current_step: string;
  progress: number;
  device_info?: string;
  started_at: string;
  completed_at?: string;
  last_activity: string;
}

// ===========================
// QUESTIONS
// ===========================

export enum QuestionType {
  TEXT = 'text',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  NUMBER = 'number',
  DATE = 'date',
  SCALE = 'scale',
  VOICE = 'voice',
}

export interface Question {
  id: string;
  category: string;
  question_en: string;
  question_hi: string;
  question_type: QuestionType;
  options?: string[];
  validation?: Record<string, any>;
  required: boolean;
  follow_up_rules?: Record<string, string>;
  priority: number;
  department?: string;
  condition?: string;
}

export interface Answer {
  question_id: string;
  value: string | number | string[];
  confidence?: number;
  input_method: 'voice' | 'touch' | 'text';
  timestamp: string;
  source?: string;
}

// ===========================
// QUEUE
// ===========================

export interface QueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  age: number;
  gender: Gender;
  chief_complaint: string;
  priority: 'normal' | 'urgent' | 'critical';
  history_status: 'incomplete' | 'complete' | 'verified';
  red_flags_count: number;
  documents_count: number;
  department: string;
  token_number?: string;
  added_at: string;
  updated_at: string;
}

// ===========================
// AUDIT LOG
// ===========================

export interface AuditLog {
  id: string;
  user_id?: string;
  user_role?: UserRole;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// ===========================
// DEPARTMENT
// ===========================

export interface Department {
  id: string;
  name: string;
  type: 'allopathy' | 'ayurveda' | 'yoga' | 'unani' | 'siddha' | 'homeopathy';
  active: boolean;
  created_at: string;
}

// ===========================
// SYSTEM SETTINGS
// ===========================

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// ===========================
// FHIR TYPES
// ===========================

export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name?: Array<{
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
  }>;
}

// ===========================
// API RESPONSES
// ===========================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ===========================
// FORM VALIDATION SCHEMAS
// ===========================

export const ChiefComplaintSchema = z.object({
  complaint: z.string().min(3, 'Please describe your main concern'),
  duration: z.string().optional(),
});

export const MedicationSchema = z.object({
  name: z.string().min(2, 'Medication name required'),
  dosage: z.string().min(1, 'Dosage required'),
  frequency: z.string().min(1, 'Frequency required'),
  current: z.boolean(),
});

export const AllergySchema = z.object({
  allergen: z.string().min(2, 'Allergen name required'),
  reaction: z.string().min(2, 'Reaction description required'),
  severity: z.enum(['mild', 'moderate', 'severe']),
});

export const FamilyHistorySchema = z.object({
  relation: z.string().min(2, 'Relation required'),
  condition: z.string().min(2, 'Condition required'),
  age_of_onset: z.number().min(0).max(150).optional(),
  alive: z.boolean(),
});

export type CreatePatientInput = z.infer<typeof PatientSchema>;
export type CreateChiefComplaintInput = z.infer<typeof ChiefComplaintSchema>;
export type CreateMedicationInput = z.infer<typeof MedicationSchema>;
export type CreateAllergyInput = z.infer<typeof AllergySchema>;
export type CreateFamilyHistoryInput = z.infer<typeof FamilyHistorySchema>;
