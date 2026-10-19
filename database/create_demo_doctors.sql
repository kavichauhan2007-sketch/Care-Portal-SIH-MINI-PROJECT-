-- ========================================
-- CREATE DEMO DOCTOR ACCOUNTS IN SUPABASE
-- ========================================
-- This script creates demo doctor credentials for the CarePortal system
-- Run this in Supabase SQL Editor after setting up the schema

-- ===========================
-- STEP 1: Create Auth Users via Supabase Dashboard
-- ===========================
-- Go to: Supabase Dashboard > Authentication > Users > Add User
-- Create the following users manually (Supabase requires manual user creation for security):

/*
1. SYSTEM ADMIN
   Email: admin@careportal.health
   Password: Admin@123456
   
2. DR. RAJESH SHARMA (General Medicine)
   Email: dr.sharma@careportal.health
   Password: Doctor@123456
   
3. DR. PRIYA PATEL (Cardiology)
   Email: dr.patel@careportal.health
   Password: Doctor@123456
   
4. DR. AMIT KUMAR (Ayurveda)
   Email: dr.kumar@careportal.health
   Password: Doctor@123456
   
5. DR. SUNITA REDDY (Pediatrics)
   Email: dr.reddy@careportal.health
   Password: Doctor@123456
*/

-- ===========================
-- STEP 2: Link User Profiles
-- ===========================
-- After creating the auth users above, run the queries below
-- Replace 'REPLACE_WITH_ACTUAL_UUID' with the actual UUID from Supabase Auth Users table

-- System Administrator Profile
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('REPLACE_WITH_ADMIN_UUID', 'system_admin', 'System Administrator', '9999999999', 'Administration', 'System Admin', NULL, TRUE)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  contact_number = EXCLUDED.contact_number,
  updated_at = NOW();

-- Dr. Rajesh Sharma - General Medicine
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('REPLACE_WITH_SHARMA_UUID', 'doctor', 'Dr. Rajesh Sharma', '9876543200', 'General Medicine', 'MD Internal Medicine', 'MCI-12345', TRUE)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  contact_number = EXCLUDED.contact_number,
  department = EXCLUDED.department,
  specialization = EXCLUDED.specialization,
  license_number = EXCLUDED.license_number,
  updated_at = NOW();

-- Dr. Priya Patel - Cardiology
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('REPLACE_WITH_PATEL_UUID', 'doctor', 'Dr. Priya Patel', '9876543201', 'Cardiology', 'DM Cardiology', 'MCI-12346', TRUE)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  contact_number = EXCLUDED.contact_number,
  department = EXCLUDED.department,
  specialization = EXCLUDED.specialization,
  license_number = EXCLUDED.license_number,
  updated_at = NOW();

-- Dr. Amit Kumar - Ayurveda
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('REPLACE_WITH_KUMAR_UUID', 'doctor', 'Dr. Amit Kumar', '9876543202', 'Ayurveda', 'BAMS, MD Ayurveda', 'AYUSH-12345', TRUE)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  contact_number = EXCLUDED.contact_number,
  department = EXCLUDED.department,
  specialization = EXCLUDED.specialization,
  license_number = EXCLUDED.license_number,
  updated_at = NOW();

-- Dr. Sunita Reddy - Pediatrics
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('REPLACE_WITH_REDDY_UUID', 'doctor', 'Dr. Sunita Reddy', '9876543203', 'Pediatrics', 'MD Pediatrics', 'MCI-12347', TRUE)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  contact_number = EXCLUDED.contact_number,
  department = EXCLUDED.department,
  specialization = EXCLUDED.specialization,
  license_number = EXCLUDED.license_number,
  updated_at = NOW();

-- ===========================
-- VERIFICATION QUERY
-- ===========================
-- Run this to verify the doctor accounts were created successfully:

SELECT 
  up.id,
  up.role,
  up.full_name,
  up.department,
  up.specialization,
  up.license_number,
  up.active,
  au.email,
  au.created_at
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.role IN ('doctor', 'system_admin')
ORDER BY up.role, up.full_name;

-- ===========================
-- SUMMARY
-- ===========================
-- Demo Credentials Created:
-- 
-- 1. System Admin
--    Email: admin@careportal.health
--    Password: Admin@123456
--    Role: System Administrator
--
-- 2. Dr. Rajesh Sharma
--    Email: dr.sharma@careportal.health
--    Password: Doctor@123456
--    Department: General Medicine
--    Specialization: MD Internal Medicine
--
-- 3. Dr. Priya Patel
--    Email: dr.patel@careportal.health
--    Password: Doctor@123456
--    Department: Cardiology
--    Specialization: DM Cardiology
--
-- 4. Dr. Amit Kumar
--    Email: dr.kumar@careportal.health
--    Password: Doctor@123456
--    Department: Ayurveda
--    Specialization: BAMS, MD Ayurveda
--
-- 5. Dr. Sunita Reddy
--    Email: dr.reddy@careportal.health
--    Password: Doctor@123456
--    Department: Pediatrics
--    Specialization: MD Pediatrics
--
-- NOTE: Only system admins can create new doctor accounts through the dashboard
-- Doctors cannot self-register - they must be created by administrators
