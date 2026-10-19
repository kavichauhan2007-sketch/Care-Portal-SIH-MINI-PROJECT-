-- CarePortal Seed Data for Development and SIH Demo

-- ===========================
-- DEPARTMENTS
-- ===========================

INSERT INTO departments (name, type, active) VALUES
('General Medicine', 'allopathy', TRUE),
('Cardiology', 'allopathy', TRUE),
('Orthopedics', 'allopathy', TRUE),
('Pediatrics', 'allopathy', TRUE),
('Gynecology', 'allopathy', TRUE),
('Ayurveda', 'ayurveda', TRUE),
('Yoga & Naturopathy', 'yoga', TRUE),
('Unani', 'unani', TRUE),
('Siddha', 'siddha', TRUE),
('Homeopathy', 'homeopathy', TRUE);

-- ===========================
-- SYSTEM SETTINGS
-- ===========================

INSERT INTO system_settings (key, value, category, description) VALUES
('session_timeout_minutes', '5', 'session', 'Patient kiosk session timeout in minutes'),
('session_warning_minutes', '4', 'session', 'Show warning before timeout'),
('max_file_size_mb', '10', 'upload', 'Maximum file upload size'),
('enable_voice', 'true', 'features', 'Enable voice input/output'),
('enable_3d_pain_map', 'true', 'features', 'Enable 3D anatomical pain map'),
('enable_ayush', 'true', 'features', 'Enable AYUSH modules'),
('default_language', 'en', 'i18n', 'Default application language'),
('supported_languages', 'en,hi', 'i18n', 'Comma-separated supported languages'),
('red_flag_chest_pain_keywords', 'severe,crushing,radiating,breathless', 'clinical', 'Keywords for chest pain red flags'),
('completeness_threshold', '70', 'clinical', 'Minimum history completeness score');

-- ===========================
-- CLINICAL QUESTIONS BANK
-- ===========================

-- Chief Complaint Questions
INSERT INTO questions (category, question_en, question_hi, question_type, required, priority) VALUES
('chief_complaint', 'What brings you to the hospital today?', 'आज आप अस्पताल क्यों आए हैं?', 'text', TRUE, 100),
('chief_complaint', 'When did this problem start?', 'यह समस्या कब शुरू हुई?', 'text', TRUE, 90),
('chief_complaint', 'How severe is your problem on a scale of 0-10?', '0-10 के पैमाने पर आपकी समस्या कितनी गंभीर है?', 'scale', TRUE, 85);

-- Chest Pain Specific
INSERT INTO questions (category, question_en, question_hi, question_type, condition, priority, required) VALUES
('symptom', 'Did the chest pain start suddenly or gradually?', 'क्या सीने का दर्द अचानक शुरू हुआ या धीरे-धीरे?', 'single_choice', 'chest_pain', 80, TRUE),
('symptom', 'Does the pain spread to your arm, shoulder, back, neck, or jaw?', 'क्या दर्द आपकी बांह, कंधे, पीठ, गर्दन या जबड़े तक फैलता है?', 'multiple_choice', 'chest_pain', 75, TRUE),
('symptom', 'Do you have difficulty breathing?', 'क्या आपको सांस लेने में कठिनाई हो रही है?', 'single_choice', 'chest_pain', 85, TRUE),
('symptom', 'Are you experiencing sweating, nausea, or dizziness?', 'क्या आपको पसीना, मतली या चक्कर आ रहा है?', 'multiple_choice', 'chest_pain', 80, TRUE);

-- Pain Characteristics
INSERT INTO questions (category, question_en, question_hi, question_type, options, priority) VALUES
('pain', 'How would you describe the pain?', 'आप दर्द को कैसे बताएंगे?', 'multiple_choice', '["sharp", "dull", "aching", "burning", "stabbing", "cramping", "throbbing"]', 70),
('pain', 'What makes the pain worse?', 'किस चीज से दर्द बढ़ता है?', 'text', NULL, 65),
('pain', 'What makes the pain better?', 'किस चीज से दर्द कम होता है?', 'text', NULL, 65);

-- Past Medical History
INSERT INTO questions (category, question_en, question_hi, question_type, priority) VALUES
('past_medical', 'Do you have any chronic medical conditions?', 'क्या आपको कोई पुरानी बीमारी है?', 'text', 60),
('past_medical', 'Have you had any surgeries in the past?', 'क्या आपकी पहले कभी सर्जरी हुई है?', 'text', 55),
('past_medical', 'Have you been hospitalized before?', 'क्या आप पहले कभी अस्पताल में भर्ती हुए हैं?', 'single_choice', 50);

-- Medications
INSERT INTO questions (category, question_en, question_hi, question_type, priority, required) VALUES
('medication', 'Are you currently taking any medicines?', 'क्या आप वर्तमान में कोई दवा ले रहे हैं?', 'single_choice', 70, TRUE),
('medication', 'Please list all your current medications', 'कृपया अपनी सभी वर्तमान दवाओं की सूची बताएं', 'text', 65, FALSE);

-- Allergies
INSERT INTO questions (category, question_en, question_hi, question_type, priority, required) VALUES
('allergy', 'Do you have any drug allergies?', 'क्या आपको किसी दवा से एलर्जी है?', 'single_choice', 90, TRUE),
('allergy', 'Do you have any food allergies?', 'क्या आपको किसी खाने की चीज से एलर्जी है?', 'single_choice', 60, FALSE);

-- Family History
INSERT INTO questions (category, question_en, question_hi, question_type, priority) VALUES
('family_history', 'Does anyone in your family have diabetes?', 'क्या आपके परिवार में किसी को मधुमेह है?', 'single_choice', 50),
('family_history', 'Does anyone in your family have heart disease?', 'क्या आपके परिवार में किसी को हृदय रोग है?', 'single_choice', 55),
('family_history', 'Does anyone in your family have high blood pressure?', 'क्या आपके परिवार में किसी को उच्च रक्तचाप है?', 'single_choice', 50),
('family_history', 'Does anyone in your family have cancer?', 'क्या आपके परिवार में किसी को कैंसर है?', 'single_choice', 45),
('family_history', 'Does anyone in your family have asthma?', 'क्या आपके परिवार में किसी को दमा है?', 'single_choice', 40);

-- Personal History
INSERT INTO questions (category, question_en, question_hi, question_type, options, priority) VALUES
('personal', 'What is your dietary preference?', 'आपका आहार क्या है?', 'single_choice', '["vegetarian", "non_vegetarian", "vegan", "other"]', 40),
('personal', 'Do you exercise regularly?', 'क्या आप नियमित रूप से व्यायाम करते हैं?', 'single_choice', NULL, 35),
('personal', 'How many hours do you sleep per night?', 'आप प्रति रात कितने घंटे सोते हैं?', 'number', NULL, 35),
('personal', 'Do you smoke?', 'क्या आप धूम्रपान करते हैं?', 'single_choice', '["never", "former", "current"]', 60),
('personal', 'Do you consume alcohol?', 'क्या आप शराब पीते हैं?', 'single_choice', '["never", "occasional", "regular", "heavy"]', 55);

-- AYUSH Questions (Ayurveda)
INSERT INTO questions (category, question_en, question_hi, question_type, department, priority) VALUES
('ayush_prakriti', 'Do you feel cold easily?', 'क्या आपको आसानी से ठंड लगती है?', 'single_choice', 'ayurveda', 30),
('ayush_prakriti', 'Do you have dry skin?', 'क्या आपकी त्वचा शुष्क है?', 'single_choice', 'ayurveda', 30),
('ayush_prakriti', 'How is your digestion?', 'आपका पाचन कैसा है?', 'single_choice', 'ayurveda', 35),
('ayush_ahara', 'What type of food do you prefer?', 'आप किस प्रकार का भोजन पसंद करते हैं?', 'text', 'ayurveda', 30),
('ayush_ahara', 'What time do you usually eat dinner?', 'आप आमतौर पर रात का खाना किस समय खाते हैं?', 'text', 'ayurveda', 25),
('ayush_vihara', 'What is your daily routine like?', 'आपकी दिनचर्या कैसी है?', 'text', 'ayurveda', 25),
('ayush_vihara', 'How do you manage stress?', 'आप तनाव का प्रबंधन कैसे करते हैं?', 'text', 'ayurveda', 25);

-- ===========================
-- DEMO PATIENTS
-- ===========================

-- Demo Patient 1: Chest Pain Red Flag Case
INSERT INTO patients (name, age, gender, contact_number, preferred_language, hospital_id, abha_id) VALUES
('Rajesh Kumar', 58, 'male', '9876543210', 'hi', 'HOSP001', '12-3456-7890-1234');

-- Demo Patient 2: AYUSH Patient
INSERT INTO patients (name, age, gender, contact_number, preferred_language, hospital_id) VALUES
('Priya Sharma', 35, 'female', '9876543211', 'hi', 'HOSP002');

-- Demo Patient 3: Routine Checkup
INSERT INTO patients (name, age, gender, contact_number, preferred_language, hospital_id) VALUES
('Amit Patel', 42, 'male', '9876543212', 'en', 'HOSP003');

-- Demo Patient 4: Pediatric
INSERT INTO patients (name, age, gender, contact_number, preferred_language, hospital_id) VALUES
('Aarav Singh', 8, 'male', '9876543213', 'hi', 'HOSP004');

-- Demo Patient 5: Elderly with multiple conditions
INSERT INTO patients (name, age, gender, contact_number, preferred_language, hospital_id, abha_id) VALUES
('Lakshmi Devi', 72, 'female', '9876543214', 'hi', 'HOSP005', '12-3456-7890-5678');

-- ===========================
-- DEMO CLINICAL HISTORY (for completed patient)
-- ===========================

DO $$
DECLARE
    v_patient_id UUID;
    v_history_id UUID;
    v_session_id UUID;
BEGIN
    -- Get demo patient ID
    SELECT id INTO v_patient_id FROM patients WHERE hospital_id = 'HOSP005';
    
    -- Create session
    INSERT INTO patient_sessions (patient_id, status, language, department, current_step, progress, completed_at)
    VALUES (v_patient_id, 'completed', 'hi', 'General Medicine', 'completed', 100, NOW() - INTERVAL '1 day')
    RETURNING id INTO v_session_id;
    
    -- Create consent
    INSERT INTO consents (patient_id, session_id, purpose, status, granted_at)
    VALUES (v_patient_id, v_session_id, ARRAY['clinical_history', 'document_processing', 'ai_assistance'], 'granted', NOW() - INTERVAL '1 day');
    
    -- Create clinical history
    INSERT INTO clinical_histories (
        patient_id, 
        session_id, 
        chief_complaint, 
        history_of_present_illness,
        past_medical_history,
        past_surgical_history,
        medications,
        allergies,
        family_history,
        personal_history,
        completeness_score,
        status
    ) VALUES (
        v_patient_id,
        v_session_id,
        'Joint pain in knees for 6 months',
        'Patient reports bilateral knee pain that started 6 months ago. Pain is worse with walking and climbing stairs. No trauma history. Pain rated 6/10. Some relief with rest.',
        ARRAY['Type 2 Diabetes Mellitus (15 years)', 'Hypertension (10 years)', 'Osteoarthritis'],
        ARRAY['Cataract surgery both eyes (2018)'],
        '[
            {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily", "current": true, "source": "patient_reported"},
            {"name": "Amlodipine", "dosage": "5mg", "frequency": "once daily", "current": true, "source": "patient_reported"},
            {"name": "Paracetamol", "dosage": "650mg", "frequency": "as needed", "current": true, "source": "patient_reported"}
        ]'::jsonb,
        '[
            {"allergen": "Penicillin", "reaction": "Skin rash", "severity": "moderate", "verified": true, "source": "patient_reported"}
        ]'::jsonb,
        '[
            {"relation": "Mother", "condition": "Diabetes", "alive": false},
            {"relation": "Father", "condition": "Hypertension", "alive": false},
            {"relation": "Sister", "condition": "Arthritis", "alive": true, "age_of_onset": 55}
        ]'::jsonb,
        '{
            "diet": "vegetarian",
            "exercise": "Light walking daily",
            "sleep_hours": 7,
            "smoking": "never",
            "alcohol": "never"
        }'::jsonb,
        85,
        'completed'
    ) RETURNING id INTO v_history_id;
    
    -- Create timeline events
    INSERT INTO timeline_events (patient_id, event_type, title, description, event_date, source_type) VALUES
    (v_patient_id, 'diagnosis', 'Type 2 Diabetes Mellitus Diagnosed', 'Diagnosed with T2DM', (NOW() - INTERVAL '15 years')::DATE, 'patient_reported'),
    (v_patient_id, 'diagnosis', 'Hypertension Diagnosed', 'Started on antihypertensive medication', (NOW() - INTERVAL '10 years')::DATE, 'patient_reported'),
    (v_patient_id, 'surgery', 'Cataract Surgery - Right Eye', 'Successful cataract removal and IOL implantation', '2018-03-15', 'patient_reported'),
    (v_patient_id, 'surgery', 'Cataract Surgery - Left Eye', 'Successful cataract removal and IOL implantation', '2018-04-10', 'patient_reported'),
    (v_patient_id, 'diagnosis', 'Osteoarthritis', 'Bilateral knee osteoarthritis', (NOW() - INTERVAL '6 months')::DATE, 'patient_reported');
    
    -- Create clinical summary
    INSERT INTO clinical_summaries (
        patient_id,
        clinical_history_id,
        session_id,
        chief_complaint,
        history_present_illness,
        past_medical_history,
        past_surgical_history,
        medications,
        allergies,
        family_history,
        personal_history,
        status
    ) VALUES (
        v_patient_id,
        v_history_id,
        v_session_id,
        'Bilateral knee pain for 6 months',
        'The patient is a 72-year-old female presenting with bilateral knee pain of 6 months duration. The pain is characterized as aching in nature, rated 6/10 in severity, and is aggravated by walking and stair climbing. Rest provides some relief. No history of trauma.',
        'Known case of Type 2 Diabetes Mellitus for 15 years, Hypertension for 10 years, and recently diagnosed Osteoarthritis.',
        'Bilateral cataract surgery in 2018.',
        'Currently on Metformin 500mg BD, Amlodipine 5mg OD, and Paracetamol 650mg PRN.',
        'Known allergy to Penicillin causing skin rash (moderate severity).',
        'Positive family history of Diabetes (mother), Hypertension (father), and Arthritis (sister).',
        'Vegetarian diet, light walking daily, 7 hours sleep, non-smoker, non-alcoholic.',
        'completed'
    );
    
    -- Add to queue (for demo)
    INSERT INTO queue_items (patient_id, session_id, priority, department, token_number)
    VALUES (v_patient_id, v_session_id, 'normal', 'General Medicine', 'GM-101');
    
END $$;

-- ===========================
-- DEMO ALERTS (Red Flags)
-- ===========================

-- Create a demo chest pain red flag scenario
DO $$
DECLARE
    v_patient_id UUID;
    v_session_id UUID;
BEGIN
    SELECT id INTO v_patient_id FROM patients WHERE hospital_id = 'HOSP001';
    
    -- Create active session for demo
    INSERT INTO patient_sessions (patient_id, status, language, department, current_step, progress)
    VALUES (v_patient_id, 'in_progress', 'hi', 'Cardiology', 'chief_complaint', 20)
    RETURNING id INTO v_session_id;
    
    -- Create critical alert
    INSERT INTO alerts (patient_id, session_id, alert_type, severity, title, description, reason)
    VALUES (
        v_patient_id,
        v_session_id,
        'red_flag',
        'critical',
        'CRITICAL: Possible Acute Coronary Syndrome',
        'Patient reports severe crushing chest pain radiating to left arm with breathlessness and sweating',
        'Combination of chest pain characteristics (crushing, radiating), associated symptoms (dyspnea, diaphoresis), and patient demographics suggest possible cardiac emergency'
    );
    
END $$;

-- ===========================
-- DEFAULT ADMIN USER & DEMO DOCTORS
-- Note: These users must be created in Supabase Auth separately, then run these INSERTs with actual UUIDs
-- ===========================

-- INSTRUCTIONS TO CREATE DEMO CREDENTIALS:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create users with these credentials:
--    - admin@careportal.health / Admin@123456
--    - dr.sharma@careportal.health / Doctor@123456
--    - dr.patel@careportal.health / Doctor@123456
--    - dr.kumar@careportal.health / Doctor@123456
-- 3. Copy the UUID of each user
-- 4. Run the INSERT statements below with actual UUIDs

-- Example: After creating auth users, update with actual UUIDs:
-- INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
-- VALUES 
-- ('actual-uuid-from-supabase-auth-admin', 'system_admin', 'System Administrator', '9999999999', NULL, NULL, NULL, TRUE),
-- ('actual-uuid-from-supabase-auth-dr1', 'doctor', 'Dr. Rajesh Sharma', '9876543200', 'General Medicine', 'MD Internal Medicine', 'MCI-12345', TRUE),
-- ('actual-uuid-from-supabase-auth-dr2', 'doctor', 'Dr. Priya Patel', '9876543201', 'Cardiology', 'DM Cardiology', 'MCI-12346', TRUE),
-- ('actual-uuid-from-supabase-auth-dr3', 'doctor', 'Dr. Amit Kumar', '9876543202', 'Ayurveda', 'BAMS, MD Ayurveda', 'AYUSH-12345', TRUE);

-- ALTERNATIVE: Use the SQL function below to create demo accounts programmatically

-- ===========================
-- INDEXES FOR PERFORMANCE
-- ===========================

-- Add additional helpful indexes
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_clinical_histories_created ON clinical_histories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_patient_date ON timeline_events(patient_id, event_date DESC);

-- ===========================
-- COMMENTS
-- ===========================

COMMENT ON TABLE patients IS 'Patient demographic and identification information';
COMMENT ON TABLE clinical_histories IS 'Complete clinical history including HPI, PMH, medications, allergies, etc.';
COMMENT ON TABLE ayush_assessments IS 'AYUSH-specific assessments including Dashavidha Pariksha';
COMMENT ON TABLE documents IS 'Uploaded medical documents (prescriptions, lab reports, etc.)';
COMMENT ON TABLE document_extractions IS 'OCR and AI extracted data from documents';
COMMENT ON TABLE timeline_events IS 'Chronological medical timeline automatically generated from history and documents';
COMMENT ON TABLE alerts IS 'Red flags, contradictions, and other clinical alerts';
COMMENT ON TABLE clinical_summaries IS 'AI-generated physician-ready clinical summaries';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all system actions';

-- Seed completed successfully
SELECT 'Seed data loaded successfully!' AS message;
