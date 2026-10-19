# 🚀 CarePortal - Complete Installation Guide

## Current Status

**Files Created:** 40  
**Core Features Working:** Welcome screen, Language selection  
**Ready for:** Continued development

---

## ⚡ Quick Installation (Windows)

### Step 1: Fix Package Dependencies (Important!)

The package.json had a typo that's been fixed. Before installing:

```cmd
# Navigate to patient kiosk folder
cd apps\patient-kiosk

# Install dependencies
npm install

# If you get errors about missing packages, install them individually:
npm install @radix-ui/react-slot class-variance-authority
npm install @radix-ui/react-progress
```

### Step 2: Install Remaining Dependencies

```cmd
# Still in apps/patient-kiosk folder
npm install lucide-react
npm install framer-motion
npm install react-hook-form
npm install zod
npm install zustand
```

### Step 3: Set Up Environment

```cmd
# Go back to root
cd ..\..

# Copy environment template
copy .env.example .env.local

# Edit .env.local with your actual credentials
notepad .env.local
```

### Step 4: Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create project
2. In Project Settings → API, copy:
   - Project URL
   - anon public key  
   - service_role key

3. Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
```

### Step 5: Set Up Database

1. In Supabase Dashboard → SQL Editor
2. Open `database/schema.sql`
3. Copy entire content and paste in SQL Editor
4. Click "Run"
5. Repeat with `database/seed/seed.sql`

### Step 6: Get Gemini API Key

1. Visit [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env.local`:
```env
GEMINI_API_KEY=your_gemini_key_here
```

### Step 7: Run Application

```cmd
npm run dev:patient
```

Open browser: **http://localhost:3000**

---

## ✅ What's Working Now

### Pages
1. ✅ **Welcome Screen** (`/`) - Fully functional with animations
2. ✅ **Language Selection** (`/patient/language`) - English/Hindi selection

### Components
- ✅ Button
- ✅ Card  
- ✅ Input
- ✅ Progress bar
- ✅ Toast notifications

### Services
- ✅ Supabase client
- ✅ AI service (Gemini)
- ✅ Utility functions

### Database
- ✅ Complete schema (17 tables)
- ✅ Demo seed data

---

## 🚧 What Still Needs Building

### Immediate Priority (This Week)

#### 1. Identity Page
Create: `apps/patient-kiosk/app/(patient)/identity/page.tsx`

```typescript
// Patient can enter:
// - Hospital ID / ABHA ID (existing patient)
// - OR create new patient record
// - Name, age, gender, contact
```

#### 2. Consent Page
Create: `apps/patient-kiosk/app/(patient)/consent/page.tsx`

```typescript
// Display consent form
// Record consent with timestamp
// Store in database
```

#### 3. API Routes

Create: `apps/patient-kiosk/app/api/sessions/route.ts`
```typescript
// POST /api/sessions - Create new session
// GET /api/sessions/[id] - Get session
// PATCH /api/sessions/[id] - Update session
```

Create: `apps/patient-kiosk/app/api/patients/route.ts`
```typescript
// POST /api/patients - Create patient
// GET /api/patients/[id] - Get patient
// GET /api/patients/search - Search by ID/phone
```

#### 4. Session Management Hook

Create: `apps/patient-kiosk/hooks/useSession.ts`
```typescript
// Manage patient session state
// Auto-save progress
// Handle timeout
// Clear on completion
```

### Medium Priority (Next 2 Weeks)

#### 5. Chief Complaint Page with Voice
- Voice input component
- Speech-to-text integration
- Text input fallback
- Save to database

#### 6. Adaptive History Page
- AI question engine
- Dynamic question flow
- Answer storage
- Completeness tracking

#### 7. Document Upload
- Camera integration
- File upload
- QR code scanner
- OCR processing

#### 8. Summary & Review
- Display collected information
- Allow edits
- Generate AI summary
- Submit to doctor queue

### Long Term (3-7 Weeks)

#### 9. Doctor Dashboard
- Separate Next.js app
- Authentication
- Patient queue
- Summary viewer
- Edit/verify workflow

#### 10. Additional Features
- 3D pain map
- AYUSH assessment
- Real-time updates
- Testing
- Docker deployment

---

## 📦 Missing Package Installation

If you encounter missing package errors, install them:

```cmd
# UI Components
npm install @radix-ui/react-dialog
npm install @radix-ui/react-select
npm install @radix-ui/react-slider
npm install @radix-ui/react-radio-group
npm install @radix-ui/react-toast
npm install @radix-ui/react-alert-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs
npm install @radix-ui/react-avatar

# Utilities
npm install clsx tailwind-merge
npm install class-variance-authority

# Icons
npm install lucide-react

# Animations
npm install framer-motion

# Forms & Validation
npm install react-hook-form
npm install @hookform/resolvers
npm install zod

# State Management
npm install zustand

# Date/Time
npm install date-fns

# Document Processing
npm install tesseract.js

# QR Code
npm install qr-scanner
npm install qrcode.react

# File Upload
npm install react-dropzone

# 3D (for pain map)
npm install three
npm install @react-three/fiber
npm install @react-three/drei
npm install @types/three
```

---

## 🐛 Common Issues & Fixes

### Issue: Module not found errors

```cmd
# Solution 1: Clear cache and reinstall
rd /s /q node_modules
rd /s /q .next
del package-lock.json
npm install
```

```cmd
# Solution 2: Install specific missing package
npm install [package-name]
```

### Issue: Supabase connection error

Check `.env.local` has correct format:
```env
# Must be HTTPS URLs
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Issue: TypeScript errors

```cmd
# Restart dev server
# Press Ctrl+C to stop
npm run dev:patient
```

### Issue: Port 3000 already in use

```cmd
# Use different port
npm run dev:patient -- -p 3001
```

---

## 🎯 Next Immediate Steps

### Today:
1. ✅ Fix package installation
2. ✅ Verify welcome and language pages work
3. → Create identity page
4. → Create session API route
5. → Create patient API route

### This Week:
1. Complete identity page
2. Create consent page
3. Build all API routes
4. Add session management
5. Test complete flow

### Next Week:
1. Add chief complaint with voice
2. Implement AI question engine
3. Add document upload
4. Create summary page

---

## 📚 Development Resources

### Key Files to Reference
- `packages/types/index.ts` - All types
- `apps/patient-kiosk/lib/utils.ts` - Helper functions
- `apps/patient-kiosk/services/ai-service.ts` - AI integration
- `apps/patient-kiosk/app/page.tsx` - Page example
- `database/schema.sql` - Database structure

### Documentation
- `START_HERE.md` - Quick start
- `IMPLEMENTATION_GUIDE.md` - Full roadmap
- `STATUS.md` - Current status

### External Docs
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## ✅ Verification Checklist

After installation, verify:

- [ ] `npm install` completes without errors
- [ ] `.env.local` has all credentials
- [ ] Supabase database has 17 tables
- [ ] `npm run dev:patient` starts successfully
- [ ] Welcome screen displays at http://localhost:3000
- [ ] Language selection page works at http://localhost:3000/patient/language
- [ ] No errors in browser console
- [ ] No errors in terminal

---

## 🎉 You're Ready!

The foundation is complete and ready for continued development. Follow the implementation guide to build remaining features systematically.

**Next:** Create the identity page to continue patient flow!
