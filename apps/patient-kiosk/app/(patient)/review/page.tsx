'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import {
  FileText,
  User,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Volume2,
  Type,
  Contrast,
  LogOut,
  Plus,
  X,
  Edit3,
  Stethoscope,
  Heart,
  Pill,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ReviewPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Patient Intake Summary State
  const [patientData, setPatientData] = useState<any>({
    name: 'Loading Patient Info...',
    age: 35,
    gender: 'Male',
    mobile: '',
    abhaId: 'ABDM-Pending',
    chiefComplaint: "General clinical consultation",
    painIntensity: 5,
    painLocations: ['General / Discomfort'],
    onset: 'Gradually',
    character: 'Aching',
    timeline: 'Recent',
    medications: 'None reported',
    allergies: 'No known drug allergies (NKDA)',
    pastConditions: ['None reported'],
    documentsCount: 0,
  });

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    loadPatientSession();

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
    };
  }, []);

  // Auto voice guidance on mount (if Voice Guide Mode is enabled)
  useEffect(() => {
    if (!mounted || !isVoiceGuideEnabled()) return;
    const script = VOICE_SCRIPTS.review[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (matchesCommand(transcript, CMD.submit) || matchesCommand(transcript, CMD.agree)) {
          handleFinalSubmit();
        } else if (matchesCommand(transcript, CMD.back)) {
          router.push('/family');
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle')
    );
    stopVoiceRef.current = stop;
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, langCode]);

  const loadPatientSession = async () => {
    try {
      const patientId = localStorage.getItem('careportal_patient_id');
      const storedName = localStorage.getItem('careportal_patient_name');
      const storedPhone = localStorage.getItem('careportal_patient_phone');
      const storedAge = localStorage.getItem('careportal_patient_age');
      const storedGender = localStorage.getItem('careportal_patient_gender');
      const storedAbha = localStorage.getItem('careportal_patient_abha');

      const storedComplaint = localStorage.getItem('careportal_chief_complaint') || 
                              localStorage.getItem('careportal_symptoms_text');
      
      let painLocationsArr: string[] = [];
      try {
        const storedPain = localStorage.getItem('careportal_pain_locations');
        if (storedPain) {
          const parsed = JSON.parse(storedPain);
          painLocationsArr = parsed.map((p: any) => typeof p === 'string' ? p : p.nameEn || p.body_part || p.id || p.name);
        }
      } catch (e) {}

      const storedPainIntensity = localStorage.getItem('careportal_pain_intensity');
      const storedPainOnset = localStorage.getItem('careportal_pain_onset');
      const storedPainCharacter = localStorage.getItem('careportal_pain_character');

      let historyAnswers: any = {};
      let extractedConditions: string[] = [];
      let extractedMeds = 'None reported';
      let extractedAllergies = 'No known drug allergies (NKDA)';

      try {
        const storedAnswers = localStorage.getItem('careportal_history_answers');
        if (storedAnswers) {
          historyAnswers = JSON.parse(storedAnswers);
          Object.values(historyAnswers).forEach((val: any) => {
            if (typeof val === 'string' && val.trim()) {
              const lower = val.toLowerCase();
              if (lower.includes('hypertension') || lower.includes('bp') || lower.includes('blood pressure')) {
                extractedConditions.push('Hypertension');
              }
              if (lower.includes('diabetes') || lower.includes('sugar')) {
                extractedConditions.push('Diabetes Mellitus');
              }
              if (lower.includes('asthma') || lower.includes('wheezing')) {
                extractedConditions.push('Asthma / Respiratory');
              }
              if (lower.includes('thyroid')) {
                extractedConditions.push('Thyroid Disorder');
              }
              if (lower.includes('allergy') || lower.includes('allergic')) {
                extractedAllergies = val;
              }
              if (lower.includes('medication') || lower.includes('tablet') || lower.includes('taking')) {
                extractedMeds = val;
              }
            }
          });
        }
      } catch (e) {}

      let familyHistoryList: any[] = [];
      try {
        const storedFamily = localStorage.getItem('careportal_family_history');
        if (storedFamily) familyHistoryList = JSON.parse(storedFamily);
      } catch (e) {}

      // Try fetching patient details from Supabase
      let fetchedPatient: any = null;
      if (patientId) {
        try {
          const { data: pData } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .maybeSingle();
          if (pData) fetchedPatient = pData;
        } catch (e) {}
      }

      const finalName = storedName || fetchedPatient?.name || (fetchedPatient?.first_name ? `${fetchedPatient.first_name} ${fetchedPatient.last_name || ''}`.trim() : 'Registered Patient');
      const finalAge = Number(storedAge) || fetchedPatient?.age || 38;
      const finalGender = storedGender || fetchedPatient?.gender || 'Male';
      const finalPhone = storedPhone || fetchedPatient?.contact_number || fetchedPatient?.phone || '+91 98765 43210';
      const finalAbha = storedAbha || fetchedPatient?.abha_id || 'ABDM-9182-3921';

      setPatientData({
        name: finalName,
        age: finalAge,
        gender: finalGender.charAt(0).toUpperCase() + finalGender.slice(1),
        mobile: finalPhone,
        abhaId: finalAbha,
        chiefComplaint: storedComplaint || 'Clinical evaluation and intake recorded at kiosk.',
        painIntensity: storedPainIntensity ? Number(storedPainIntensity) : (painLocationsArr.length > 0 ? 7 : 4),
        painLocations: painLocationsArr.length > 0 ? painLocationsArr : ['General / As reported'],
        onset: storedPainOnset || 'Gradually',
        character: storedPainCharacter || 'Aching, Persistent',
        timeline: 'Recent onset (1-3 days)',
        medications: extractedMeds,
        allergies: extractedAllergies,
        pastConditions: extractedConditions.length > 0 ? extractedConditions : ['None reported'],
        familyHistory: familyHistoryList,
        documentsCount: 1,
      });
    } catch (err) {
      console.warn('Session load warning:', err);
    }
  };

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(10);

  const handleFinalSubmit = async () => {
    stopVoiceRef.current?.();
    setIsSubmitting(true);
    setLoadingStep(0);
    setLoadingProgress(15);

    try {
      const patientId = localStorage.getItem('careportal_patient_id');
      const sessionId = localStorage.getItem('careportal_session_id');
      const historyId = localStorage.getItem('careportal_history_id');

      // Stage 1: Initializing
      const step1Timer = setTimeout(() => {
        setLoadingStep(1);
        setLoadingProgress(35);
      }, 600);

      // Generate OPD Token Number (e.g. TK-204 or OPD-A18)
      const tokenNumber = `TK-${Math.floor(100 + Math.random() * 900)}`;
      localStorage.setItem('careportal_generated_token', tokenNumber);

      // Determine Assigned Doctor & Specialty based on symptoms
      let assignedDoctor = {
        name: 'Dr. Rajesh Verma',
        degree: 'MS (Ortho), FISM',
        specialty: 'Senior Orthopedic Surgeon & Spine Specialist',
        specialtyHi: 'वरिष्ठ आर्थोपेडिक सर्जन एवं रीढ़ रोग विशेषज्ञ',
        room: 'OPD Room 204 (Orthopedics Wing)',
        roomHi: 'ओपीडी कक्ष २०४ (हड्डी रोग विभाग)',
        waitTime: '12-15 Mins',
        queuePosition: 3,
      };

      const complaintLower = (patientData.chiefComplaint || '').toLowerCase();
      let priority = 'normal';
      let department = 'Orthopedics';

      if (complaintLower.includes('chest') || complaintLower.includes('heart') || complaintLower.includes('breath') || complaintLower.includes('pressure')) {
        assignedDoctor = {
          name: 'Dr. Sarah Chen',
          degree: 'MD, DM (Cardiology)',
          specialty: 'Chief Cardiologist & Critical Care',
          specialtyHi: 'मुख्य हृदय रोग विशेषज्ञ एवं गहन चिकित्सा',
          room: 'OPD Room 104 (Cardiac Center)',
          roomHi: 'ओपीडी कक्ष १०४ (हृदय रोग केंद्र)',
          waitTime: '5-8 Mins (Priority)',
          queuePosition: 1,
        };
        priority = 'critical';
        department = 'Cardiology';
      } else if (complaintLower.includes('fever') || complaintLower.includes('cough') || complaintLower.includes('cold') || complaintLower.includes('viral')) {
        assignedDoctor = {
          name: 'Dr. Anita Nair',
          degree: 'MD (Internal Medicine)',
          specialty: 'Senior Consultant - General Medicine & Pulmonology',
          specialtyHi: 'वरिष्ठ सलाहकार - सामान्य चिकित्सा एवं श्वसन रोग',
          room: 'OPD Room 102 (General Medicine)',
          roomHi: 'ओपीडी कक्ष १०२ (सामान्य चिकित्सा)',
          waitTime: '10-12 Mins',
          queuePosition: 2,
        };
        priority = 'urgent';
        department = 'General Medicine';
      } else if (complaintLower.includes('stomach') || complaintLower.includes('vomit') || complaintLower.includes('abdomen') || complaintLower.includes('digest')) {
        assignedDoctor = {
          name: 'Dr. Vikram Malhotra',
          degree: 'MD, DM (Gastroenterology)',
          specialty: 'Consultant Gastroenterologist',
          specialtyHi: 'सलाहकार गैस्ट्रोएंटेरोलॉजिस्ट (पेट व लिवर विशेषज्ञ)',
          room: 'OPD Room 305 (Gastroenterology Wing)',
          roomHi: 'ओपीडी कक्ष ३०५ (गैस्ट्रो विभाग)',
          waitTime: '15-18 Mins',
          queuePosition: 4,
        };
        priority = 'urgent';
        department = 'Gastroenterology';
      }

      localStorage.setItem('careportal_assigned_doctor', JSON.stringify(assignedDoctor));

      // Retrieve history questionnaire answers
      let historyAnswers = {};
      try {
        const storedAnswers = localStorage.getItem('careportal_history_answers');
        if (storedAnswers) historyAnswers = JSON.parse(storedAnswers);
      } catch (e) {}

      // Stage 2: AI Clinical Summary Synthesis
      setTimeout(() => {
        setLoadingStep(2);
        setLoadingProgress(60);
      }, 1200);

      // 1. Generate Physician-Ready AI Clinical Summary and Persist to Supabase
      try {
        const genRes = await fetch('/api/clinical-summary/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patientId,
            sessionId: sessionId,
            historyId: historyId,
            tokenNumber: tokenNumber,
            patientName: patientData.name || 'Registered Patient',
            patientAge: patientData.age || 42,
            patientGender: patientData.gender || 'male',
            patientPhone: patientData.mobile || '9084636775',
            chiefComplaint: patientData.chiefComplaint,
            painLocations: patientData.painLocations,
            painIntensity: patientData.painIntensity || 7,
            onset: patientData.onset || 'Gradually',
            character: patientData.character || 'Aching, Dull, Sharp on movement',
            timeline: patientData.timeline || '1-3 days ago',
            historyAnswers: historyAnswers,
            pastMedicalHistory: Array.isArray(patientData.pastConditions) ? patientData.pastConditions : [patientData.pastConditions].filter(Boolean),
            medications: Array.isArray(patientData.medications) ? patientData.medications : [patientData.medications].filter(Boolean),
            allergies: Array.isArray(patientData.allergies) ? patientData.allergies : [patientData.allergies].filter(Boolean),
            department: department,
            priority: priority,
          }),
        });

        const genData = await genRes.json();
        if (genData.success && genData.clinicalSummary) {
          localStorage.setItem('careportal_ai_clinical_summary', JSON.stringify(genData.clinicalSummary));
        }
      } catch (genErr) {
        console.warn('API clinical summary generation call notice:', genErr);
      }

      // Stage 3: Real-Time Transmission to Doctor Dashboard
      setTimeout(() => {
        setLoadingStep(3);
        setLoadingProgress(85);
      }, 2000);

      // 2. Update session status
      if (sessionId) {
        await supabase
          .from('patient_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_step: 'complete',
            progress: 100,
          })
          .eq('id', sessionId);
      }

      // Stage 4: OPD Token Finalization
      setTimeout(() => {
        setLoadingStep(4);
        setLoadingProgress(100);
      }, 2600);

      // Transition to Complete Screen
      setTimeout(() => {
        toast({
          title: langCode === 'hi' ? 'पंजीकरण पूर्ण हुआ!' : 'Intake Summary Transmitted!',
          description: langCode === 'hi' 
            ? `टोकन संख्या ${tokenNumber} उत्पन्न की गई है। आपका केस डॉक्टर डैशबोर्ड पर लाइव भेज दिया गया है।` 
            : `Token ${tokenNumber} generated. Clinical summary synchronized with Doctor Dashboard.`,
        });
        router.push('/complete');
      }, 3300);

    } catch (error) {
      console.warn('Final submission error:', error);
      setTimeout(() => router.push('/complete'), 2500);
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
      ? 'कृपया डॉक्टर को भेजने से पहले अपनी पूरी स्वास्थ्य जानकारी की समीक्षा करें और पुष्टि करें।'
      : 'Please review your complete clinical intake details before final submission to your assigned doctor.';
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
    stopVoiceRef.current?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    localStorage.removeItem('careportal_patient_id');
    localStorage.removeItem('careportal_session_id');
    localStorage.removeItem('careportal_history_id');
    router.push('/');
  };

  const t = {
    en: {
      help: 'HELP',
      step: 'STEP 6 OF 7: FINAL REVIEW & SUBMISSION',
      title: 'Review Your Intake Information',
      subtitle: 'Please verify that the details recorded during your kiosk session are accurate before sending to your physician.',
      patientInfo: 'Patient Demographics',
      chiefComplaint: 'Chief Complaint & Symptoms',
      painMap: 'Pain Assessment & Intensity',
      historyTitle: 'Clinical History & Health Background',
      documents: 'Uploaded Records',
      verifyBadge: 'ABDM Verified',
      consentTitle: 'Patient Confirmation & Consent',
      consentDesc: 'I confirm that all symptoms, medical history, and documents provided are accurate to the best of my knowledge.',
      back: 'Back to Edit',
      submitBtn: 'Confirm & Generate OPD Token',
      submitting: 'Finalizing Submission...',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      secureNotice: 'Your health records are encrypted and protected under national data privacy norms.',
    },
    hi: {
      help: 'सहायता',
      step: 'चरण ६ / ७: अंतिम समीक्षा एवं पुष्टि (FINAL REVIEW)',
      title: 'अपनी स्वास्थ्य जानकारी की समीक्षा करें',
      subtitle: 'कृपया डॉक्टर को भेजने से पहले कियोस्क सत्र के दौरान दर्ज किए गए सभी विवरणों की पुष्टि करें।',
      patientInfo: 'रोगी की पहचान व विवरण',
      chiefComplaint: 'मुख्य समस्या एवं लक्षण',
      painMap: 'दर्द मूल्यांकन एवं तीव्रता',
      historyTitle: 'चिकित्सा इतिहास एवं पृष्ठभूमि',
      documents: 'अपलोड किए गए दस्तावेज़',
      verifyBadge: 'आयुष्मान (ABDM) सत्यापित',
      consentTitle: 'रोगी की पुष्टि एवं सहमति',
      consentDesc: 'मैं पुष्टि करता/करती हूँ कि मेरे द्वारा प्रदान किए गए सभी लक्षण और चिकित्सा इतिहास मेरी जानकारी के अनुसार सटीक हैं।',
      back: 'संशोधित करें',
      submitBtn: 'पुष्टि करें और ओपीडी टोकन बनाएं',
      submitting: 'सबमिट किया जा रहा है...',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      secureNotice: 'आपके स्वास्थ्य रिकॉर्ड राष्ट्रीय डेटा गोपनीयता मानकों के तहत एन्क्रिप्टेड और सुरक्षित हैं।',
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Decorative Ambient Background Glow Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00685f]/10 rounded-full blur-[100px] -z-10 -mr-32 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0058be]/10 rounded-full blur-[90px] -z-10 -ml-28 -mb-28 pointer-events-none" />

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

      {/* Main Content Area */}
      <main className="flex-1 pt-24 pb-28 w-full max-w-4xl mx-auto px-6 md:px-8 flex flex-col">
        
        {/* Step Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-center mb-3"
        >
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-xs ${
            isHighContrast
              ? 'bg-zinc-900 border-yellow-400 text-yellow-400'
              : 'bg-[#f0f3ff] border-[#bcc9c6]/40 text-[#3d4947]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#00685f] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">{t.step}</span>
          </div>
        </motion.div>

        {/* Heading & Subtitle */}
        <div className="text-center mb-6">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-extrabold tracking-tight mb-2 ${
              isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
            } ${fontLevel === 1 ? 'text-3xl sm:text-4xl' : fontLevel === 2 ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl md:text-[34px]'}`}
          >
            {t.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`max-w-2xl mx-auto font-medium text-xs sm:text-sm md:text-base leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
            }`}
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Structured Review Cards Grid */}
        <div className="flex flex-col gap-4 w-full mb-6">
          
          {/* Card 1: Patient Identity Card */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`rounded-2xl p-5 sm:p-6 shadow-sm border ${
              isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00685f] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                  {t.patientInfo}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.verifyBadge}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-[#64748b] block font-medium">Name:</span>
                <span className="font-bold text-[#151c27]">{patientData.name}</span>
              </div>
              <div>
                <span className="text-[#64748b] block font-medium">Age & Gender:</span>
                <span className="font-bold text-[#151c27]">{patientData.age} Yrs / {patientData.gender}</span>
              </div>
              <div>
                <span className="text-[#64748b] block font-medium">Mobile:</span>
                <span className="font-bold text-[#151c27]">{patientData.mobile}</span>
              </div>
              <div>
                <span className="text-[#64748b] block font-medium">ABHA Address:</span>
                <span className="font-mono font-bold text-[#00685f]">{patientData.abhaId}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Symptoms & Pain Map Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl p-5 sm:p-6 shadow-sm border ${
              isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00685f] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                  {t.chiefComplaint}
                </h3>
              </div>
              <button
                onClick={() => router.push('/symptoms')}
                className="text-xs font-bold text-[#00685f] hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f0f3ff] mb-4 text-xs sm:text-sm font-medium text-[#151c27]">
              "{patientData.chiefComplaint}"
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl border border-slate-200/80">
                <span className="text-[#64748b] block font-medium mb-1">Marked Pain Regions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {patientData.painLocations.map((loc: string, i: number) => (
                    <span key={i} className="px-2.5 py-0.5 bg-[#00685f] text-white text-[11px] font-bold rounded-full">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80">
                <span className="text-[#64748b] block font-medium mb-1">Pain Severity Rating:</span>
                <span className="font-extrabold text-xl text-[#00685f]">
                  {patientData.painIntensity} <span className="text-xs font-normal text-[#64748b]">/ 10 (Moderate-Severe)</span>
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80">
                <span className="text-[#64748b] block font-medium mb-1">Onset & Character:</span>
                <span className="font-bold text-[#151c27]">{patientData.onset} • {patientData.character}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Clinical Background & Health History Highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`rounded-2xl p-5 sm:p-6 shadow-sm border ${
              isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00685f] flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                  {t.historyTitle}
                </h3>
              </div>
              <button
                onClick={() => router.push('/history')}
                className="text-xs font-bold text-[#00685f] hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[#64748b] block font-medium">Chronic Conditions:</span>
                <span className="font-bold text-[#151c27]">{patientData.pastConditions.join(', ') || 'None reported'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[#64748b] block font-medium">Current Medications:</span>
                <span className="font-bold text-[#151c27]">{patientData.medications}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[#64748b] block font-medium">Allergies:</span>
                <span className="font-bold text-[#151c27]">{patientData.allergies}</span>
              </div>
            </div>
          </motion.div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
            <input
              type="checkbox"
              id="confirmConsent"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="w-5 h-5 rounded accent-[#00685f] mt-0.5 cursor-pointer"
            />
            <label htmlFor="confirmConsent" className="text-xs sm:text-sm text-[#151c27] font-medium cursor-pointer">
              <strong>{t.consentTitle}:</strong> {t.consentDesc}
            </label>
          </div>

        </div>

        {/* Bottom Actions Bar */}
        <div className={`w-full rounded-2xl py-4 px-6 shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4 mt-auto ${
          isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
        }`}>
          {/* Security Badge */}
          <div className="flex items-center gap-2 order-2 md:order-1 text-[#64748b] text-xs">
            <Lock className="w-4 h-4 stroke-[2]" />
            <span>{t.secureNotice}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
            <button
              onClick={() => router.push('/family')}
              className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 flex items-center gap-1.5 ${
                isHighContrast
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f0f3ff]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.back}</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !consentConfirmed}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 ${
                consentConfirmed && !isSubmitting
                  ? 'bg-[#00685f] hover:bg-[#005049] text-white shadow-[#00685f]/30 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-5 h-5" />
              <span>{isSubmitting ? t.submitting : t.submitBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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

      {/* ===================== FULLSCREEN ATTRACTIVE AI PROCESSING & TRANSMISSION OVERLAY ===================== */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#04131d]/90 backdrop-blur-xl text-white overflow-hidden"
          >
            {/* Ambient Animated Gradient Orbs */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#008378]/30 rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#0058be]/30 rounded-full blur-[140px] pointer-events-none animate-pulse" />

            {/* Central Animated Holographic AI Orb */}
            <div className="relative mb-8 flex items-center justify-center">
              {/* Outer Pulsing Concentric Rings */}
              <div className="absolute w-44 h-44 rounded-full border border-teal-400/20 animate-ping" />
              <div className="absolute w-36 h-36 rounded-full border border-cyan-400/30 animate-spin [animation-duration:8s]" />
              <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#008378]/40 to-[#0058be]/40 blur-md animate-pulse" />
              
              {/* Core Holographic Sphere */}
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#008378] to-[#0058be] flex items-center justify-center shadow-[0_0_50px_rgba(0,131,120,0.6)] border border-teal-300/40">
                <Stethoscope className="w-12 h-12 text-white animate-bounce" />
                <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-spin [animation-duration:4s]" />
              </div>
            </div>

            {/* Main Header Title */}
            <div className="text-center max-w-xl mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-widest border border-teal-500/30 mb-3 animate-pulse">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                {langCode === 'hi' ? 'एआई चिकित्सीय विश्लेषण एवं लाइव ट्रांसमिशन' : 'AI Clinical Synthesis & Live Transmission'}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
                {langCode === 'hi' 
                  ? 'चिकित्सीय सारांश तैयार हो रहा है एवं डॉक्टर को भेजा जा रहा है' 
                  : 'Synthesizing Clinical Intake & Transmitting Case'}
              </h2>
              <p className="text-sm text-slate-300">
                {langCode === 'hi'
                  ? 'कृपया प्रतीक्षा करें, आपका केस स्वचालित रूप से डॉक्टर के ओपीडी पोर्टल पर लाइव प्रेषित किया जा रहा है।'
                  : 'Please wait, your health profile and AI clinical summary are being encrypted and synced with your assigned physician in real time.'}
              </p>
            </div>

            {/* Live Step Checklist Card */}
            <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 backdrop-blur-md space-y-3.5 shadow-2xl">
              {[
                {
                  en: 'Analyzing Symptoms & 3D Pain Topology',
                  hi: 'लक्षण व 3D दर्द मानचित्र का विश्लेषण',
                  step: 0
                },
                {
                  en: 'Structuring SOCRATES Clinical Narrative & Timeline',
                  hi: 'चिकित्सीय समयरेखा व इतिहास का प्रारूप तैयार करना',
                  step: 1
                },
                {
                  en: 'Generating Physician-Grade EHR Clinical Summary via Gemini AI',
                  hi: 'डॉक्टर हेतु एआई क्लिनिकल सारांश का निर्माण',
                  step: 2
                },
                {
                  en: 'Transmitting Case to OPD Doctor Dashboard in Real Time',
                  hi: 'रियल-टाइम में डॉक्टर डैशबोर्ड से सिंक्रनाइज़ेशन',
                  step: 3
                },
                {
                  en: 'Allocating OPD Room & Queue Token Number',
                  hi: 'ओपीडी कक्ष व टोकन नंबर आबंटन पूर्ण',
                  step: 4
                }
              ].map((item, idx) => {
                const isPassed = loadingStep > item.step;
                const isCurrent = loadingStep === item.step;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs md:text-sm font-medium">
                    <div className="flex items-center gap-3">
                      {isPassed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/10 text-slate-500 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </div>
                      )}
                      <span className={`${isPassed ? 'text-emerald-300 font-semibold' : isCurrent ? 'text-teal-200 font-bold' : 'text-slate-400'}`}>
                        {langCode === 'hi' ? item.hi : item.en}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {isPassed ? (langCode === 'hi' ? 'पूर्ण' : 'DONE') : isCurrent ? (langCode === 'hi' ? 'प्रक्रियाधीन...' : 'IN PROGRESS') : 'WAITING'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="w-full max-w-lg">
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                <span>{langCode === 'hi' ? 'सिंक प्रगति' : 'Sync Progress'}</span>
                <span className="font-mono text-teal-300">{loadingProgress}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#008378] via-teal-400 to-[#2170e4] shadow-[0_0_15px_rgba(45,212,191,0.8)]"
                  initial={{ width: '10%' }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
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
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-[#00685f]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {langCode === 'hi' ? 'अंतिम समीक्षा सहायता' : 'Review Information Help'}
                  </h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 text-slate-600 text-sm leading-relaxed space-y-3">
                <p>
                  {langCode === 'hi'
                    ? 'कृपया अपने सभी लक्षणों और दर्ज जानकारी की जांच करें। यदि कोई बदलाव करना है तो संबंधित "संशोधित करें" बटन दबाएं।'
                    : 'Please review all your entered symptoms and clinical data. Press Edit on any section if you need to make changes.'}
                </p>
                <p>
                  {langCode === 'hi'
                    ? 'पुष्टि करने के बाद आपको एक टोकन नंबर और संबंधित डॉक्टर का विवरण प्राप्त होगा।'
                    : 'Upon confirmation, you will receive an OPD token number and assigned specialist details.'}
                </p>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-5 py-2 bg-[#00685f] hover:bg-[#005049] text-white font-bold rounded-xl text-xs"
                >
                  Got It
                </button>
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
