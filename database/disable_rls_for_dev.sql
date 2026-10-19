-- ================================================
-- DISABLE RLS FOR DEVELOPMENT (Quick Fix)
-- ================================================
-- This completely disables RLS for local development
-- WARNING: DO NOT USE IN PRODUCTION!

-- ================================================
-- DISABLE RLS ON ALL TABLES
-- ================================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE consents DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_histories DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE ayush_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions DISABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- ================================================
-- VERIFICATION
-- ================================================

-- Check that RLS is disabled on all tables
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show "false" for all tables

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS DISABLED FOR DEVELOPMENT';
  RAISE NOTICE '⚠️  WARNING: All tables are now fully accessible';
  RAISE NOTICE '⚠️  This is ONLY for local development';
  RAISE NOTICE '⚠️  NEVER use this in production!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ You can now:';
  RAISE NOTICE '   - Create patients without authentication';
  RAISE NOTICE '   - Insert any data into any table';
  RAISE NOTICE '   - Test all features freely';
END $$;

SELECT 'RLS disabled successfully! Ready for development.' AS status;
