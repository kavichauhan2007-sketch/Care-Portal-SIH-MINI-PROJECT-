-- CarePortal Database Schema for Supabase (PostgreSQL)
-- This schema uses Supabase Auth for user management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- ===========================
-- ENUMS
-- ===========================

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'nurse', 'admin', 'system_admin');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE language_type AS ENUM ('en', 'hi');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned', 'timeout');
CREATE TYPE history_status AS ENUM ('in_progress', 'completed', 'verified');
CREATE TYPE document_type AS ENUM ('prescription', 'lab_report', 'discharge_summary', 'medical_certificate', 'investigation', 'surgical_record', 'imaging', 'other');
CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'processed', 'verified', 'failed');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_type AS ENUM ('red_flag', 'contradiction', 'drug_interaction', 'abnormal_lab', 'missing_info');
CREATE TYPE consent_status AS ENUM ('granted', 'denied', 'withdrawn');
CREATE TYPE priority_type AS ENUM ('normal', 'urgent', 'critical');
CREATE TYPE department_type AS ENUM ('allopathy', 'ayurveda', 'yoga', 'unani', 'siddha', 'homeopathy');

-- ===========================
-- USER PROFILES (extends Supabase Auth)
-- ===========================

CREATE TABLE user_profiles (
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

-- ===========================
-- PATIENTS
-- ===========================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hospital_id TEXT UNIQUE,
    abha_id TEXT UNIQUE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    age INTEGER,
    gender gender_type NOT NULL,
    contact_number TEXT,
    preferred_language language_type DEFAULT 'en',
    emergency_contact TEXT,
    address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_abha_id ON patients(abha_id);
CREATE INDEX idx_patients_contact ON patients(contact_number);

-- ===========================
-- PATIENT SESSIONS
-- ===========================

CREATE TABLE patient_sessions (
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

CREATE INDEX idx_sessions_patient ON patient_sessions(patient_id);
CREATE INDEX idx_sessions_status ON patient_sessions(status);

-- ===========================
-- CONSENT
-- ===========================

CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '1.0',
    language language_type DEFAULT 'en',
    purpose TEXT[] NOT NULL,
    status consent_status DEFAULT 'granted',
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consents_patient ON consents(patient_id);

-- ===========================
-- CLINICAL HISTORY
-- ===========================

CREATE TABLE clinical_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    chief_complaint TEXT NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clinical_patient ON clinical_histories(patient_id);
CREATE INDEX idx_clinical_status ON clinical_histories(status);

-- ===========================
-- QUESTIONS & ANSWERS
-- ===========================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    question_en TEXT NOT NULL,
    question_hi TEXT NOT NULL,
    question_type TEXT NOT NULL,
    options JSONB,
    validation JSONB,
    required BOOLEAN DEFAULT FALSE,
    follow_up_rules JSONB,
    priority INTEGER DEFAULT 0,
    department TEXT,
    condition TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_questions_category ON questions(category);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    confidence NUMERIC(3,2),
    input_method TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_answers_session ON answers(session_id);

-- ===========================
-- AYUSH ASSESSMENTS
-- ===========================

CREATE TABLE ayush_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    department department_type NOT NULL,
    dashavidha_pariksha JSONB,
    prakriti JSONB,
    ahara JSONB,
    vihara JSONB,
    nidana TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ayush_patient ON ayush_assessments(patient_id);

-- ===========================
-- DOCUMENTS
-- ===========================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    type document_type NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type TEXT NOT NULL,
    file_size BIGINT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ocr_status document_status DEFAULT 'uploaded',
    extraction_status document_status DEFAULT 'uploaded',
    verification_status document_status DEFAULT 'uploaded',
    uploaded_via TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_documents_type ON documents(type);

-- ===========================
-- DOCUMENT EXTRACTIONS
-- ===========================

CREATE TABLE document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    ocr_text TEXT,
    entities JSONB DEFAULT '[]',
    confidence_score NUMERIC(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extractions_document ON document_extractions(document_id);

-- ===========================
-- MEDICAL TIMELINE
-- ===========================

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    source_type TEXT,
    source_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_timeline_patient ON timeline_events(patient_id);
CREATE INDEX idx_timeline_date ON timeline_events(event_date);

-- ===========================
-- ALERTS
-- ===========================

CREATE TABLE alerts (
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

CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);

-- ===========================
-- CLINICAL SUMMARIES
-- ===========================

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

-- ===========================
-- QUEUE
-- ===========================

CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    priority priority_type DEFAULT 'normal',
    department TEXT NOT NULL,
    token_number TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'waiting',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority);
CREATE INDEX IF NOT EXISTS idx_queue_department ON queue_items(department);

-- ===========================
-- DEPARTMENTS
-- ===========================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type department_type DEFAULT 'allopathy',
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- AUDIT LOGS
-- ===========================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_role user_role,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- ===========================
-- SYSTEM SETTINGS
-- ===========================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    category TEXT,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- TRIGGERS FOR UPDATED_AT
-- ===========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_histories_updated_at BEFORE UPDATE ON clinical_histories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ayush_assessments_updated_at BEFORE UPDATE ON ayush_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_summaries_updated_at BEFORE UPDATE ON clinical_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queue_items_updated_at BEFORE UPDATE ON queue_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- ROW LEVEL SECURITY (RLS)
-- ===========================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayush_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON user_profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'system_admin')
    )
);

-- Patients: Doctors, nurses, and admins can access patient records
CREATE POLICY "Healthcare staff can access patients" ON patients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin', 'system_admin')
    )
);

-- Clinical data: Healthcare staff can access
CREATE POLICY "Healthcare staff can access clinical data" ON clinical_histories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin', 'system_admin')
    )
);

-- Documents: Healthcare staff can access
CREATE POLICY "Healthcare staff can access documents" ON documents FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin', 'system_admin')
    )
);

-- Audit logs: System admins only
CREATE POLICY "System admins can access audit logs" ON audit_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'system_admin'
    )
);

-- System settings: Admins only
CREATE POLICY "Admins can manage system settings" ON system_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'system_admin')
    )
);

-- Departments: All authenticated users can read
CREATE POLICY "Authenticated users can read departments" ON departments FOR SELECT USING (auth.role() = 'authenticated');

-- Questions: All authenticated users can read
CREATE POLICY "Authenticated users can read questions" ON questions FOR SELECT USING (auth.role() = 'authenticated');

-- ===========================
-- FUNCTIONS
-- ===========================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_role user_role;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM user_profiles WHERE id = auth.uid();
    
    -- Insert audit log
    INSERT INTO audit_logs (user_id, user_role, action, resource_type, resource_id, details)
    VALUES (auth.uid(), v_user_role, p_action, p_resource_type, p_resource_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate history completeness score
CREATE OR REPLACE FUNCTION calculate_completeness_score(p_history_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_history clinical_histories;
BEGIN
    SELECT * INTO v_history FROM clinical_histories WHERE id = p_history_id;
    
    -- Chief complaint (mandatory)
    IF v_history.chief_complaint IS NOT NULL AND v_history.chief_complaint != '' THEN
        v_score := v_score + 15;
    END IF;
    
    -- HPI
    IF v_history.history_of_present_illness IS NOT NULL AND v_history.history_of_present_illness != '' THEN
        v_score := v_score + 15;
    END IF;
    
    -- Past medical history
    IF array_length(v_history.past_medical_history, 1) > 0 THEN
        v_score := v_score + 10;
    END IF;
    
    -- Medications
    IF jsonb_array_length(v_history.medications) > 0 THEN
        v_score := v_score + 15;
    END IF;
    
    -- Allergies
    IF jsonb_array_length(v_history.allergies) > 0 THEN
        v_score := v_score + 10;
    END IF;
    
    -- Family history
    IF jsonb_array_length(v_history.family_history) > 0 THEN
        v_score := v_score + 10;
    END IF;
    
    -- Personal history
    IF v_history.personal_history IS NOT NULL THEN
        v_score := v_score + 10;
    END IF;
    
    -- Review of systems
    IF v_history.review_of_systems IS NOT NULL THEN
        v_score := v_score + 15;
    END IF;
    
    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- VIEWS
-- ===========================

-- Patient Queue View
CREATE OR REPLACE VIEW patient_queue_view AS
SELECT 
    q.id,
    q.patient_id,
    p.name AS patient_name,
    p.age,
    p.gender,
    ch.chief_complaint,
    q.priority,
    ch.status AS history_status,
    COUNT(DISTINCT a.id) FILTER (WHERE a.acknowledged = FALSE) AS red_flags_count,
    COUNT(DISTINCT d.id) AS documents_count,
    q.department,
    q.token_number,
    q.added_at,
    q.updated_at
FROM queue_items q
JOIN patients p ON q.patient_id = p.id
LEFT JOIN clinical_histories ch ON ch.patient_id = p.id AND ch.session_id = q.session_id
LEFT JOIN alerts a ON a.patient_id = p.id AND a.session_id = q.session_id AND a.severity = 'critical'
LEFT JOIN documents d ON d.patient_id = p.id AND d.session_id = q.session_id
GROUP BY q.id, p.id, ch.id
ORDER BY q.priority DESC, q.added_at ASC;

-- Grant access to the view
GRANT SELECT ON patient_queue_view TO authenticated;

COMMENT ON DATABASE postgres IS 'CarePortal - AI-Powered Clinical Intake Platform';
