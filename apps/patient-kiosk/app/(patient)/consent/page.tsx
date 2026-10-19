'use client';

import { useState, useEffect, useRef } from 'react';
import { speak, speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  FileText, 
  ScanLine, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Type, 
  Contrast, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Plus, 
  X, 
  LogOut,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ConsentPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Detailed Permissions Toggles
  const [permissions, setPermissions] = useState({
    dataProcessing: true,
    researchAnonymization: false,
  });

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
    };
  }, []);

  // Auto voice guidance when page mounts (if Voice Guide Mode is enabled)
  useEffect(() => {
    if (!mounted || !isVoiceGuideEnabled()) return;
    const script = VOICE_SCRIPTS.consent[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (matchesCommand(transcript, CMD.wake)) {
          speak(langCode === 'hi' ? 'नमस्ते! आगे बढ़ने के लिए "सहमत" बोलें, या "असहमत" बोलें।' : 'Hello! Say "agree" to give consent, or "disagree".', langCode);
          return;
        } else if (matchesCommand(transcript, CMD.agree)) {
          handleAgreeAndProceed();
        } else if (matchesCommand(transcript, CMD.disagree)) {
          handleDoNotAgree();
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle')
    );
    stopVoiceRef.current = stop;
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, langCode]);

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  const togglePermission = (key: 'dataProcessing' | 'researchAnonymization') => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAgreeAndProceed = async () => {
    stopVoiceRef.current?.();
    setLoading(true);
    try {
      const patientId = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_id') : null;
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('careportal_session_id') : null;

      if (sessionId) {
        // Save consent tracking in Supabase
        await supabase.from('consent_tracking').insert({
          patient_id: patientId,
          session_id: sessionId,
          consent_type: 'comprehensive',
          granted: true,
          consent_text: JSON.stringify(permissions),
        });

        // Update session progress
        await supabase
          .from('patient_sessions')
          .update({
            consent_given: true,
            current_step: 'symptoms',
            progress: 30,
          })
          .eq('id', sessionId);
      }

      toast({
        title: langCode === 'hi' ? 'सहमति दर्ज की गई' : 'Consent Recorded',
        description: langCode === 'hi' ? 'लक्षण प्रश्नावली पर आगे बढ़ रहे हैं...' : 'Proceeding to symptoms intake...',
      });

      router.push('/symptoms');
    } catch (error) {
      console.warn('Consent save fallback:', error);
      router.push('/symptoms');
    } finally {
      setLoading(false);
    }
  };

  const handleDoNotAgree = () => {
    stopVoiceRef.current?.();
    const msg = langCode === 'hi'
      ? 'सहमति के बिना हम डिजिटल मेडिकल इतिहास दर्ज नहीं कर सकते। क्या आप शुरुआत पर वापस जाना चाहते हैं?'
      : 'Without consent, clinical history cannot be recorded digitally. Would you like to return to start?';
    if (confirm(msg)) {
      router.push('/');
    }
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported on this device.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = langCode === 'hi'
      ? 'गोपनीयता और सहमति। हम आपकी जानकारी आपके डॉक्टर को बेहतर देखभाल प्रदान करने में मदद करने के लिए एकत्र करते हैं। आपका डेटा सुरक्षित रूप से संग्रहीत किया जाता है और मार्केटिंग के लिए कभी साझा नहीं किया जाता है।'
      : 'Privacy and Consent. We collect your information to help your doctor provide better care. Your data is stored securely and never shared for marketing.';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

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
    router.push('/');
  };

  const t = {
    en: {
      help: 'HELP',
      readAloud: 'READ ALOUD',
      pauseReading: 'PAUSE READING',
      title: 'Privacy & Consent',
      subtitle: 'We collect your information to help your doctor provide better care. Your data is stored securely and never shared for marketing.',
      card1Title: 'Clinical History',
      card1Desc: 'We collect your current symptoms and past medical history to provide a complete picture to your care team.',
      card2Title: 'Document Processing',
      card2Desc: 'Any physical prescriptions or records you upload are securely digitized using OCR technology for immediate access.',
      card3Title: 'Secure Sharing',
      card3Desc: 'Your verified information is shared only with your specific treating physician and clinical staff.',
      detailedPermissions: 'DETAILED PERMISSIONS',
      perm1Title: 'Data Processing',
      perm1Desc: 'Allow automated systems to analyze symptoms',
      perm2Title: 'Research Anonymization',
      perm2Desc: 'Allow stripped, anonymous data for medical research',
      disclaimer: 'By clicking "I Agree & Proceed", you confirm that you have read and understood how CarePortal uses your data.',
      btnDisagree: 'I DO NOT AGREE',
      btnAgree: 'I AGREE & PROCEED',
      backToStart: 'BACK TO START',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      guideTitle: 'Privacy & Data Protection Guide',
      guideText: 'CarePortal complies with NABH, HIPAA, and ABDM national data privacy standards. All medical transmissions are encrypted with 256-bit SSL.',
    },
    hi: {
      help: 'सहायता',
      readAloud: 'आवाज़ में सुनें',
      pauseReading: 'आवाज़ रोकें',
      title: 'गोपनीयता और सहमति',
      subtitle: 'हम आपकी जानकारी आपके डॉक्टर को बेहतर देखभाल प्रदान करने में मदद करने के लिए एकत्र करते हैं। आपका डेटा सुरक्षित है।',
      card1Title: 'चिकित्सा इतिहास',
      card1Desc: 'हम आपकी स्वास्थ्य टीम को पूरी जानकारी देने के लिए आपके वर्तमान लक्षण और पिछला इतिहास एकत्र करते हैं।',
      card2Title: 'दस्तावेज़ प्रसंस्करण',
      card2Desc: 'आपके द्वारा अपलोड किए गए पर्चे या रिकॉर्ड ओसीआर तकनीक द्वारा तुरंत डिजिटल रूप से सुरक्षित किए जाते हैं।',
      card3Title: 'सुरक्षित साझाकरण',
      card3Desc: 'आपकी जानकारी केवल आपके संबंधित डॉक्टर और स्वास्थ्य कर्मचारियों के साथ सुरक्षित रूप से साझा की जाती है।',
      detailedPermissions: 'विस्तृत अनुमतियाँ',
      perm1Title: 'डेटा प्रसंस्करण (Data Processing)',
      perm1Desc: 'लक्षणों का विश्लेषण करने के लिए स्वचालित प्रणाली की अनुमति दें',
      perm2Title: 'अनुसंधान अनामीकरण (Research Anonymization)',
      perm2Desc: 'चिकित्सा अनुसंधान के लिए अनाम डेटा की अनुमति दें',
      disclaimer: '"मैं सहमत हूँ और आगे बढ़ें" दबाकर, आप पुष्टि करते हैं कि आपने डेटा उपयोग की शर्तों को समझ लिया है।',
      btnDisagree: 'मैं असहमत हूँ',
      btnAgree: 'मैं सहमत हूँ और आगे बढ़ें',
      backToStart: 'शुरुआत पर लौटें',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      guideTitle: 'गोपनीयता और डेटा सुरक्षा गाइड',
      guideText: 'केयरपोर्टल राष्ट्रीय डिजिटल स्वास्थ्य मिशन (ABDM) के दिशानिर्देशों का पालन करता है। आपका डेटा पूरी तरह एन्क्रिप्टेड है।',
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Decorative Background Blur Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#00685f]/15 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-16 left-0 w-80 h-80 bg-[#0058be]/10 rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Top Fixed Header */}
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

      {/* Main Center Content */}
      <main className="flex-1 pt-24 pb-28 w-full max-w-5xl mx-auto px-6 md:px-8 flex flex-col justify-center">
        
        {/* Header Section with Policy Icon */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 sm:mb-5 shadow-xs border ${
              isHighContrast
                ? 'bg-zinc-900 border-yellow-400 text-yellow-400'
                : 'bg-[#00685f]/10 border-[#00685f]/20 text-[#00685f]'
            }`}
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>

          <motion.h1 
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`font-extrabold tracking-tight mb-2 sm:mb-3 ${
              isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
            } ${fontLevel === 1 ? 'text-4xl md:text-5xl' : fontLevel === 2 ? 'text-5xl md:text-6xl' : 'text-3xl sm:text-4xl md:text-[42px]'}`}
          >
            {t.title}
          </motion.h1>

          <motion.p 
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`max-w-2xl leading-relaxed font-medium text-sm sm:text-base md:text-lg ${
              isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
            }`}
          >
            {t.subtitle}
          </motion.p>

          {/* Accessibility Action: Read Aloud Pill Button */}
          <motion.button 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            onClick={toggleSpeech}
            className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all shadow-xs active:scale-95 ${
              isSpeaking
                ? 'bg-[#00685f] text-white shadow-md'
                : isHighContrast
                ? 'bg-zinc-900 border border-yellow-400 text-yellow-300 hover:bg-zinc-800'
                : 'bg-[#f0f3ff] text-[#00685f] hover:bg-[#00685f]/15 border border-[#bcc9c6]/40'
            }`}
          >
            {isSpeaking ? (
              <VolumeX className="w-4 h-4 animate-pulse" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>{isSpeaking ? t.pauseReading : t.readAloud}</span>
          </motion.button>
        </div>

        {/* 3 Content Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-8 sm:mb-10">
          
          {/* Card 1: Clinical History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            whileHover={{ y: -4 }}
            className={`p-6 sm:p-7 rounded-2xl flex flex-col items-start shadow-sm hover:shadow-md transition-all border ${
              isHighContrast
                ? 'bg-zinc-900 border-yellow-400'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#008378] text-white flex items-center justify-center mb-4 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className={`font-bold text-lg sm:text-xl mb-1.5 ${
              isHighContrast ? 'text-yellow-300' : 'text-[#151c27]'
            }`}>
              {t.card1Title}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
            }`}>
              {t.card1Desc}
            </p>
          </motion.div>

          {/* Card 2: Document Processing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            whileHover={{ y: -4 }}
            className={`p-6 sm:p-7 rounded-2xl flex flex-col items-start shadow-sm hover:shadow-md transition-all border ${
              isHighContrast
                ? 'bg-zinc-900 border-yellow-400'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#2170e4] text-white flex items-center justify-center mb-4 shadow-sm">
              <ScanLine className="w-6 h-6" />
            </div>
            <h3 className={`font-bold text-lg sm:text-xl mb-1.5 ${
              isHighContrast ? 'text-yellow-300' : 'text-[#151c27]'
            }`}>
              {t.card2Title}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
            }`}>
              {t.card2Desc}
            </p>
          </motion.div>

          {/* Card 3: Secure Sharing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileHover={{ y: -4 }}
            className={`p-6 sm:p-7 rounded-2xl flex flex-col items-start shadow-sm hover:shadow-md transition-all border ${
              isHighContrast
                ? 'bg-zinc-900 border-yellow-400'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#a36700] text-white flex items-center justify-center mb-4 shadow-sm">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className={`font-bold text-lg sm:text-xl mb-1.5 ${
              isHighContrast ? 'text-yellow-300' : 'text-[#151c27]'
            }`}>
              {t.card3Title}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#3d4947]'
            }`}>
              {t.card3Desc}
            </p>
          </motion.div>

        </div>

        {/* Detailed Permissions Toggle Box */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className={`w-full max-w-3xl mx-auto rounded-2xl p-5 sm:p-6 mb-8 shadow-sm border ${
            isHighContrast
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-[#f0f3ff] border-[#bcc9c6]/40'
          }`}
        >
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
            isHighContrast ? 'text-yellow-400' : 'text-[#3d4947]'
          }`}>
            {t.detailedPermissions}
          </h4>

          <div className="flex flex-col gap-3.5">
            {/* Toggle 1: Data Processing */}
            <div
              onClick={() => togglePermission('dataProcessing')}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                isHighContrast
                  ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800'
                  : 'bg-white border-[#e2e8f0] hover:bg-[#e7eefe]'
              }`}
            >
              <div className="flex flex-col pr-4">
                <span className={`font-bold text-sm sm:text-base ${
                  isHighContrast ? 'text-white' : 'text-[#151c27]'
                }`}>
                  {t.perm1Title}
                </span>
                <span className={`text-xs sm:text-sm ${
                  isHighContrast ? 'text-zinc-400' : 'text-[#3d4947]'
                }`}>
                  {t.perm1Desc}
                </span>
              </div>

              {/* Pill Switch */}
              <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out shrink-0 p-1 ${
                permissions.dataProcessing
                  ? 'bg-[#00685f]'
                  : isHighContrast
                  ? 'bg-zinc-700'
                  : 'bg-[#dce2f3]'
              }`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                  permissions.dataProcessing ? 'translate-x-6 text-[#00685f]' : 'translate-x-0 text-slate-400'
                }`}>
                  {permissions.dataProcessing && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Toggle 2: Research Anonymization */}
            <div
              onClick={() => togglePermission('researchAnonymization')}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                isHighContrast
                  ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800'
                  : 'bg-white border-[#e2e8f0] hover:bg-[#e7eefe]'
              }`}
            >
              <div className="flex flex-col pr-4">
                <span className={`font-bold text-sm sm:text-base ${
                  isHighContrast ? 'text-white' : 'text-[#151c27]'
                }`}>
                  {t.perm2Title}
                </span>
                <span className={`text-xs sm:text-sm ${
                  isHighContrast ? 'text-zinc-400' : 'text-[#3d4947]'
                }`}>
                  {t.perm2Desc}
                </span>
              </div>

              {/* Pill Switch */}
              <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out shrink-0 p-1 ${
                permissions.researchAnonymization
                  ? 'bg-[#00685f]'
                  : isHighContrast
                  ? 'bg-zinc-700'
                  : 'bg-[#dce2f3]'
              }`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                  permissions.researchAnonymization ? 'translate-x-6 text-[#00685f]' : 'translate-x-0 text-slate-400'
                }`}>
                  {permissions.researchAnonymization && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Action Area */}
        <div className="flex flex-col items-center">
          <p className={`text-xs sm:text-sm mb-5 text-center max-w-lg leading-relaxed ${
            isHighContrast ? 'text-zinc-400' : 'text-[#3d4947]'
          }`}>
            {t.disclaimer}
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-lg">
            {/* I DO NOT AGREE Button */}
            <button
              onClick={handleDoNotAgree}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm md:text-base shadow-sm active:scale-95 transition-all w-full sm:w-auto border ${
                isHighContrast
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-white text-[#151c27] border-[#cbd5e1] hover:bg-[#f0f3ff]'
              }`}
            >
              {t.btnDisagree}
            </button>

            {/* I AGREE & PROCEED Button */}
            <button
              onClick={handleAgreeAndProceed}
              disabled={loading}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm md:text-base shadow-xl active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center gap-2 group ${
                isHighContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/20'
                  : 'bg-[#00685f] hover:bg-[#005049] text-white shadow-[#00685f]/25'
              }`}
            >
              <span>{loading ? '...' : t.btnAgree}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Back to Start Link */}
          <button
            onClick={() => router.push('/identity')}
            className={`mt-6 text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:underline underline-offset-4 transition-colors ${
              isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToStart}</span>
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
            onClick={handleExitKiosk}
            className="px-8 py-3.5 bg-[#0058be] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm md:text-base tracking-wide shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.exit}</span>
          </button>
        </div>
      </footer>

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
                <h3 className="text-xl font-bold text-slate-800">{t.guideTitle}</h3>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="py-4 text-slate-600 text-sm md:text-base leading-relaxed">
                <p>{t.guideText}</p>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2.5 bg-[#00685f] hover:bg-[#005049] text-white font-bold rounded-xl text-sm"
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
