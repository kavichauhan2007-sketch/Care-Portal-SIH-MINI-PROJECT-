# CarePortal Demo Credentials Reference

## 🔐 Demo Login Credentials

### System Administrator
- **URL**: http://localhost:3001/admin/doctors
- **Email**: `admin@careportal.health`
- **Password**: `Admin@123456`
- **Role**: System Admin
- **Access**: Full system access, can create/manage doctor accounts

### Doctor Accounts

#### Dr. Rajesh Sharma (General Medicine)
- **URL**: http://localhost:3001/login
- **Email**: `dr.sharma@careportal.health`
- **Password**: `Doctor@123456`
- **Department**: General Medicine
- **Specialization**: MD Internal Medicine
- **License**: MCI-12345

#### Dr. Priya Patel (Cardiology)
- **URL**: http://localhost:3001/login
- **Email**: `dr.patel@careportal.health`
- **Password**: `Doctor@123456`
- **Department**: Cardiology
- **Specialization**: DM Cardiology
- **License**: MCI-12346

#### Dr. Amit Kumar (Ayurveda)
- **URL**: http://localhost:3001/login
- **Email**: `dr.kumar@careportal.health`
- **Password**: `Doctor@123456`
- **Department**: Ayurveda
- **Specialization**: BAMS, MD Ayurveda
- **License**: AYUSH-12345

#### Dr. Sunita Reddy (Pediatrics)
- **URL**: http://localhost:3001/login
- **Email**: `dr.reddy@careportal.health`
- **Password**: `Doctor@123456`
- **Department**: Pediatrics
- **Specialization**: MD Pediatrics
- **License**: MCI-12347

---

## 👥 Demo Patients (Pre-seeded in Database)

### Patient 1: Rajesh Kumar (Chest Pain - Red Flag)
- **Hospital ID**: `HOSP001`
- **ABHA ID**: `12-3456-7890-1234`
- **Age**: 58
- **Gender**: Male
- **Contact**: 9876543210
- **Chief Complaint**: Chest pain (active red flag alert)

### Patient 2: Priya Sharma (AYUSH Patient)
- **Hospital ID**: `HOSP002`
- **Age**: 35
- **Gender**: Female
- **Contact**: 9876543211

### Patient 3: Amit Patel (Routine Checkup)
- **Hospital ID**: `HOSP003`
- **Age**: 42
- **Gender**: Male
- **Contact**: 9876543212

### Patient 4: Aarav Singh (Pediatric)
- **Hospital ID**: `HOSP004`
- **Age**: 8
- **Gender**: Male
- **Contact**: 9876543213

### Patient 5: Lakshmi Devi (Completed History - Elderly)
- **Hospital ID**: `HOSP005`
- **ABHA ID**: `12-3456-7890-5678`
- **Age**: 72
- **Gender**: Female
- **Contact**: 9876543214
- **Status**: Complete clinical history available (demo data)
- **Conditions**: Diabetes, Hypertension, Osteoarthritis

---

## 📱 Patient Kiosk Testing

### For Existing Patients
1. Navigate to: http://localhost:3000
2. Click "Start New History"
3. Select language
4. Choose "Existing Patient"
5. Enter any Hospital ID from above (e.g., `HOSP001`)

### For New Patient Registration (with OTP)
1. Navigate to: http://localhost:3000
2. Click "Start New History"
3. Select language
4. Choose "New Patient"
5. Fill in details:
   - Name: Your Name
   - Age: 30
   - Gender: Male/Female
   - Mobile: Your 10-digit mobile number
6. Click "Send OTP"
7. Check your mobile for OTP code
8. Enter 6-digit OTP
9. Click "Verify & Register"

**Note for Testing**: If using Supabase test mode, any phone number works and OTP is always `123456`

---

## 🔧 Admin Functions

### Creating New Doctor Accounts

**Only System Admins can create doctors**

1. Login as admin: `admin@careportal.health`
2. Navigate to: http://localhost:3001/admin/doctors
3. Click "Create New Doctor"
4. Fill in form:
   - **Email**: doctor@careportal.health (must be unique)
   - **Password**: Minimum 6 characters
   - **Full Name**: Dr. Name
   - **Contact Number**: 10-digit mobile
   - **Role**: Doctor/Nurse/Admin
   - **Department**: e.g., Cardiology
   - **Specialization**: e.g., MD Cardiology
   - **License Number**: e.g., MCI-12348
5. Click "Create Doctor"
6. Doctor can now login with the credentials

### Managing Doctor Status

From admin dashboard:
- **Activate/Deactivate**: Toggle doctor's active status
- **Delete**: Remove doctor account (system admins cannot be deleted)
- **View Details**: See full doctor information

---

## 🔄 User Flow Examples

### Example 1: New Patient with Chest Pain (Critical Alert)
1. Patient goes to kiosk: http://localhost:3000
2. Registers as new patient (with OTP)
3. Describes chest pain as chief complaint
4. System generates RED FLAG alert
5. Patient appears in doctor queue with critical priority
6. Doctor logs in and sees alert immediately

### Example 2: Existing Patient Follow-up
1. Patient uses Hospital ID: `HOSP005`
2. System loads existing history
3. Patient describes new complaint
4. Doctor can see full medical timeline
5. Previous medications and allergies visible

### Example 3: AYUSH Department Patient
1. Patient registers for Ayurveda department
2. System asks AYUSH-specific questions (Prakriti, Ahara, etc.)
3. Dr. Amit Kumar (AYUSH doctor) reviews
4. Sees both allopathic and AYUSH assessments

---

## ⚠️ Security Notes

### Password Requirements
- Minimum 6 characters (demo)
- For production: Use stronger passwords (8+ chars, mixed case, numbers, special chars)

### Default Passwords - CHANGE THESE IN PRODUCTION
- All demo passwords use pattern: `Role@123456`
- Change immediately after initial setup
- Implement password rotation policy

### Access Control
- **System Admin**: Can create/manage all users, access all data
- **Admin**: Can manage doctors, access clinical data
- **Doctor**: Can access patient data, cannot manage users
- **Nurse**: Can access patient data, limited permissions
- **Patient**: No direct login (kiosk-based registration only)

### RLS (Row Level Security)
All tables have RLS policies:
- Patients table: Only healthcare staff
- Clinical histories: Only healthcare staff
- Documents: Only healthcare staff
- Audit logs: System admins only
- User profiles: Users see own, admins see all

---

## 🧪 Testing Checklist

### Patient Kiosk
- [ ] New patient registration with OTP
- [ ] Existing patient login with Hospital ID
- [ ] Existing patient login with ABHA ID
- [ ] Language selection (English/Hindi)
- [ ] Voice input (if enabled)
- [ ] Chief complaint entry
- [ ] AI follow-up questions
- [ ] Session timeout handling

### Doctor Dashboard
- [ ] Doctor login
- [ ] View patient queue
- [ ] Review patient history
- [ ] See red flag alerts
- [ ] View documents
- [ ] Edit clinical summary
- [ ] Complete patient consultation

### Admin Dashboard
- [ ] Admin login
- [ ] View all doctors
- [ ] Create new doctor
- [ ] Activate/deactivate doctor
- [ ] Delete doctor
- [ ] View doctor statistics

### Security Testing
- [ ] Cannot access admin without admin role
- [ ] Cannot access patient data without auth
- [ ] RLS policies block unauthorized access
- [ ] OTP required for new patient registration
- [ ] Session expires after timeout

---

## 📊 Demo Data Summary

### Pre-loaded Data
- **5 Demo Patients** (various conditions)
- **10 Departments** (Allopathy + AYUSH)
- **50+ Clinical Questions** (English & Hindi)
- **1 Complete Clinical History** (Patient HOSP005)
- **1 Active Red Flag Alert** (Patient HOSP001)
- **Sample Timeline Events**
- **System Settings**

### What's NOT Pre-loaded (Create Manually)
- **Doctor accounts** (must create via Supabase or admin dashboard)
- **Document uploads** (upload during patient sessions)
- **New patient registrations** (use kiosk)

---

## 🚀 Quick Start Commands

### Start Patient Kiosk
```bash
cd apps/patient-kiosk
npm run dev
# Access at: http://localhost:3000
```

### Start Doctor Dashboard
```bash
cd apps/doctor-dashboard
npm run dev
# Access at: http://localhost:3001
```

### Access Admin Panel
```bash
# Doctor dashboard must be running
# Navigate to: http://localhost:3001/admin/doctors
# Login with admin credentials
```

---

## 📞 Support

For issues or questions:
1. Check `SUPABASE_SETUP.md` for setup instructions
2. Review `TROUBLESHOOTING.md` for common issues
3. Check Supabase dashboard logs
4. Review browser console errors

---

## 🔐 Production Deployment

**IMPORTANT**: Before going to production:

1. **Change ALL default passwords**
2. **Enable strong password policies**
3. **Set up proper SMS provider** (not test mode)
4. **Configure rate limiting**
5. **Enable audit logging**
6. **Set up monitoring**
7. **Review RLS policies**
8. **Enable HTTPS only**
9. **Configure CORS properly**
10. **Set up backups**

See `PRODUCTION_CHECKLIST.md` for complete deployment guide.
