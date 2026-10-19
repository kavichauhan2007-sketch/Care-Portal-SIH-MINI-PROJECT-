-- ================================================
-- ADD NEW FEATURES TO DATABASE
-- ================================================
-- Pain locations, family history, and enhanced features

-- ================================================
-- PAIN LOCATIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS pain_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    history_id UUID REFERENCES clinical_histories(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
    body_part TEXT NOT NULL,
    intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
    x_position DECIMAL,
    y_position DECIMAL,
    view TEXT CHECK (view IN ('front', 'back')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_locations_history ON pain_locations(history_id);
CREATE INDEX IF NOT EXISTS idx_pain_locations_patient ON pain_locations(patient_id);

-- Disable RLS for development
ALTER TABLE pain_locations DISABLE ROW LEVEL SECURITY;

-- ================================================
-- FAMILY MEDICAL HISTORY TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS family_medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    condition TEXT NOT NULL,
    age_of_onset INTEGER,
    status TEXT CHECK (status IN ('alive', 'deceased', 'unknown')),
    genetic_marker TEXT,
    notes TEXT,
    severity TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_history_patient ON family_medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_history_condition ON family_medical_history(condition);

-- Disable RLS for development
ALTER TABLE family_medical_history DISABLE ROW LEVEL SECURITY;

-- ================================================
-- PREVIOUS RECORDS LINKS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS previous_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    record_date DATE,
    hospital_name TEXT,
    doctor_name TEXT,
    diagnosis TEXT,
    treatment TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    linked_history_id UUID REFERENCES clinical_histories(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_previous_records_patient ON previous_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_previous_records_date ON previous_records(record_date);

-- Disable RLS for development
ALTER TABLE previous_records DISABLE ROW LEVEL SECURITY;

-- ================================================
-- CONSENT TRACKING TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS consent_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
    consent_version TEXT DEFAULT '1.0',
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    device_info JSONB,
    consent_text TEXT,
    signature_data TEXT,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_tracking_patient ON consent_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_tracking_session ON consent_tracking(session_id);

-- Disable RLS for development
ALTER TABLE consent_tracking DISABLE ROW LEVEL SECURITY;

-- ================================================
-- UPDATE EXISTING TABLES
-- ================================================

-- Add columns to clinical_histories if they don't exist
ALTER TABLE clinical_histories 
ADD COLUMN IF NOT EXISTS pain_description TEXT,
ADD COLUMN IF NOT EXISTS symptom_duration TEXT,
ADD COLUMN IF NOT EXISTS symptom_severity TEXT,
ADD COLUMN IF NOT EXISTS aggravating_factors TEXT[],
ADD COLUMN IF NOT EXISTS relieving_factors TEXT[];

-- Add columns to patient_sessions if they don't exist
ALTER TABLE patient_sessions
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS documents_uploaded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pain_locations_added INTEGER DEFAULT 0;

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE TRIGGER update_family_medical_history_updated_at 
BEFORE UPDATE ON family_medical_history 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to get patient's family history summary
CREATE OR REPLACE FUNCTION get_family_history_summary(p_patient_id UUID)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'relation', relation,
            'condition', condition,
            'status', status,
            'age_of_onset', age_of_onset
        )
    ) INTO v_summary
    FROM family_medical_history
    WHERE patient_id = p_patient_id;
    
    RETURN COALESCE(v_summary, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Function to get pain location summary
CREATE OR REPLACE FUNCTION get_pain_summary(p_history_id UUID)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'body_part', body_part,
            'intensity', intensity,
            'view', view
        ) ORDER BY intensity DESC
    ) INTO v_summary
    FROM pain_locations
    WHERE history_id = p_history_id;
    
    RETURN COALESCE(v_summary, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE pain_locations IS '3D body pain location tracking with intensity';
COMMENT ON TABLE family_medical_history IS 'Family medical history and genetic information';
COMMENT ON TABLE previous_records IS 'Links to previous medical records and visits';
COMMENT ON TABLE consent_tracking IS 'Patient consent tracking with audit trail';

-- ================================================
-- VERIFICATION
-- ================================================

SELECT 'New features added successfully!' AS status;

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('pain_locations', 'family_medical_history', 'previous_records', 'consent_tracking')
ORDER BY table_name;
