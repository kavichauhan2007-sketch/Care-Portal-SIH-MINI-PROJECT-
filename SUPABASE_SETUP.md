# Supabase Setup Guide for CarePortal

## Prerequisites
- Supabase account (https://supabase.com)
- Project created in Supabase

## Step 1: Enable Phone Authentication

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Scroll to **Phone** provider
3. **Enable** the Phone provider
4. Choose a provider:
   - **For Development/Testing**: Use **Twilio** test mode or **Messagebird**
   - **For Production**: Configure your SMS provider (Twilio, MessageBird, etc.)

### Twilio Configuration (Recommended for Testing)
1. Sign up at https://www.twilio.com
2. Get your **Account SID** and **Auth Token**
3. Get a **Twilio Phone Number**
4. In Supabase Phone Auth settings, enter:
   - **Twilio Account SID**
   - **Twilio Auth Token**
   - **Twilio Phone Number**

### Test Mode (Development Only)
- Supabase provides test OTP: `123456` for any phone number in development
- Enable "Disable email/phone confirmation" in Auth settings for testing

## Step 2: Configure Phone Auth Settings

1. Go to **Authentication** → **Settings** → **Phone Auth**
2. Set **Rate Limits**: 
   - Limit: 5 attempts per hour per phone number
3. Set **OTP Expiry**: 10 minutes (600 seconds)
4. Set **OTP Length**: 6 digits

## Step 3: Run Database Schema

1. Go to **SQL Editor** in Supabase
2. Open `database/schema.sql` from this project
3. Copy and paste the entire file
4. Click **Run** to create all tables and functions

## Step 4: Run Seed Data

1. In **SQL Editor**, create a new query
2. Open `database/seed/seed.sql` from this project
3. Copy and paste the entire file
4. Click **Run** to populate initial data

## Step 5: Create Demo Doctor Accounts

### Method 1: Manual Creation (Recommended)

1. Go to **Authentication** → **Users**
2. Click **Add User** (manually)
3. Create these accounts:

**System Admin:**
- Email: `admin@careportal.health`
- Password: `Admin@123456`
- Email Confirm: ✓ (check this)

**Doctor 1:**
- Email: `dr.sharma@careportal.health`
- Password: `Doctor@123456`
- Email Confirm: ✓

**Doctor 2:**
- Email: `dr.patel@careportal.health`
- Password: `Doctor@123456`
- Email Confirm: ✓

4. After creating each user, **copy their UUID**
5. Go to **SQL Editor** and run this for each user:

```sql
-- For System Admin (replace UUID)
INSERT INTO user_profiles (id, role, full_name, contact_number, department, active)
VALUES 
('PASTE_ADMIN_UUID_HERE', 'system_admin', 'System Administrator', '9999999999', 'Administration', TRUE);

-- For Dr. Sharma (replace UUID)
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('PASTE_SHARMA_UUID_HERE', 'doctor', 'Dr. Rajesh Sharma', '9876543200', 'General Medicine', 'MD Internal Medicine', 'MCI-12345', TRUE);

-- For Dr. Patel (replace UUID)
INSERT INTO user_profiles (id, role, full_name, contact_number, department, specialization, license_number, active)
VALUES 
('PASTE_PATEL_UUID_HERE', 'doctor', 'Dr. Priya Patel', '9876543201', 'Cardiology', 'DM Cardiology', 'MCI-12346', TRUE);
```

### Method 2: Using SQL Script

1. See `database/create_demo_doctors.sql` for detailed instructions
2. Follow the comments in that file

## Step 6: Configure Row Level Security (RLS)

The schema already includes RLS policies, but verify they're enabled:

1. Go to **Database** → **Tables**
2. For each table, ensure **RLS Enabled** is checked
3. Click on each table → **Policies** to view security rules

### Important RLS Policies:
- **Patients**: Only healthcare staff can access
- **Clinical Histories**: Only healthcare staff can access
- **Documents**: Only healthcare staff can access
- **User Profiles**: Users can read their own, admins can read all
- **Audit Logs**: Only system admins can access

## Step 7: Configure Storage (for Document Uploads)

1. Go to **Storage** in Supabase
2. Create a new bucket: `patient-documents`
3. Set bucket to **Private**
4. Add policy for upload:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Healthcare staff can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'nurse', 'admin', 'system_admin')
  )
);

-- Allow authenticated users to read
CREATE POLICY "Healthcare staff can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('doctor', 'nurse', 'admin', 'system_admin')
  )
);
```

## Step 8: Update Environment Variables

Update your `.env.local` files with Supabase credentials:

**For patient-kiosk (`apps/patient-kiosk/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**For doctor-dashboard (`apps/doctor-dashboard/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these keys from: **Supabase Dashboard** → **Settings** → **API**

## Step 9: Test Phone Authentication

1. Start the patient-kiosk app: `npm run dev`
2. Navigate to the new patient registration
3. Enter a phone number (use your real number for testing)
4. Click "Send OTP"
5. Check your phone for the SMS
6. Enter the 6-digit code
7. Complete registration

### Testing in Development Mode

If using Supabase test mode:
- Any phone number will work
- OTP will always be: `123456`
- Check Supabase logs to see OTP (if test mode enabled)

## Step 10: Verify Setup

### Test Patient Registration:
```bash
cd apps/patient-kiosk
npm run dev
# Navigate to http://localhost:3000
# Try creating a new patient with OTP
```

### Test Doctor Login:
```bash
cd apps/doctor-dashboard
npm run dev
# Navigate to http://localhost:3001
# Login with: dr.sharma@careportal.health / Doctor@123456
```

### Test Admin Dashboard:
```bash
# Navigate to http://localhost:3001/admin/doctors
# Login with: admin@careportal.health / Admin@123456
# Try creating a new doctor account
```

## Troubleshooting

### OTP Not Received
1. Check Twilio account balance
2. Verify phone number format (+91XXXXXXXXXX)
3. Check Supabase logs: **Authentication** → **Logs**
4. Verify Phone Auth is enabled

### "Missing Supabase environment variables"
1. Ensure `.env.local` exists in app folder
2. Restart development server after adding env vars
3. Check that keys start with `NEXT_PUBLIC_` for client-side access

### Patient Creation Error
1. Check browser console for detailed error
2. Verify RLS policies are set correctly
3. Check Supabase logs: **Database** → **Logs**
4. Ensure user is authenticated before creating patient

### Doctor Login Failed
1. Verify user exists in **Authentication** → **Users**
2. Check that user_profile was created
3. Verify email is confirmed
4. Try password reset if needed

### Admin Cannot Create Doctors
1. Verify admin user has `system_admin` or `admin` role
2. Check that service role key is set in `.env.local`
3. Verify auth policies allow admin.createUser

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Configure production SMS provider (Twilio/MessageBird)
- [ ] Enable rate limiting on phone auth
- [ ] Set up proper backup strategy
- [ ] Enable audit logging
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerts
- [ ] Review and test all RLS policies
- [ ] Disable test mode in phone auth
- [ ] Set up SSL/TLS for API calls
- [ ] Configure webhook signatures
- [ ] Set up database backups
- [ ] Enable point-in-time recovery

## Security Notes

1. **Never expose service role key** in client-side code
2. **Always use anon key** for client-side Supabase calls
3. **RLS policies** protect data even if anon key is exposed
4. **Audit all admin actions** for compliance
5. **Rotate keys** periodically
6. **Monitor auth logs** for suspicious activity
7. **Implement rate limiting** on all auth endpoints

## Support

For issues:
1. Check Supabase documentation: https://supabase.com/docs
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Review this project's GitHub issues

## Next Steps

After setup is complete:
1. Test the entire patient flow (registration → complaint → summary)
2. Test doctor dashboard access
3. Test admin doctor creation
4. Configure additional features (voice input, AI, etc.)
5. Customize for your hospital's workflow
