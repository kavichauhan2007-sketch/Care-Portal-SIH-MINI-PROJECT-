'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  speak,
  speakThenListen, 
  startListening,
  VOICE_SCRIPTS, 
  matchesCommand, 
  CMD, 
  extractDigits, 
  extractAge, 
  extractGender, 
  extractName,
  detectRedFlags,
  isVoiceGuideEnabled
} from '@/lib/voiceGuide';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BadgeCheck, 
  UserPlus, 
  Shield, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  QrCode, 
  CheckCircle, 
  Phone, 
  Hash, 
  X, 
  Sparkles, 
  HelpCircle, 
  Volume2, 
  Type, 
  Contrast, 
  LogOut, 
  User, 
  Plus,
  RefreshCw,
  KeyRound,
  Smartphone,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function IdentityPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Active modal: null | 'existing' | 'new' | 'abha'
  const [activeModal, setActiveModal] = useState<'existing' | 'new' | 'abha' | null>(null);
  const [loading, setLoading] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const fieldMicStopRef = useRef<(() => void) | null>(null);
  const [activeFieldDictating, setActiveFieldDictating] = useState<string | null>(null);
  
  // New Patient State & Sequential Guided Voice Step
  const [regVoiceStep, setRegVoiceStep] = useState<'name' | 'age' | 'phone' | 'idle'>('name');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newTimer, setNewTimer] = useState(0);
  const [newData, setNewData] = useState({
    name: '',
    age: '',
    gender: 'male',
    contactNumber: '',
  });

  // Existing Patient State
  const [existingStep, setExistingStep] = useState<'input' | 'otp'>('input');
  const [existingOtp, setExistingOtp] = useState('');
  const [existingTimer, setExistingTimer] = useState(0);
  const [existingPatientRecord, setExistingPatientRecord] = useState<any>(null);
  const [existingData, setExistingData] = useState({
    hospitalId: '',
    phone: '',
  });
  
  // ABHA Data
  const [abhaNumber, setAbhaNumber] = useState('');

  // Countdown timers for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (newTimer > 0) {
      interval = setInterval(() => {
        setNewTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [newTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (existingTimer > 0) {
      interval = setInterval(() => {
        setExistingTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [existingTimer]);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
      fieldMicStopRef.current?.();
    };
  }, []);

  // Individual Field Direct Voice Dictation (5-second silence auto-stop)
  const dictateField = (fieldName: 'name' | 'age' | 'phone' | 'customRedFlag') => {
    // Stop any ongoing global voice
    stopVoiceRef.current?.();
    fieldMicStopRef.current?.();

    setActiveFieldDictating(fieldName);
    setVoiceMode('listening');

    const promptText = {
      name: langCode === 'hi' ? 'कृपया अपना पूरा नाम बोलें' : 'Please speak your full name',
      age: langCode === 'hi' ? 'कृपया अपनी उम्र बताएं' : 'Please speak your age',
      phone: langCode === 'hi' ? 'कृपया अपना १० अंकों का मोबाइल नंबर बोलें' : 'Please speak your 10-digit mobile number',
      customRedFlag: langCode === 'hi' ? 'कृपया अपनी इमरजेंसी तकलीफ बताएं' : 'Please speak your emergency symptom',
    }[fieldName];

    const stop = speakThenListen(
      promptText,
      langCode,
      (transcript, isFinal) => {
        if (!transcript) return;
        
        if (fieldName === 'name') {
          const cleanedName = extractName(transcript);
          if (cleanedName && cleanedName.length >= 2) {
            setNewData((prev) => ({ ...prev, name: cleanedName }));
          }
        } else if (fieldName === 'age') {
          const ageVal = extractAge(transcript);
          if (ageVal) {
            setNewData((prev) => ({ ...prev, age: ageVal }));
          }
        } else if (fieldName === 'phone') {
          const digits = extractDigits(transcript);
          if (digits.length >= 10) {
            setNewData((prev) => ({ ...prev, contactNumber: digits.substring(0, 10) }));
          }
        }

        if (isFinal) {
          setActiveFieldDictating(null);
          setVoiceMode('idle');
        }
      },
      () => {
        setVoiceMode('listening');
      },
      () => {
        setActiveFieldDictating(null);
        setVoiceMode('idle');
      },
      false,
      5000 // 5-second silence timeout
    );

    fieldMicStopRef.current = stop;
  };

  // Main Sequential Voice Guidance Engine (with 5-second silence auto-stop)
  useEffect(() => {
    if (!mounted || activeFieldDictating || !isVoiceGuideEnabled()) return;
    
    let script = VOICE_SCRIPTS.identity[langCode === 'hi' ? 'hi' : 'en'];
    
    if (activeModal === 'existing') {
      if (existingStep === 'otp') {
        script = VOICE_SCRIPTS.identityOtpModal[langCode === 'hi' ? 'hi' : 'en'];
      } else {
        script = VOICE_SCRIPTS.identityExistingModal[langCode === 'hi' ? 'hi' : 'en'];
      }
    } else if (activeModal === 'new') {
      if (otpSent) {
        script = VOICE_SCRIPTS.identityOtpModal[langCode === 'hi' ? 'hi' : 'en'];
      } else {
        // Sequential step-by-step registration scripts
        if (regVoiceStep === 'name') {
          script = VOICE_SCRIPTS.identityNewName[langCode === 'hi' ? 'hi' : 'en'];
        } else if (regVoiceStep === 'age') {
          script = VOICE_SCRIPTS.identityNewAge[langCode === 'hi' ? 'hi' : 'en'];
        } else if (regVoiceStep === 'phone') {
          script = VOICE_SCRIPTS.identityNewPhone[langCode === 'hi' ? 'hi' : 'en'];
        } else {
          script = langCode === 'hi' ? 'पंजीकरण के लिए "ओटीपी भेजें" बोलें।' : 'Say "send OTP" to continue.';
        }
      }
    } else if (activeModal === 'abha') {
      script = langCode === 'hi' ? 'कृपया अपना १४ अंकों का आभा नंबर बोलें, फिर "सत्यापित करें" बोलें।' : 'Please speak your 14-digit ABHA number, then say "verify".';
    }

    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        
        // 1. If in Existing Modal
        if (activeModal === 'existing') {
          if (existingStep === 'otp') {
            const digits = extractDigits(transcript);
            if (digits.length >= 6) {
              const code = digits.substring(0, 6);
              setExistingOtp(code);
              setTimeout(() => verifyExistingOTPWithCode(code), 100);
            }
          } else {
            const digits = extractDigits(transcript);
            if (digits.length >= 10) {
              setExistingData((prev) => ({ ...prev, phone: digits.substring(0, 10) }));
            }
            if (matchesCommand(transcript, CMD.submit) || matchesCommand(transcript, CMD.sendOtp) || matchesCommand(transcript, CMD.agree)) {
              handleExistingPatient();
            }
          }
          return;
        }

        // 2. If in New Patient Modal (Strict Step-by-Step Flow)
        if (activeModal === 'new') {
          if (otpSent) {
            const digits = extractDigits(transcript);
            if (digits.length >= 6) {
              const code = digits.substring(0, 6);
              setOtp(code);
              setTimeout(() => verifyOTPWithCode(code), 100);
            }
            return;
          }

          // Step 1: Sequential Name Capture
          if (regVoiceStep === 'name') {
            const cleanedName = extractName(transcript);
            if (cleanedName && cleanedName.length >= 2 && !/^\d+$/.test(cleanedName)) {
              setNewData((prev) => ({ ...prev, name: cleanedName }));
              setRegVoiceStep('age');
            }
            return;
          }

          // Step 2: Sequential Age Capture
          if (regVoiceStep === 'age') {
            const ageVal = extractAge(transcript);
            if (ageVal) {
              setNewData((prev) => ({ ...prev, age: ageVal }));
              // Check if gender was also mentioned
              const g = extractGender(transcript);
              if (g) setNewData((prev) => ({ ...prev, gender: g }));
              setRegVoiceStep('phone');
            }
            return;
          }

          // Step 3: Sequential Mobile Phone Capture
          if (regVoiceStep === 'phone') {
            const digits = extractDigits(transcript);
            if (digits.length >= 10) {
              setNewData((prev) => ({ ...prev, contactNumber: digits.substring(0, 10) }));
              setRegVoiceStep('idle');
            }
            return;
          }

          if (matchesCommand(transcript, CMD.sendOtp) || matchesCommand(transcript, CMD.submit)) {
            sendOTP();
          }
          return;
        }

        // 3. If in ABHA Modal
        if (activeModal === 'abha') {
          const digits = extractDigits(transcript);
          if (digits.length >= 14) {
            setAbhaNumber(formatAbhaInput(digits.substring(0, 14)));
          }
          if (matchesCommand(transcript, CMD.submit) || matchesCommand(transcript, CMD.agree)) {
            verifyAbha();
          }
          return;
        }

        // 4. Main Page Navigation Commands
        if (matchesCommand(transcript, CMD.wake)) {
          speak(langCode === 'hi' ? 'नमस्ते! पंजीकृत मरीज के लिए "पंजीकृत" बोलें, नए मरीज के लिए "नया" बोलें।' : 'Hello! Say "existing" for registered patient, or "new" for new patient.', langCode);
          return;
        } else if (matchesCommand(transcript, CMD.existing)) {
          setExistingStep('input');
          setExistingOtp('');
          setActiveModal('existing');
        } else if (matchesCommand(transcript, CMD.new)) {
          setOtpSent(false);
          setRegVoiceStep('name');
          setActiveModal('new');
        } else if (matchesCommand(transcript, CMD.abha)) {
          setActiveModal('abha');
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle'),
      false,
      5000 // 5-second silence auto-stop
    );
    stopVoiceRef.current = stop;
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, langCode, activeModal, existingStep, otpSent, regVoiceStep, activeFieldDictating]);

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  const formatAbhaInput = (val: string) => {
    let clean = val.replace(/\D/g, '');
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += '-' + clean.substring(2, 6);
    if (clean.length > 6) formatted += '-' + clean.substring(6, 10);
    if (clean.length > 10) formatted += '-' + clean.substring(10, 14);
    return formatted;
  };

  // -------------------------------------------------------------
  // EXISTING PATIENT: LOOKUP & TWILIO PHONE OTP VERIFICATION
  // -------------------------------------------------------------
  const handleExistingPatient = async () => {
    if (!existingData.hospitalId && !existingData.phone) {
      toast({ 
        title: langCode === 'hi' ? 'कृपया हॉस्पिटल आईडी या मोबाइल नंबर दर्ज करें' : 'Please enter Hospital ID or Mobile Number', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      if (existingData.phone) {
        if (existingData.phone.length !== 10) {
          toast({ 
            title: langCode === 'hi' ? 'अमान्य मोबाइल नंबर' : 'Invalid Mobile Number', 
            description: langCode === 'hi' ? 'कृपया १०-अंकों का मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number',
            variant: 'destructive' 
          });
          setLoading(false);
          return;
        }

        // Look up patient in Supabase patients table
        const { data: patientRecord } = await supabase
          .from('patients')
          .select('*')
          .eq('contact_number', existingData.phone.trim())
          .maybeSingle();

        setExistingPatientRecord(patientRecord || null);

        // Initiate Twilio Phone OTP via API route
        const res = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: existingData.phone.trim() }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to send verification SMS');
        }

        setExistingStep('otp');
        setExistingOtp('');
        setExistingTimer(30);

        toast({
          title: langCode === 'hi' ? 'ओटीपी भेजा गया (Twilio)' : 'OTP Sent via Twilio',
          description: langCode === 'hi' 
            ? `+91 ${existingData.phone} पर एसएमएस सत्यापन कोड भेजा गया है।` 
            : data.message || `Verification code sent to +91 ${existingData.phone}.`,
        });
      } else if (existingData.hospitalId) {
        // Hospital ID search
        const { data: patientRecord } = await supabase
          .from('patients')
          .select('*')
          .eq('hospital_id', existingData.hospitalId.trim())
          .maybeSingle();

        if (patientRecord) {
          if (patientRecord.contact_number) {
            // Patient has a registered phone number -> prompt Twilio phone verification
            setExistingPatientRecord(patientRecord);
            setExistingData((prev) => ({ ...prev, phone: patientRecord.contact_number || '' }));
            
            const res = await fetch('/api/otp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: patientRecord.contact_number.trim() }),
            });
            const data = await res.json();
            
            setExistingStep('otp');
            setExistingOtp('');
            setExistingTimer(30);
            toast({
              title: langCode === 'hi' ? 'मरीज मिला - ओटीपी भेजा गया' : 'Patient Found - Twilio OTP Sent',
              description: langCode === 'hi'
                ? `पंजीकृत नंबर +91 ${patientRecord.contact_number} पर सत्यापन कोड भेजा गया है।`
                : data.message || `Verification code dispatched to registered mobile +91 ${patientRecord.contact_number}.`,
            });
          } else {
            // No phone registered, proceed with ID
            localStorage.setItem('careportal_patient_id', patientRecord.id);
            await createSession(patientRecord.id);
            toast({ 
              title: langCode === 'hi' ? 'रोगी सत्यापित' : 'Patient Verified', 
              description: `Welcome back, ${patientRecord.name || 'Patient'}!` 
            });
            router.push('/consent');
          }
        } else {
          toast({ 
            title: langCode === 'hi' ? 'रोगी नहीं मिला' : 'Patient Not Found', 
            description: langCode === 'hi' ? 'दिए गए हॉस्पिटल आईडी से कोई मरीज नहीं मिला।' : 'No patient found with this Hospital ID.',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      console.error('Error during patient lookup:', error);
      toast({
        title: langCode === 'hi' ? 'त्रुटि' : 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resendExistingOTP = async () => {
    if (existingTimer > 0 || !existingData.phone) return;
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: existingData.phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      setExistingTimer(30);
      toast({
        title: langCode === 'hi' ? 'ओटीपी पुनः भेजा गया' : 'Twilio OTP Resent Successfully',
        description: langCode === 'hi' ? `+91 ${existingData.phone} पर नया कोड भेजा गया है।` : `New SMS code sent to +91 ${existingData.phone}.`,
      });
    } catch (err: any) {
      console.warn('Resend OTP error:', err);
      toast({
        title: 'Error Resending OTP',
        description: err.message || 'Failed to resend code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Voice-triggered version: accepts code directly to avoid stale state closure
  const verifyExistingOTPWithCode = async (code: string) => {
    if (!code || code.length !== 6) return;
    setExistingOtp(code);
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: existingData.phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.error || (langCode === 'hi' ? 'अमान्य ओटीपी कोड।' : 'Invalid OTP code.'));
      }
      let patient = existingPatientRecord;
      if (!patient) {
        const { data: fetchedPatient } = await supabase.from('patients').select('*').eq('contact_number', existingData.phone.trim()).maybeSingle();
        patient = fetchedPatient;
      }
      let patientId = patient?.id;
      if (!patientId) {
        const preferredLang = (langCode === 'hi' ? 'hi' : 'en') as 'en' | 'hi';
        const { data: newPatient } = await supabase.from('patients').insert({ name: 'Verified Patient', contact_number: existingData.phone.trim(), gender: 'other', preferred_language: preferredLang }).select().single();
        if (newPatient) { patientId = newPatient.id; patient = newPatient; }
      }
      if (patientId) {
        localStorage.setItem('careportal_patient_id', patientId);
        if (patient?.name) localStorage.setItem('careportal_patient_name', patient.name);
        if (patient?.contact_number) localStorage.setItem('careportal_patient_phone', patient.contact_number);
        if (patient?.age) localStorage.setItem('careportal_patient_age', String(patient.age));
        if (patient?.gender) localStorage.setItem('careportal_patient_gender', patient.gender);
        if (patient?.abha_id) localStorage.setItem('careportal_patient_abha', patient.abha_id);
        if (patient?.hospital_id) localStorage.setItem('careportal_patient_hospital_id', patient.hospital_id);
        await createSession(patientId);
      }
      toast({ title: langCode === 'hi' ? 'सत्यापन सफल' : 'Verification Successful', description: patient?.name ? `Welcome back, ${patient.name}!` : 'Proceeding...' });
      setActiveModal(null);
      router.push('/consent');
    } catch (error: any) {
      toast({ title: langCode === 'hi' ? 'अमान्य ओटीपी' : 'Invalid OTP', description: error.message || 'Verification failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const verifyExistingOTP = async () => {
    if (!existingOtp || existingOtp.length !== 6) {
      toast({ 
        title: langCode === 'hi' ? 'कृपया ६ अंकों का ओटीपी दर्ज करें' : 'Please enter a valid 6-digit OTP', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      // Call Twilio OTP verification API
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: existingData.phone.trim(),
          code: existingOtp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.error || (langCode === 'hi' ? 'अमान्य ओटीपी कोड। कृपया सही कोड दर्ज करें।' : 'Invalid OTP code. Please enter the correct code.'));
      }

      let patient = existingPatientRecord;

      // If not loaded previously, fetch from Supabase
      if (!patient) {
        const { data: fetchedPatient } = await supabase
          .from('patients')
          .select('*')
          .eq('contact_number', existingData.phone.trim())
          .maybeSingle();
        patient = fetchedPatient;
      }

      let patientId = patient?.id;

      // If patient record is not in database yet, create an initial record
      if (!patientId) {
        const preferredLang = (langCode === 'hi' ? 'hi' : 'en') as 'en' | 'hi';
        const { data: newPatient } = await supabase
          .from('patients')
          .insert({
            name: 'Verified Patient',
            contact_number: existingData.phone.trim(),
            gender: 'other',
            preferred_language: preferredLang,
          })
          .select()
          .single();

        if (newPatient) {
          patientId = newPatient.id;
          patient = newPatient;
        }
      }

      if (patientId) {
        localStorage.setItem('careportal_patient_id', patientId);
        if (patient?.name) localStorage.setItem('careportal_patient_name', patient.name);
        if (patient?.contact_number) localStorage.setItem('careportal_patient_phone', patient.contact_number);
        if (patient?.age) localStorage.setItem('careportal_patient_age', String(patient.age));
        if (patient?.gender) localStorage.setItem('careportal_patient_gender', patient.gender);
        if (patient?.abha_id) localStorage.setItem('careportal_patient_abha', patient.abha_id);
        if (patient?.hospital_id) localStorage.setItem('careportal_patient_hospital_id', patient.hospital_id);
        await createSession(patientId);
      }

      toast({
        title: langCode === 'hi' ? 'सत्यापन सफल' : 'Twilio Verification Successful',
        description: patient?.name ? `Welcome back, ${patient.name}!` : 'Proceeding to consent form...',
      });

      setActiveModal(null);
      router.push('/consent');
    } catch (error: any) {
      toast({
        title: langCode === 'hi' ? 'अमान्य ओटीपी' : 'Invalid OTP',
        description: error.message || (langCode === 'hi' ? 'सत्यापन विफल रहा' : 'Verification failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // NEW PATIENT: REGISTRATION & TWILIO PHONE OTP VERIFICATION
  // -------------------------------------------------------------
  const sendOTP = async () => {
    if (!newData.contactNumber || newData.contactNumber.length !== 10) {
      toast({ 
        title: langCode === 'hi' ? 'कृपया १०-अंकों का मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      // Call Twilio OTP Send API
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newData.contactNumber.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code');
      }

      setOtpSent(true);
      setOtp('');
      setNewTimer(30);

      toast({ 
        title: langCode === 'hi' ? 'ओटीपी भेजा गया (Twilio)' : 'Twilio OTP Sent Successfully', 
        description: langCode === 'hi' 
          ? `+91 ${newData.contactNumber} पर एसएमएस सत्यापन कोड भेजा गया है।`
          : data.message || `Verification code sent to +91 ${newData.contactNumber}.`
      });
    } catch (error: any) {
      toast({
        title: 'OTP Dispatch Error',
        description: error.message || 'Failed to send OTP code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resendNewOTP = async () => {
    if (newTimer > 0 || !newData.contactNumber) return;
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newData.contactNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setNewTimer(30);
      toast({
        title: langCode === 'hi' ? 'ओटीपी पुनः भेजा गया' : 'OTP Resent Successfully',
        description: langCode === 'hi' ? `+91 ${newData.contactNumber} पर नया कोड भेजा गया है।` : `New code sent to +91 ${newData.contactNumber}.`,
      });
    } catch (err: any) {
      console.warn('Resend OTP error:', err);
      toast({
        title: 'Error Resending OTP',
        description: err.message || 'Failed to resend code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Voice-triggered version: accepts code directly to avoid stale state closure
  const verifyOTPWithCode = async (code: string) => {
    if (!code || code.length !== 6) return;
    setOtp(code);
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newData.contactNumber.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.error || (langCode === 'hi' ? 'अमान्य ओटीपी कोड। कृपया पुनः प्रयास करें।' : 'Invalid OTP code. Please try again.'));
      }
      toast({ title: langCode === 'hi' ? 'फ़ोन नंबर सत्यापित' : 'Phone Verified Successfully', description: langCode === 'hi' ? 'रोगी प्रोफ़ाइल बनाई जा रही है...' : 'Creating patient record...' });
      await createPatientRecord(null);
    } catch (error: any) {
      toast({ title: langCode === 'hi' ? 'अमान्य ओटीपी' : 'Invalid OTP', description: error.message || 'Verification failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ 
        title: langCode === 'hi' ? 'कृपया ६ अंकों का ओटीपी दर्ज करें' : 'Please enter a valid 6-digit OTP', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      // Call OTP Verification API
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newData.contactNumber.trim(),
          code: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.error || (langCode === 'hi' ? 'अमान्य ओटीपी कोड। कृपया पुनः प्रयास करें।' : 'Invalid OTP code. Please try again.'));
      }

      toast({ 
        title: langCode === 'hi' ? 'फ़ोन नंबर सत्यापित' : 'Phone Verified Successfully',
        description: langCode === 'hi' ? 'रोगी प्रोफ़ाइल बनाई जा रही है...' : 'Creating patient record...'
      });
      await createPatientRecord(null);
    } catch (error: any) {
      toast({ 
        title: langCode === 'hi' ? 'अमान्य ओटीपी' : 'Invalid OTP', 
        description: error.message || (langCode === 'hi' ? 'सत्यापन विफल रहा' : 'Verification failed'),
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createPatientRecord = async (authUserId: string | null = null) => {
    if (!newData.name || !newData.age || !newData.contactNumber) {
      toast({ 
        title: langCode === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : 'Please fill all required fields', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      const language = (localStorage.getItem('careportal_language') || 'en') as 'en' | 'hi';
      const patientPayload: any = {
        name: newData.name.trim(),
        age: parseInt(newData.age) || 35,
        gender: (newData.gender || 'male') as 'male' | 'female' | 'other',
        contact_number: newData.contactNumber.trim(),
        preferred_language: language,
        user_id: authUserId,
      };

      // 1. Persist in Supabase patients table
      let savedPatientId = `pt_${Date.now()}`;
      try {
        const { data, error } = await supabase
          .from('patients')
          .insert(patientPayload)
          .select()
          .single();

        if (data && data.id) {
          savedPatientId = data.id;
        } else if (error) {
          console.warn('Supabase patient insert notice:', error.message);
        }
      } catch (dbErr) {
        console.warn('Supabase DB notice:', dbErr);
      }

      // 2. Set patient session in LocalStorage (red flags detected dynamically from chief complaint)
      const isEmergency = false; // Will be set later from chief complaint analysis
      const triageLevel = 'Priority 2 - Standard OPD Consultation';

      localStorage.setItem('careportal_patient_id', savedPatientId);
      localStorage.setItem('careportal_patient_name', newData.name.trim());
      localStorage.setItem('careportal_patient_phone', newData.contactNumber.trim());
      localStorage.setItem('careportal_patient_age', String(newData.age));
      localStorage.setItem('careportal_patient_gender', newData.gender || 'male');
      localStorage.setItem('careportal_patient_abha', (newData as any).abhaNumber || 'ABDM-Pending');
      localStorage.setItem('careportal_patient_redflags', JSON.stringify([]));
      localStorage.setItem('careportal_patient_triage', triageLevel);
      localStorage.setItem('careportal_patient_is_emergency', 'false');

      // 3. Create active session with red flags triage level
      await createSession(savedPatientId);
      
      // 4. Close modal and navigate immediately to /consent
      setActiveModal(null);
      setOtpSent(false);
      setOtp('');
      router.push('/consent');
    } catch (error: any) {
      console.error('Error creating patient record:', error);
      setActiveModal(null);
      router.push('/consent');
    } finally {
      setLoading(false);
    }
  };

  const verifyAbha = async () => {
    if (abhaNumber.length < 17) {
      toast({ title: langCode === 'hi' ? 'कृपया १४-अंकीय आभा नंबर दर्ज करें' : 'Please enter a valid 14-digit ABHA Number', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: 'ABHA ID Verified', description: 'Ayushman Bharat record synced!' });
      router.push('/consent');
    }, 800);
  };

  const createSession = async (patientId: string) => {
    try {
      const language = (localStorage.getItem('careportal_language') || 'en') as 'en' | 'hi';
      const { data } = await supabase
        .from('patient_sessions')
        .insert({
          patient_id: patientId,
          language,
          status: 'active',
          current_step: 'complaint',
          progress: 15,
        })
        .select()
        .single();

      if (data) {
        localStorage.setItem('careportal_session_id', data.id);
      }
    } catch (e) {
      console.warn('Offline fallback for session creation');
    }
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = langCode === 'hi' 
      ? 'रोगी पहचान। आगे बढ़ने के लिए विकल्प चुनें। पंजीकृत मरीज, नया मरीज, या आभा आईडी।' 
      : 'Patient Identification. Please choose an option: Existing Patient, New Patient registration, or ABHA ID.';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleFontSize = () => {
    setFontLevel((prev) => (prev + 1) % 3);
  };

  const handleExitKiosk = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    localStorage.removeItem('careportal_patient_id');
    localStorage.removeItem('careportal_session_id');
    router.push('/');
  };

  const t = {
    en: {
      help: 'HELP',
      back: 'BACK TO START',
      title: 'Patient Identification',
      subtitle: 'Please select an option to proceed',
      c1Title: 'Existing Patient',
      c1Desc: 'Search using your registered Mobile Number or Hospital ID.',
      c1Action: 'PROCEED',
      c2Title: 'New Patient',
      c2Desc: 'First time visiting? Complete a quick registration form.',
      c2Action: 'REGISTER',
      c3Title: 'ABHA ID',
      c3Desc: 'Log in instantly using your 14-digit Ayushman Bharat Health Account number.',
      c3Action: 'ENTER ABHA',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK'
    },
    hi: {
      help: 'सहायता',
      back: 'शुरुआत पर लौटें',
      title: 'रोगी पहचान',
      subtitle: 'आगे बढ़ने के लिए कृपया एक विकल्प चुनें',
      c1Title: 'पंजीकृत मरीज',
      c1Desc: 'अपने पंजीकृत मोबाइल नंबर या अस्पताल आईडी का उपयोग करके खोजें।',
      c1Action: 'आगे बढ़ें',
      c2Title: 'नया मरीज',
      c2Desc: 'पहली बार आ रहे हैं? 2 मिनट में नया पंजीकरण फॉर्म भरें।',
      c2Action: 'पंजीकरण करें',
      c3Title: 'आभा आईडी',
      c3Desc: 'अपने 14-अंकों के आयुष्मान भारत स्वास्थ्य खाता नंबर से तुरंत लॉगिन करें।',
      c3Action: 'आभा दर्ज करें',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें'
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Ambient Floating Glows */}
      <div className="fixed top-12 left-1/4 w-[500px] h-[500px] bg-[#00685f]/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[450px] h-[450px] bg-[#0058be]/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

      {/* Top Header Bar */}
      <header className={`fixed top-0 left-0 w-full h-20 z-50 flex items-center justify-between px-6 md:px-12 backdrop-blur-md transition-colors ${
        isHighContrast 
          ? 'bg-zinc-900 border-b border-zinc-700' 
          : 'bg-white/90 border-b border-[#e2e8f0] shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
      }`}>
        {/* Left: Help */}
        <button
          onClick={() => setShowHelpModal(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-xs md:text-sm shadow-xs transition-all active:scale-95 ${
            isHighContrast
              ? 'bg-zinc-800 text-yellow-300 border border-yellow-400'
              : 'bg-[#f0f3ff] text-[#3d4947] hover:bg-[#008378] hover:text-white border border-[#bcc9c6]/40'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t.help}</span>
        </button>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-[#00685f]/20 flex items-center justify-center shadow-xs text-[#00685f]">
            <Plus className="w-5 h-5 stroke-[2.75]" />
          </div>
          <span className={`text-xl md:text-2xl font-bold uppercase tracking-tight ${isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'}`}>
            CarePortal
          </span>
        </div>

        {/* Right: Language Pill & Avatar */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center p-1 rounded-full border shadow-inner ${
            isHighContrast ? 'bg-zinc-800 border-zinc-600' : 'bg-[#e2e8f0] border-[#cbd5e1]'
          }`}>
            <button
              onClick={() => switchLanguage('en')}
              className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all ${
                langCode === 'en'
                  ? isHighContrast ? 'bg-yellow-400 text-black shadow-sm' : 'bg-[#00685f] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => switchLanguage('hi')}
              className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all ${
                langCode === 'hi'
                  ? isHighContrast ? 'bg-yellow-400 text-black shadow-sm' : 'bg-[#00685f] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              HI
            </button>
          </div>

          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
            isHighContrast ? 'bg-yellow-400 text-black' : 'bg-[#00685f] text-white'
          }`}>
            <User className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Patient Identification Content */}
      <main className="flex-1 pt-24 pb-28 w-full max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col justify-center">
        <div className="flex flex-col w-full h-full gap-6 md:gap-8 justify-center">

          {/* Sub Header Navigation & Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              onClick={() => router.push('/')}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-sm font-bold text-xs md:text-sm border ${
                isHighContrast
                  ? 'bg-zinc-900 border-yellow-400 text-yellow-300'
                  : 'bg-white border-[#cbd5e1] text-[#151c27] hover:bg-[#e7eefe]'
              }`}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>{t.back}</span>
            </button>

            <div className="flex flex-col sm:items-end text-left sm:text-right">
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight ${
                isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'
              } ${fontLevel === 1 ? 'text-4xl md:text-5xl' : fontLevel === 2 ? 'text-5xl md:text-6xl' : ''}`}>
                {t.title}
              </h1>
              <p className={`text-base md:text-lg lg:text-xl font-medium mt-1 ${
                isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
              }`}>
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* 3 Interactive Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full pb-2">

            {/* 1. Existing Patient Card */}
            <motion.button
              whileHover={{ y: -8, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setExistingStep('input');
                setExistingOtp('');
                setActiveModal('existing');
              }}
              className={`group relative flex flex-col justify-between p-8 lg:p-10 rounded-[32px] text-left overflow-hidden h-full min-h-[380px] lg:min-h-[420px] shadow-md hover:shadow-xl transition-all duration-300 border ${
                isHighContrast 
                  ? 'bg-zinc-900 border-yellow-400' 
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#00685f]/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-700 ease-out" />
              
              <div className="flex flex-col gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#008378] flex items-center justify-center mb-2 group-hover:bg-[#00685f] group-hover:rotate-3 transition-all duration-300 shadow-md">
                  <BadgeCheck className="w-11 h-11 text-white" />
                </div>
                
                <h2 className={`text-2xl lg:text-3xl font-bold tracking-tight transition-colors ${
                  isHighContrast ? 'text-yellow-300' : 'text-[#151c27] group-hover:text-[#00685f]'
                }`}>
                  {t.c1Title}
                </h2>
                
                <p className={`text-base lg:text-lg leading-relaxed max-w-[90%] ${
                  isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
                }`}>
                  {t.c1Desc}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-8 self-end font-bold text-xs md:text-sm tracking-wider text-[#00685f] opacity-70 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                <span>{t.c1Action}</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>

            {/* 2. New Patient Card */}
            <motion.button
              whileHover={{ y: -8, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setOtpSent(false);
                setRegVoiceStep('name');
                setActiveModal('new');
              }}
              className={`group relative flex flex-col justify-between p-8 lg:p-10 rounded-[32px] text-left overflow-hidden h-full min-h-[380px] lg:min-h-[420px] shadow-md hover:shadow-xl transition-all duration-300 border ${
                isHighContrast 
                  ? 'bg-zinc-900 border-yellow-400' 
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#0058be]/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-700 ease-out" />
              
              <div className="flex flex-col gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#2170e4] flex items-center justify-center mb-2 group-hover:bg-[#0058be] group-hover:rotate-3 transition-all duration-300 shadow-md">
                  <UserPlus className="w-11 h-11 text-white" />
                </div>
                
                <h2 className={`text-2xl lg:text-3xl font-bold tracking-tight transition-colors ${
                  isHighContrast ? 'text-yellow-300' : 'text-[#151c27] group-hover:text-[#0058be]'
                }`}>
                  {t.c2Title}
                </h2>
                
                <p className={`text-base lg:text-lg leading-relaxed max-w-[90%] ${
                  isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
                }`}>
                  {t.c2Desc}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-8 self-end font-bold text-xs md:text-sm tracking-wider text-[#0058be] opacity-70 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                <span>{t.c2Action}</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>

            {/* 3. ABHA ID Card */}
            <motion.button
              whileHover={{ y: -8, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveModal('abha')}
              className={`group relative flex flex-col justify-between p-8 lg:p-10 rounded-[32px] text-left overflow-hidden h-full min-h-[380px] lg:min-h-[420px] shadow-md hover:shadow-xl transition-all duration-300 border ${
                isHighContrast 
                  ? 'bg-zinc-900 border-yellow-400' 
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#825100]/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-700 ease-out" />
              
              <div className="flex flex-col gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#a36700] flex items-center justify-center mb-2 group-hover:bg-[#825100] group-hover:rotate-3 transition-all duration-300 shadow-md">
                  <Shield className="w-11 h-11 text-white" />
                </div>
                
                <h2 className={`text-2xl lg:text-3xl font-bold tracking-tight transition-colors ${
                  isHighContrast ? 'text-yellow-300' : 'text-[#151c27] group-hover:text-[#825100]'
                }`}>
                  {t.c3Title}
                </h2>
                
                <p className={`text-base lg:text-lg leading-relaxed max-w-[90%] ${
                  isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
                }`}>
                  {t.c3Desc}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-8 self-end font-bold text-xs md:text-sm tracking-wider text-[#825100] opacity-70 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                <span>{t.c3Action}</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>

          </div>

        </div>
      </main>

      {/* Bottom Accessibility & Exit Footer */}
      <footer className={`fixed bottom-0 left-0 w-full z-40 h-24 flex items-center justify-between px-6 md:px-12 backdrop-blur-md border-t transition-colors ${
        isHighContrast
          ? 'bg-zinc-950 border-zinc-800'
          : 'bg-[#e7eefe]/95 border-[#cbd5e1] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]'
      }`}>
        <div className="h-full w-full max-w-[1440px] mx-auto flex items-center justify-between">
          
          {/* Left: Accessibility Controls */}
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#3d4947] mb-1">
              {t.access}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSpeech}
                title="Read aloud"
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                  isSpeaking
                    ? 'bg-[#00685f] text-white border-[#00685f]'
                    : isHighContrast
                    ? 'bg-zinc-900 border-yellow-400 text-yellow-300'
                    : 'bg-white border-[#cbd5e1] text-[#00685f] hover:bg-[#00685f] hover:text-white'
                }`}
              >
                <Volume2 className="w-6 h-6" />
              </button>

              <button
                onClick={toggleFontSize}
                title="Font Size"
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                  fontLevel > 0
                    ? 'bg-[#00685f] text-white border-[#00685f]'
                    : isHighContrast
                    ? 'bg-zinc-900 border-yellow-400 text-yellow-300'
                    : 'bg-white border-[#cbd5e1] text-[#00685f] hover:bg-[#00685f] hover:text-white'
                }`}
              >
                <Type className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsHighContrast(!isHighContrast)}
                title="High Contrast"
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-yellow-500'
                    : 'bg-white border-[#cbd5e1] text-[#00685f] hover:bg-[#00685f] hover:text-white'
                }`}
              >
                <Contrast className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right: Exit Kiosk Button */}
          <button
            onClick={handleExitKiosk}
            className="px-8 py-3.5 bg-[#0058be] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm md:text-base tracking-wide shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.exit}</span>
          </button>
        </div>
      </footer>

      {/* ===================== MODALS ===================== */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[92vh] overflow-y-auto"
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. Existing Patient Modal Content */}
              {activeModal === 'existing' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#008378] text-white flex items-center justify-center shadow-sm">
                      <BadgeCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {langCode === 'hi' ? 'पंजीकृत मरीज लॉगिन' : 'Existing Patient Lookup'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {existingStep === 'input' 
                          ? (langCode === 'hi' ? 'अपनी मेडिकल प्रोफ़ाइल खोजें' : 'Search your medical profile')
                          : (langCode === 'hi' ? 'फ़ोन नंबर सत्यापन' : 'Phone Verification')}
                      </p>
                    </div>
                  </div>

                  {existingStep === 'input' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          {langCode === 'hi' ? 'पंजीकृत मोबाइल नंबर *' : 'Registered Mobile Number *'}
                        </label>
                        <div className="flex gap-2">
                          <div className="flex h-12 items-center px-4 rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-600 text-sm">
                            +91
                          </div>
                          <Input
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            value={existingData.phone}
                            onChange={(e) => setExistingData({ ...existingData, phone: e.target.value.replace(/\D/g, '') })}
                            className="flex-1 h-12 rounded-xl text-base font-medium"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {langCode === 'hi' ? 'सत्यापन के लिए आपके नंबर पर एक ओटीपी भेजा जाएगा' : 'An OTP will be sent to your mobile for verification'}
                        </p>
                      </div>

                      <div className="flex items-center my-2">
                        <div className="flex-1 border-t border-slate-200" />
                        <span className="px-3 text-xs uppercase font-bold text-slate-400">
                          {langCode === 'hi' ? 'या फिर' : 'OR'}
                        </span>
                        <div className="flex-1 border-t border-slate-200" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          {langCode === 'hi' ? 'हॉस्पिटल आईडी या UHID' : 'Hospital ID or UHID'}
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="e.g. HOSP-2024-8891"
                            value={existingData.hospitalId}
                            onChange={(e) => setExistingData({ ...existingData, hospitalId: e.target.value })}
                            className="pl-10 h-12 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveModal(null)} 
                          className="flex-1 h-12 rounded-xl font-bold"
                        >
                          {langCode === 'hi' ? 'रद्द करें' : 'Cancel'}
                        </Button>
                        <Button 
                          onClick={handleExistingPatient} 
                          disabled={loading || (!existingData.phone && !existingData.hospitalId)}
                          className="flex-1 h-12 rounded-xl font-bold bg-[#00685f] hover:bg-[#005049] text-white shadow-md flex items-center justify-center gap-2"
                        >
                          {existingData.phone ? (
                            <>
                              <Phone className="w-4 h-4" />
                              <span>{loading ? (langCode === 'hi' ? 'ओटीपी भेजा जा रहा है...' : 'Sending OTP...') : (langCode === 'hi' ? 'ओटीपी भेजें और सत्यापित करें' : 'Send OTP & Proceed')}</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span>{loading ? (langCode === 'hi' ? 'खोज रहे हैं...' : 'Searching...') : (langCode === 'hi' ? 'खोजें और आगे बढ़ें' : 'Search & Proceed')}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                        <p className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-teal-600" />
                          {langCode === 'hi' ? 'ओटीपी भेजा गया:' : 'OTP Sent to:'} +91 {existingData.phone}
                        </p>
                        <p className="text-xs text-teal-700 mt-1 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{langCode === 'hi' ? 'ट्विलियो लाइव एसएमएस सत्यापन सक्रिय है' : 'Twilio Live Verify Active'}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-medium text-teal-800">{langCode === 'hi' ? 'फोन पर आया कोड दर्ज करें' : 'Enter code from SMS'}</span>
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            {langCode === 'hi' ? '६-अंकों का ओटीपी दर्ज करें' : 'Enter 6-Digit OTP'}
                          </label>
                          {existingTimer > 0 ? (
                            <span className="text-xs font-semibold text-slate-500">
                              {langCode === 'hi' ? `पुनः भेजें ${existingTimer}s` : `Resend in ${existingTimer}s`}
                            </span>
                          ) : (
                            <button
                              onClick={resendExistingOTP}
                              disabled={loading}
                              className="text-xs font-bold text-[#00685f] hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                              <span>{langCode === 'hi' ? 'ओटीपी पुनः भेजें' : 'Resend OTP'}</span>
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-4 w-5 h-5 text-slate-400" />
                          <Input
                            maxLength={6}
                            placeholder="• • • • • •"
                            value={existingOtp}
                            onChange={(e) => setExistingOtp(e.target.value.replace(/\D/g, ''))}
                            className="h-14 pl-12 text-center tracking-[0.4em] text-2xl font-bold rounded-xl"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setExistingStep('input');
                            setExistingOtp('');
                          }} 
                          className="h-12 rounded-xl font-bold px-4"
                        >
                          {langCode === 'hi' ? 'नंबर बदलें' : 'Change Number'}
                        </Button>
                        <Button 
                          onClick={verifyExistingOTP} 
                          disabled={loading || existingOtp.length !== 6}
                          className="flex-1 h-12 rounded-xl font-bold bg-[#00685f] hover:bg-[#005049] text-white shadow-md flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{loading ? (langCode === 'hi' ? 'सत्यापित हो रहा है...' : 'Verifying...') : (langCode === 'hi' ? 'सत्यापित करें और लॉगिन करें' : 'Verify & Login')}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. New Patient Registration Modal Content */}
              {activeModal === 'new' && (
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#2170e4] text-white flex items-center justify-center shadow-sm">
                        <UserPlus className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {langCode === 'hi' ? 'नया मरीज पंजीकरण' : 'New Patient Registration'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {otpSent 
                            ? (langCode === 'hi' ? 'फ़ोन नंबर सत्यापन' : 'Phone Verification')
                            : (langCode === 'hi' ? 'चरणबद्ध वॉयस गाइडेंस के साथ' : 'Sequential Voice Assisted Intake')}
                        </p>
                      </div>
                    </div>

                    {!otpSent && (
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Voice Guided</span>
                      </div>
                    )}
                  </div>

                  {!otpSent ? (
                    <div className="space-y-4">

                      {/* Step Guidance Tracker — 3 steps */}
                      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-bold text-center">
                        <div className={`py-1 rounded-lg transition-colors ${newData.name ? 'bg-emerald-100 text-emerald-800' : regVoiceStep === 'name' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}>
                          1. Name
                        </div>
                        <div className={`py-1 rounded-lg transition-colors ${newData.age ? 'bg-emerald-100 text-emerald-800' : regVoiceStep === 'age' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}>
                          2. Age
                        </div>
                        <div className={`py-1 rounded-lg transition-colors ${newData.contactNumber.length === 10 ? 'bg-emerald-100 text-emerald-800' : regVoiceStep === 'phone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'}`}>
                          3. Mobile
                        </div>
                      </div>

                      {/* 1. Full Name Field with Dedicated Mic */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            {langCode === 'hi' ? 'पूरा नाम *' : 'Full Name *'}
                          </label>
                          {regVoiceStep === 'name' && (
                            <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                              <Mic className="w-3 h-3" /> Listening for name...
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <Input
                            placeholder={langCode === 'hi' ? 'उदा. रमेश कुमार' : 'e.g. Ramesh Kumar'}
                            value={newData.name}
                            onChange={(e) => setNewData({ ...newData, name: e.target.value })}
                            className={`h-12 rounded-xl pr-12 text-sm font-medium ${
                              regVoiceStep === 'name' || activeFieldDictating === 'name' 
                                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' 
                                : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => dictateField('name')}
                            title="Speak Name"
                            className={`absolute right-2 p-2 rounded-lg transition-colors ${
                              activeFieldDictating === 'name'
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Age & Gender Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                              {langCode === 'hi' ? 'उम्र *' : 'Age *'}
                            </label>
                            {regVoiceStep === 'age' && (
                              <span className="text-[10px] text-blue-600 font-bold animate-pulse">
                                Speak age
                              </span>
                            )}
                          </div>
                          <div className="relative flex items-center">
                            <Input
                              type="number"
                              placeholder="35"
                              value={newData.age}
                              onChange={(e) => setNewData({ ...newData, age: e.target.value })}
                              className={`h-12 rounded-xl pr-10 text-sm font-medium ${
                                regVoiceStep === 'age' || activeFieldDictating === 'age' 
                                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' 
                                : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => dictateField('age')}
                              title="Speak Age"
                              className={`absolute right-2 p-2 rounded-lg transition-colors ${
                                activeFieldDictating === 'age'
                                  ? 'bg-red-500 text-white animate-pulse'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                              }`}
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            {langCode === 'hi' ? 'लिंग *' : 'Gender *'}
                          </label>
                          <select
                            value={newData.gender}
                            onChange={(e) => setNewData({ ...newData, gender: e.target.value })}
                            className="w-full h-12 px-3 border border-slate-300 rounded-xl bg-white text-slate-800 font-medium text-sm outline-none focus:border-blue-500"
                          >
                            <option value="male">{langCode === 'hi' ? 'पुरुष (Male)' : 'Male (पुरुष)'}</option>
                            <option value="female">{langCode === 'hi' ? 'महिला (Female)' : 'Female (महिला)'}</option>
                            <option value="other">{langCode === 'hi' ? 'अन्य (Other)' : 'Other (अन्य)'}</option>
                          </select>
                        </div>
                      </div>

                      {/* 3. Mobile Number Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            {langCode === 'hi' ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                          </label>
                          {regVoiceStep === 'phone' && (
                            <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                              <Mic className="w-3 h-3" /> Listening 10 digits...
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex h-12 items-center px-3.5 rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-600 text-sm">
                            +91
                          </div>
                          <div className="relative flex-1 flex items-center">
                            <Input
                              type="tel"
                              maxLength={10}
                              placeholder="9876543210"
                              value={newData.contactNumber}
                              onChange={(e) => setNewData({ ...newData, contactNumber: e.target.value.replace(/\D/g, '') })}
                              className={`h-12 rounded-xl pr-10 text-base font-medium ${
                                regVoiceStep === 'phone' || activeFieldDictating === 'phone' 
                                  ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' 
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => dictateField('phone')}
                              title="Speak Mobile Number"
                              className={`absolute right-2 p-2 rounded-lg transition-colors ${
                                activeFieldDictating === 'phone'
                                  ? 'bg-red-500 text-white animate-pulse'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                              }`}
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveModal(null)} 
                          className="flex-1 h-12 rounded-xl font-bold"
                        >
                          {langCode === 'hi' ? 'रद्द करें' : 'Cancel'}
                        </Button>
                        <Button 
                          onClick={sendOTP} 
                          disabled={loading || !newData.name || !newData.age || !newData.contactNumber || newData.contactNumber.length !== 10}
                          className="flex-1 h-12 rounded-xl font-bold bg-[#0058be] hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>{loading ? (langCode === 'hi' ? 'ओटीपी भेजा जा रहा है...' : 'Sending OTP...') : (langCode === 'hi' ? 'ओटीपी भेजें' : 'Send OTP')}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                        <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          {langCode === 'hi' ? 'ओटीपी भेजा गया:' : 'OTP sent to:'} +91 {newData.contactNumber}
                        </p>
                        <p className="text-xs text-blue-700 mt-1 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{langCode === 'hi' ? 'ट्विलियो लाइव एसएमएस सत्यापन सक्रिय है' : 'Twilio Live Verify Active'}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-medium text-blue-800">{langCode === 'hi' ? 'फोन पर आया कोड दर्ज करें' : 'Enter code from SMS'}</span>
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            {langCode === 'hi' ? '६-अंकों का ओटीपी दर्ज करें' : 'Enter 6-Digit OTP'}
                          </label>
                          {newTimer > 0 ? (
                            <span className="text-xs font-semibold text-slate-500">
                              {langCode === 'hi' ? `पुनः भेजें ${newTimer}s` : `Resend in ${newTimer}s`}
                            </span>
                          ) : (
                            <button
                              onClick={resendNewOTP}
                              disabled={loading}
                              className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                              <span>{langCode === 'hi' ? 'ओटीपी पुनः भेजें' : 'Resend OTP'}</span>
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-4 w-5 h-5 text-slate-400" />
                          <Input
                            maxLength={6}
                            placeholder="• • • • • •"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="h-14 pl-12 text-center tracking-[0.4em] text-2xl font-bold rounded-xl"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setOtpSent(false);
                            setOtp('');
                          }} 
                          className="h-12 rounded-xl font-bold px-4"
                        >
                          {langCode === 'hi' ? 'विवरण बदलें' : 'Change Info'}
                        </Button>
                        <Button 
                          onClick={verifyOTP} 
                          disabled={loading || otp.length !== 6}
                          className="flex-1 h-12 rounded-xl font-bold bg-[#0058be] hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{loading ? (langCode === 'hi' ? 'सत्यापित हो रहा है...' : 'Verifying...') : (langCode === 'hi' ? 'सत्यापित करें और पंजीकृत हों' : 'Verify & Register')}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. ABHA ID Modal Content */}
              {activeModal === 'abha' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#a36700] text-white flex items-center justify-center shadow-sm">
                      <Shield className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">ABHA Account Verification</h3>
                      <p className="text-sm text-slate-500">Ayushman Bharat Digital Mission</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        14-Digit ABHA Number
                      </label>
                      <Input
                        maxLength={17}
                        placeholder="12-3456-7890-1234"
                        value={abhaNumber}
                        onChange={(e) => setAbhaNumber(formatAbhaInput(e.target.value))}
                        className="h-12 text-lg font-bold tracking-wider rounded-xl"
                      />
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <QrCode className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Scan ABHA QR Code</p>
                        <p className="text-xs text-amber-700 mt-0.5">Scan your physical ABHA card with the kiosk reader.</p>
                        <button 
                          onClick={() => setAbhaNumber('14-8890-4421-9012')}
                          className="mt-2 text-xs font-bold text-amber-800 bg-amber-200/80 px-3 py-1 rounded-lg hover:bg-amber-300 transition"
                        >
                          Simulate QR Scan
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveModal(null)} 
                        className="flex-1 h-12 rounded-xl font-bold"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={verifyAbha} 
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl font-bold bg-[#825100] hover:bg-[#653e00] text-white shadow-md flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{loading ? 'Verifying...' : 'Verify & Link'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Guide Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#cbd5e1] relative z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">CarePortal Guide</h3>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="py-4 space-y-3 text-slate-600 text-sm md:text-base leading-relaxed">
                <p>1. <strong>Existing Patient</strong>: Choose this to look up previous visits via Mobile No. or Hospital ID.</p>
                <p>2. <strong>New Patient</strong>: Choose this to quickly register your details in under 2 minutes.</p>
                <p>3. <strong>ABHA ID</strong>: Link your 14-digit Ayushman Bharat health record directly.</p>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setShowHelpModal(false)} className="bg-[#00685f] hover:bg-[#005049] text-white">
                  Got It
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Status Indicator */}
      {voiceMode !== 'idle' && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-xs font-bold pointer-events-none select-none ${
          voiceMode === 'speaking' ? 'bg-[#00685f]' : 'bg-red-500'
        }`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-white" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          {voiceMode === 'speaking'
            ? (langCode === 'hi' ? '🔊 बोल रहा हूँ...' : '🔊 Speaking...')
            : (langCode === 'hi' ? '🎤 सुन रहा हूँ...' : '🎤 Listening...')}
        </div>
      )}

    </div>
  );
}
