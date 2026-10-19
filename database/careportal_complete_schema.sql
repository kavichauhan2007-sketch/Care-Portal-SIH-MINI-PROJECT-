-- =====================================================================
-- CAREPORTAL COMPLETE UNIFIED DATABASE SCHEMA (Supabase PostgreSQL)
-- Includes Twilio OTP, Real-Time Clinical Summaries, Queue & Doctor EHR
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. ENUMS & TYPES
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'nurse', 'admin', 'system_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE language_type AS ENUM ('en', 'hi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE history_status AS ENUM ('in_progress', 'completed', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('prescription', 'lab_report', 'discharge_summary', 'medical_certificate', 'investigation', 'surgical_record', 'imaging', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'processed', 'verified', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('red_flag', 'contradiction', 'drug_interaction', 'abnormal_lab', 'missing_info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE consent_status AS ENUM ('granted', 'denied', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE priority_type AS ENUM ('normal', 'urgent', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE department_type AS ENUM ('allopathy', 'ayurveda', 'yoga', 'unani', 'siddha', 'homeopathy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. USER PROFILES
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'patient',
    full_name TEXT NOT NULL,
    contact_number TEXT,
    department TEXT,
    specialization TEXT,
    license_number TEXT,
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 3. PATIENTS (Registered via Twilio OTP or ABHA)
-- =====================================================================

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hospital_id TEXT UNIQUE,
    abha_id TEXT UNIQUE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    age INTEGER,
    gender gender_type NOT NULL DEFAULT 'other',
    contact_number TEXT,
    preferred_language language_type DEFAULT 'en',
    emergency_contact TEXT,
    address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_abha_id ON patients(abha_id);
CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients(contact_number);

-- =====================================================================
-- 4. PATIENT SESSIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS patient_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    status session_status DEFAULT 'active',
    language language_type DEFAULT 'en',
    department TEXT,
    current_step TEXT,
    progress INTEGER DEFAULT 0,
    device_info JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_patient ON patient_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON patient_sessions(status);

-- =====================================================================
-- 5. CONSENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '1.0',
    language language_type DEFAULT 'en',
    purpose TEXT[] NOT NULL DEFAULT ARRAY['clinical_assessment', 'abdm_integration'],
    status consent_status DEFAULT 'granted',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_patient ON consents(patient_id);

-- =====================================================================
-- 6. CLINICAL HISTORIES (Questionnaires, SOCRATES, Pain Map)
-- =====================================================================

CREATE TABLE IF NOT EXISTS clinical_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    chief_complaint TEXT NOT NULL DEFAULT '',
    history_of_present_illness TEXT,
    socrates JSONB,
    past_medical_history TEXT[],
    past_surgical_history TEXT[],
    medications JSONB DEFAULT '[]',
    allergies JSONB DEFAULT '[]',
    family_history JSONB DEFAULT '[]',
    personal_history JSONB DEFAULT '{}',
    review_of_systems JSONB DEFAULT '{}',
    completeness_score INTEGER DEFAULT 0,
    missing_information TEXT[],
    status history_status DEFAULT 'in_progress',
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_patient ON clinical_histories(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_status ON clinical_histories(status);

-- =====================================================================
-- 7. CLINICAL SUMMARIES (AI Generated & Synchronized in Real-Time)
-- =====================================================================

CREATE TABLE IF NOT EXISTS clinical_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinical_history_id UUID REFERENCES clinical_histories(id) ON DELETE SET NULL,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    chief_complaint TEXT,
    history_present_illness TEXT,
    past_medical_history TEXT,
    past_surgical_history TEXT,
    medications TEXT,
    allergies TEXT,
    family_history TEXT,
    personal_history TEXT,
    review_of_systems TEXT,
    prior_investigations TEXT,
    ayush_summary TEXT,
    red_flags TEXT[],
    missing_information TEXT[],
    generated_by TEXT DEFAULT 'ai',
    ai_confidence NUMERIC(4,2) DEFAULT 0.95,
    status TEXT DEFAULT 'pending',
    doctor_edits TEXT,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_patient ON clinical_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_summaries_status ON clinical_summaries(status);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON clinical_summaries(created_at DESC);

-- =====================================================================
-- 8. QUEUE ITEMS (Live Doctor OPD Queue)
-- =====================================================================

CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    priority priority_type DEFAULT 'normal',
    department TEXT NOT NULL DEFAULT 'General Medicine',
    token_number TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'waiting',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority);
CREATE INDEX IF NOT EXISTS idx_queue_department ON queue_items(department);
CREATE INDEX IF NOT EXISTS idx_queue_added_at ON queue_items(added_at DESC);

-- =====================================================================
-- 9. ALERTS (Red Flags & Critical Triage)
-- =====================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reason TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- =====================================================================
-- 10. ENABLE SUPABASE REALTIME REPLICATION
-- =====================================================================

-- Add tables to supabase_realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE clinical_summaries;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE patient_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE patients;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================================================================
-- 11. DEVELOPMENT RLS POLICIES (Full Access for Dev & Demo)
-- =====================================================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE consents DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_histories DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

SELECT 'CarePortal Unified Schema successfully applied with Realtime Replication!' AS status;
