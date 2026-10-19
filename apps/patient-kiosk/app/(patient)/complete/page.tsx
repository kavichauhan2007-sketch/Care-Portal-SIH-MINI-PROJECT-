'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { speak, isVoiceGuideEnabled, VOICE_SCRIPTS } from '@/lib/voiceGuide';
import {
  CheckCircle2,
  Clock,
  User,
  Printer,
  Smartphone,
  Stethoscope,
  MapPin,
  QrCode,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Volume2,
  Type,
  Contrast,
  LogOut,
  Plus,
  X,
  Calendar,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CompletePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [smsSent, setSmsSent] = useState<boolean>(false);
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [smsSentPhone, setSmsSentPhone] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Dynamic Token & Assigned Doctor State
  const [tokenNumber, setTokenNumber] = useState<string>('TK-204');
  const [assignedDoctor, setAssignedDoctor] = useState<any>({
    name: 'Dr. Rajesh Verma',
    degree: 'MS (Ortho), FISM',
    specialty: 'Senior Orthopedic Surgeon & Spine Specialist',
    specialtyHi: 'वरिष्ठ आर्थोपेडिक सर्जन एवं रीढ़ रोग विशेषज्ञ',
    room: 'OPD Room 204 (Orthopedics Wing)',
    roomHi: 'ओपीडी कक्ष २०४ (हड्डी रोग विभाग)',
    waitTime: '12-15 Mins',
    queuePosition: 3,
  });

  const [patientSummary, setPatientSummary] = useState<any>({
    name: 'Ramesh Kumar Sharma',
    chiefComplaint: 'Sharp lower back pain for 3 days',
    painLocation: 'Lower Back, Shoulder',
    severity: '7 / 10',
    triageCategory: 'Level 3 - Urgent Assessment',
  });

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    // Retrieve generated token
    const storedToken = localStorage.getItem('careportal_generated_token');
    if (storedToken) setTokenNumber(storedToken);

    // Retrieve dynamically assigned doctor
    try {
      const storedDoctor = localStorage.getItem('careportal_assigned_doctor');
      if (storedDoctor) setAssignedDoctor(JSON.parse(storedDoctor));
    } catch (e) {}

    // Retrieve chief complaint
    const storedComplaint = localStorage.getItem('careportal_chief_complaint') || 
                            localStorage.getItem('careportal_symptoms_text');
    if (storedComplaint) {
      setPatientSummary((prev: any) => ({
        ...prev,
        chiefComplaint: storedComplaint,
      }));
    }

    // Auto Voice Announcement if Voice Guide Mode is enabled
    if (isVoiceGuideEnabled()) {
      const activeToken = storedToken || 'TK-204';
      const completeScript = savedLang === 'hi'
        ? `आपका चेक-इन पूरा हो गया है! आपका टोकन नंबर ${activeToken} है। कृपया अपनी पर्ची लें।`
        : `Your check-in is complete! Your token number is ${activeToken}. Please collect your printed slip or wait for SMS.`;
      speak(completeScript, savedLang);
    }

    // Auto-countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  const handlePrintSlip = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      if (typeof window !== 'undefined') {
        window.print();
      }
      toast({
        title: langCode === 'hi' ? 'टोकन पर्ची प्रिंट हो रही है' : 'Token Slip Printed',
        description: langCode === 'hi' ? 'कृपया नीचे डिस्पेंसर से अपनी पर्ची लें।' : 'Please collect your printed slip from the tray.',
      });
    }, 800);
  };

  const handleSendSms = async () => {
    if (smsSent || isSendingSms) return;

    // Read patient data from session storage
    const phone        = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_phone') || '' : '';
    const patientName  = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_name')  || 'Patient' : 'Patient';

    if (!phone || phone.length !== 10) {
      toast({
        title: langCode === 'hi' ? 'मोबाइल नंबर उपलब्ध नहीं' : 'Phone Number Not Available',
        description: langCode === 'hi'
          ? 'आपके खाते में कोई मोबाइल नंबर दर्ज नहीं है। पंजीकरण के समय नंबर दर्ज करें।'
          : 'No phone number found in your profile. Please register with a mobile number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingSms(true);
    try {
      const res = await fetch('/api/send-token-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          tokenNumber,
          patientName,
          doctorName: assignedDoctor.name,
          roomInfo:   langCode === 'hi' ? assignedDoctor.roomHi : assignedDoctor.room,
          waitTime:   assignedDoctor.waitTime,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch SMS');
      }

      setSmsSent(true);
      setSmsSentPhone(phone);
      toast({
        title: langCode === 'hi' ? '✅ एसएमएस भेजा गया!' : '✅ SMS Sent Successfully!',
        description: langCode === 'hi'
          ? `टोकन ${tokenNumber} का विवरण +91 ${phone} पर भेज दिया गया है।`
          : `Token ${tokenNumber} details dispatched to +91 ${phone}.`,
      });
    } catch (err: any) {
      console.error('[SMS] Exotel dispatch error:', err);
      toast({
        title: langCode === 'hi' ? 'एसएमएस विफल' : 'SMS Failed',
        description: err?.message || (langCode === 'hi' ? 'एसएमएस भेजने में समस्या आई। पुनः प्रयास करें।' : 'Could not send SMS. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Clear patient intake session data
    localStorage.removeItem('careportal_patient_id');
    localStorage.removeItem('careportal_session_id');
    localStorage.removeItem('careportal_history_id');
    localStorage.removeItem('careportal_chief_complaint');
    localStorage.removeItem('careportal_symptoms_text');
    localStorage.removeItem('careportal_pain_locations');
    localStorage.removeItem('careportal_history_answers');
    localStorage.removeItem('careportal_generated_token');
    localStorage.removeItem('careportal_assigned_doctor');
    localStorage.setItem('careportal_language', 'en');
    router.push('/');
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = langCode === 'hi'
      ? `धन्यवाद! आपका टोकन नंबर ${tokenNumber} है। आपको ${assignedDoctor.name} के लिए आवंटित किया गया है। अनुमानित प्रतीक्षा समय ${assignedDoctor.waitTime} है।`
      : `Thank you! Your intake is complete. Your token number is ${tokenNumber}. You have been assigned to ${assignedDoctor.name}, ${assignedDoctor.specialty}. Estimated wait time is ${assignedDoctor.waitTime}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleFontSize = () => {
    setFontLevel((prev) => (prev + 1) % 3);
  };

  const t = {
    en: {
      help: 'HELP',
      step: 'STEP 7 OF 7: REGISTRATION COMPLETE',
      thankYou: 'Thank You! Registration Complete',
      thankYouSub: 'Your clinical intake summary has been transmitted to the physician dashboard.',
      tokenTitle: 'YOUR OPD TOKEN NUMBER',
      waitTimeTitle: 'ESTIMATED WAIT TIME',
      queueBadge: 'Patients Ahead',
      doctorTitle: 'ASSIGNED PHYSICIAN & SPECIALTY',
      doctorNotice: 'Assigned automatically based on your chief complaint & triage assessment.',
      roomBadge: 'Consultation Room',
      printSlip: 'Print Token Slip',
      printing: 'Printing...',
      sendSms: 'Send SMS to Mobile',
      smsSending: 'Sending SMS...',
      smsSent: smsSentPhone ? `✓ SMS Sent to +91 ${smsSentPhone}` : '✓ SMS Dispatched',
      finish: 'Finish & Exit Kiosk',
      autoExitNotice: `Returning to welcome screen in ${countdown}s`,
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      caseSummary: 'Clinical Triage Summary',
    },
    hi: {
      help: 'सहायता',
      step: 'चरण ७ / ७: पंजीकरण पूर्ण (REGISTRATION COMPLETE)',
      thankYou: 'धन्यवाद! आपका पंजीकरण पूर्ण हुआ',
      thankYouSub: 'आपकी स्वास्थ्य जानकारी डॉक्टर के डैशबोर्ड पर सफलतापूर्वक भेज दी गई है।',
      tokenTitle: 'आपकी ओपीडी टोकन संख्या',
      waitTimeTitle: 'अनुमानित प्रतीक्षा समय',
      queueBadge: 'कतार में आगे मरीज',
      doctorTitle: 'आवंटित डॉक्टर एवं विशेषज्ञता',
      doctorNotice: 'आपके लक्षणों एवं प्राथमिक जांच के आधार पर स्वचालित रूप से आवंटित किया गया।',
      roomBadge: 'परामर्श कक्ष',
      printSlip: 'पर्ची प्रिंट करें',
      printing: 'प्रिंट हो रहा है...',
      sendSms: 'मोबाइल पर एसएमएस भेजें',
      smsSending: 'एसएमएस भेजा जा रहा है...',
      smsSent: smsSentPhone ? `✓ +91 ${smsSentPhone} पर भेजा गया` : '✓ एसएमएस भेजा गया',
      finish: 'सत्र समाप्त करें',
      autoExitNotice: `${countdown} सेकंड में मुख्य स्क्रीन पर वापस जा रहे हैं`,
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      caseSummary: 'चिकित्सीय जांच सारांश',
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Decorative Ambient Background Glow Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00685f]/15 rounded-full blur-[100px] -z-10 -mr-32 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#2170e4]/15 rounded-full blur-[90px] -z-10 -ml-28 -mb-28 pointer-events-none" />

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
      <main className="flex-1 pt-24 pb-28 w-full max-w-4xl mx-auto px-6 md:px-8 flex flex-col justify-center">
        
        {/* Animated Big Green Check Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="self-center mb-3"
        >
          <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-[#00685f]/30 flex items-center justify-center text-[#00685f] shadow-md">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
        </motion.div>

        {/* Heading */}
        <div className="text-center mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`font-extrabold tracking-tight mb-2 ${
              isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
            } ${fontLevel === 1 ? 'text-3xl sm:text-4xl' : fontLevel === 2 ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl md:text-[34px]'}`}
          >
            {t.thankYou}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`max-w-xl mx-auto font-medium text-xs sm:text-sm md:text-base leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
            }`}
          >
            {t.thankYouSub}
          </motion.p>
        </div>

        {/* 2-Card Prominent Hero Display (Token + Waiting Time & Assigned Doctor) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full mb-6">
          
          {/* Card 1: Large Token Number Hero Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`md:col-span-5 rounded-3xl p-6 shadow-xl border flex flex-col items-center justify-between text-center relative overflow-hidden ${
              isHighContrast
                ? 'bg-zinc-950 border-yellow-400 text-white'
                : 'bg-gradient-to-b from-teal-900 to-[#005049] text-white border-teal-700 shadow-[#00685f]/25'
            }`}
          >
            {/* Top decorative badge */}
            <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-teal-200/80 mb-2">
              <span>CarePortal OPD Slip</span>
              <span className="flex items-center gap-1 text-teal-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Active
              </span>
            </div>

            {/* Token Big Number */}
            <div className="my-3">
              <span className="text-xs tracking-wider uppercase opacity-80 block font-semibold mb-1">
                {t.tokenTitle}
              </span>
              <span className="font-mono font-black text-5xl sm:text-6xl tracking-tight text-yellow-300 drop-shadow-md">
                {tokenNumber}
              </span>
            </div>

            {/* Estimated Wait Time Box */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 flex items-center justify-around mt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-300" />
                <div className="text-left">
                  <span className="text-[10px] text-teal-200 block uppercase font-bold">{t.waitTimeTitle}</span>
                  <span className="text-sm sm:text-base font-bold text-white">{assignedDoctor.waitTime}</span>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-white/20" />

              <div className="text-right">
                <span className="text-[10px] text-teal-200 block uppercase font-bold">{t.queueBadge}</span>
                <span className="text-sm sm:text-base font-bold text-white">#{assignedDoctor.queuePosition} in Line</span>
              </div>
            </div>

          </motion.div>

          {/* Card 2: Assigned Doctor & Specialty Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className={`md:col-span-7 rounded-3xl p-6 shadow-sm border flex flex-col justify-between ${
              isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div>
              {/* Doctor Header Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00685f] flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  <span>{t.doctorTitle}</span>
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  AI Triage Matched
                </span>
              </div>

              {/* Doctor Name & Qualifications */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#00685f] flex items-center justify-center font-bold text-xl shrink-0 border border-teal-200">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className={`font-extrabold text-xl sm:text-2xl ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                    {assignedDoctor.name}
                  </h3>
                  <p className="text-xs text-[#64748b] font-mono">{assignedDoctor.degree}</p>
                  <p className="text-sm font-bold text-[#00685f] mt-0.5">
                    {langCode === 'hi' ? assignedDoctor.specialtyHi : assignedDoctor.specialty}
                  </p>
                </div>
              </div>

              {/* Consultation Room Banner */}
              <div className="p-3.5 rounded-2xl bg-[#f0f3ff] border border-slate-200/80 flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white text-[#0058be] flex items-center justify-center shadow-xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748b] block">{t.roomBadge}</span>
                  <span className="text-sm sm:text-base font-bold text-[#151c27]">
                    {langCode === 'hi' ? assignedDoctor.roomHi : assignedDoctor.room}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons (Print & SMS) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handlePrintSlip}
                disabled={isPrinting}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151c27] font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#00685f]" />
                <span>{isPrinting ? t.printing : t.printSlip}</span>
              </button>

              <button
                onClick={handleSendSms}
                disabled={smsSent || isSendingSms}
                className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 border ${
                  smsSent
                    ? 'bg-green-50 text-green-800 border-green-300 cursor-default'
                    : isSendingSms
                    ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-wait'
                    : 'bg-white border-[#cbd5e1] text-[#151c27] hover:bg-slate-50 shadow-xs cursor-pointer'
                }`}
              >
                {isSendingSms ? (
                  <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Smartphone className="w-4 h-4 text-[#0058be]" />
                )}
                <span>{smsSent ? t.smsSent : isSendingSms ? t.smsSending : t.sendSms}</span>
              </button>
            </div>

          </motion.div>

        </div>

        {/* Action / Finish Card Bar */}
        <div className={`w-full rounded-2xl p-5 shadow-sm border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
        }`}>
          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <ShieldCheck className="w-5 h-5 text-[#00685f] shrink-0" />
            <span>{t.autoExitNotice}</span>
          </div>

          <button
            onClick={handleFinish}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-[#00685f]/30"
          >
            <span>{t.finish}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
            onClick={handleFinish}
            className="px-8 py-3.5 bg-[#0058be] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm md:text-base tracking-wide shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.exit}</span>
          </button>
        </div>
      </footer>

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
                    {langCode === 'hi' ? 'ओपीडी टोकन सहायता' : 'Token & OPD Guidance'}
                  </h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 text-slate-600 text-sm leading-relaxed space-y-3">
                <p>
                  {langCode === 'hi'
                    ? 'कृपया अपनी टोकन पर्ची लें और निर्दिष्ट ओपीडी परामर्श कक्ष के बाहर प्रतीक्षालय में बैठें।'
                    : 'Please collect your printed token slip and proceed to the waiting lounge outside your assigned OPD consultation room.'}
                </p>
                <p>
                  {langCode === 'hi'
                    ? 'जब आपकी टोकन संख्या स्क्रीन पर प्रदर्शित होगी, तब आप डॉक्टर के कक्ष में प्रवेश कर सकते हैं।'
                    : 'When your token number flashes on the central OPD display, please proceed inside the doctor’s chamber.'}
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

    </div>
  );
}
