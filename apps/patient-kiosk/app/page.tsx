'use client';

import { useState, useEffect, useRef } from 'react';
import { speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, isVoiceGuideEnabled, setVoiceGuideEnabled } from '@/lib/voiceGuide';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Type, 
  Contrast, 
  User, 
  UserPlus,
  Mic,
  Languages,
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Plus, 
  ChevronDown,
  X,
  LogOut,
  Sparkles,
  Radio
} from 'lucide-react';
import { getTranslation } from '@/lib/translations';

// 18 Indian Languages
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'كٲشُر' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी' },
];

export default function WelcomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const [voiceGuideActive, setVoiceGuideActive] = useState(false);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);
    setVoiceGuideActive(isVoiceGuideEnabled());

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-selector-container')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
    };
  }, []);

  // Activate and toggle Voice Guide Mode
  const handleToggleVoiceGuide = () => {
    if (voiceMode !== 'idle') {
      stopVoiceRef.current?.();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setVoiceMode('idle');
      return;
    }

    // Mark global Voice Guide Mode as ENABLED
    setVoiceGuideEnabled(true);
    setVoiceGuideActive(true);

    const script = VOICE_SCRIPTS.welcome[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (matchesCommand(transcript, CMD.start) || matchesCommand(transcript, CMD.wake)) {
          handleStartWithVoiceGuide();
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle'),
      false,
      7000 // 7-second silence auto-stop
    );
    stopVoiceRef.current = stop;
  };

  const t = getTranslation(langCode);

  const switchLanguage = (code: string) => {
    setLangCode(code);
    try {
      localStorage.setItem('careportal_language', code);
    } catch (e) {
      console.error(e);
    }
    setIsDropdownOpen(false);
  };

  // Standard Touch Kiosk visit (Voice Guide Disabled on all subsequent pages)
  const handleStart = () => {
    stopVoiceRef.current?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceGuideEnabled(false);
    setVoiceGuideActive(false);
    localStorage.setItem('careportal_language', langCode);
    router.push('/identity');
  };

  // Start with Voice Guide Enabled across every page
  const handleStartWithVoiceGuide = () => {
    stopVoiceRef.current?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceGuideEnabled(true);
    setVoiceGuideActive(true);
    localStorage.setItem('careportal_language', langCode);
    router.push('/identity');
  };

  const handleExitKiosk = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    localStorage.removeItem('careportal_patient_id');
    localStorage.removeItem('careportal_session_id');
    localStorage.removeItem('careportal_history_id');
    localStorage.setItem('careportal_language', 'en');
    setLangCode('en');
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported on this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = t.welcome.speechText || `${t.welcome.title}. ${t.welcome.subtitle}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const cycleFontSize = () => {
    setFontSizeLevel((prev) => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  const fontSizeClasses = {
    normal: {
      title: 'text-3xl sm:text-4xl md:text-5xl lg:text-[48px]',
      subtitle: 'text-base sm:text-lg md:text-xl lg:text-[22px]',
      startBtn: 'text-xl sm:text-2xl md:text-[24px]',
      badge: 'text-xs sm:text-sm md:text-base',
    },
    large: {
      title: 'text-4xl sm:text-5xl md:text-6xl lg:text-[56px]',
      subtitle: 'text-lg sm:text-xl md:text-2xl lg:text-[26px]',
      startBtn: 'text-2xl sm:text-3xl md:text-[28px]',
      badge: 'text-sm sm:text-base md:text-lg',
    },
    xlarge: {
      title: 'text-5xl sm:text-6xl md:text-7xl lg:text-[64px]',
      subtitle: 'text-xl sm:text-2xl md:text-3xl lg:text-[30px]',
      startBtn: 'text-3xl sm:text-4xl md:text-[34px]',
      badge: 'text-base sm:text-lg md:text-xl',
    },
  }[fontSizeLevel];

  if (!mounted) return null;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
        isHighContrast
          ? 'bg-black text-white'
          : 'bg-[#f9f9ff] text-[#151c27]'
      }`}
    >
      {/* Inline styles for keyframe animations */}
      <style jsx global>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.12); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 35px) scale(1.1); }
        }
        .animate-orb-1 { animation: floatOrb1 14s ease-in-out infinite; }
        .animate-orb-2 { animation: floatOrb2 16s ease-in-out infinite; }

        @keyframes pulseRing {
          0% { transform: scale(0.88); opacity: 0.7; }
          50% { transform: scale(1.12); opacity: 0.25; }
          100% { transform: scale(0.88); opacity: 0.7; }
        }
        @keyframes pulseRingOuter {
          0% { transform: scale(0.92); opacity: 0.4; }
          50% { transform: scale(1.22); opacity: 0.1; }
          100% { transform: scale(0.92); opacity: 0.4; }
        }
        .pulse-ring-slow { animation: pulseRing 3.6s ease-in-out infinite; }
        .pulse-ring-outer { animation: pulseRingOuter 4.8s ease-in-out infinite; }

        @keyframes ecgDash {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .ecg-path-anim {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: ecgDash 3.5s ease-in-out infinite;
        }

        .start-btn-custom {
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 45px -10px rgba(0, 104, 95, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.4);
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .start-btn-custom:hover {
          transform: scale(1.08) translateY(-3px);
          box-shadow: 0 30px 60px -10px rgba(0, 104, 95, 0.6), 0 0 35px rgba(0, 131, 120, 0.4);
        }
        .start-btn-custom:active {
          transform: scale(0.96);
        }
        .start-btn-custom::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 200%;
          height: 200%;
          background: linear-gradient(60deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: rotate(25deg);
          transition: left 0.8s ease-in-out;
        }
        .start-btn-custom:hover::after {
          left: 150%;
        }

        @keyframes soundwave {
          0%, 100% { height: 6px; }
          50% { height: 18px; }
        }
        .wave-bar:nth-child(1) { animation: soundwave 0.8s ease-in-out infinite; }
        .wave-bar:nth-child(2) { animation: soundwave 0.8s ease-in-out 0.2s infinite; }
        .wave-bar:nth-child(3) { animation: soundwave 0.8s ease-in-out 0.4s infinite; }
      `}</style>

      {/* Ambient Floating Glow Elements */}
      <div className="fixed top-12 left-1/4 w-[500px] h-[500px] bg-[#00685f]/10 rounded-full blur-[100px] -z-20 pointer-events-none animate-orb-1" />
      <div className="fixed top-1/3 right-1/4 w-[420px] h-[420px] bg-[#0058be]/10 rounded-full blur-[90px] -z-20 pointer-events-none animate-orb-2" />

      {/* Top Header Bar */}
      <header
        className={`w-full h-20 px-6 md:px-12 flex items-center justify-between relative z-30 transition-colors ${
          isHighContrast
            ? 'bg-zinc-900 border-b border-zinc-700'
            : 'bg-white/90 backdrop-blur-md border-b border-[#e2e8f0] shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Left: Help Button */}
        <div className="flex items-center">
          <button
            onClick={() => setShowHelpModal(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-xs md:text-sm shadow-xs transition-all active:scale-95 ${
              isHighContrast
                ? 'bg-zinc-800 text-yellow-300 border border-yellow-400 hover:bg-yellow-400 hover:text-black'
                : 'bg-[#f0f3ff] text-[#3d4947] hover:bg-[#008378] hover:text-white border border-[#bcc9c6]/40'
            }`}
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.welcome.helpButton || 'HELP'}</span>
          </button>
        </div>

        {/* Center: Brand Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 cursor-pointer">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-yellow-500'
                : 'bg-teal-50 text-[#00685f] border-[#00685f]/20'
            }`}
          >
            <Plus className="w-6 h-6 stroke-[2.75]" />
          </div>
          <span
            className={`font-bold tracking-tight text-xl md:text-2xl uppercase ${
              isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'
            }`}
          >
            CarePortal
          </span>
        </div>

        {/* Right: Language Switcher Pill & Avatar */}
        <div className="flex items-center gap-4 relative language-selector-container">
          <div
            className={`flex items-center p-1 rounded-full border shadow-inner ${
              isHighContrast
                ? 'bg-zinc-800 border-zinc-600'
                : 'bg-[#e2e8f0] border-[#cbd5e1]'
            }`}
          >
            <button
              onClick={() => switchLanguage('en')}
              className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all ${
                langCode === 'en'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-[#00685f] text-white shadow-md'
                  : isHighContrast
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => switchLanguage('hi')}
              className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all ${
                langCode === 'hi'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-[#00685f] text-white shadow-md'
                  : isHighContrast
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              HI
            </button>

            {/* Dropdown for other 16 Indian languages */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title="More languages"
              className={`p-1 ml-0.5 rounded-full transition-colors ${
                isHighContrast
                  ? 'text-zinc-400 hover:text-yellow-300'
                  : 'text-[#64748b] hover:text-[#00685f]'
              }`}
            >
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* More Languages Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-12 top-full mt-2 w-56 sm:w-64 max-h-72 overflow-y-auto rounded-2xl shadow-2xl border z-50 p-2 ${
                  isHighContrast
                    ? 'bg-zinc-900 border-yellow-400 text-white'
                    : 'bg-white border-[#cbd5e1] text-[#151c27]'
                }`}
              >
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0] mb-1">
                  Select Language (18)
                </div>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => switchLanguage(lang.code)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
                      langCode === lang.code
                        ? isHighContrast
                          ? 'bg-yellow-400 text-black font-bold'
                          : 'bg-[#00685f] text-white font-bold'
                        : isHighContrast
                        ? 'hover:bg-zinc-800 text-zinc-200'
                        : 'hover:bg-[#f1f5f9] text-[#1e293b]'
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    <span className="text-[11px] opacity-70">({lang.name})</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Avatar Icon */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
              isHighContrast
                ? 'bg-yellow-400 text-black'
                : 'bg-[#00685f] text-white'
            }`}
          >
            <User className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 flex flex-col justify-center py-6 lg:py-8 relative z-10">
        
        {/* Ambient Medical Cross Background Accents */}
        <div className="absolute top-12 left-10 text-teal-600/10 text-4xl font-light pointer-events-none select-none">+</div>
        <div className="absolute bottom-28 right-12 text-teal-600/10 text-5xl font-light pointer-events-none select-none">+</div>
        <div className="absolute top-1/2 right-1/4 text-teal-600/10 text-3xl font-light pointer-events-none select-none">+</div>

        {/* 2-Column Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-8">
          
          {/* Left Column: Hero Copy & CTA */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
            {/* Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#e8f7f3] border border-[#a2ded6]/60 text-[#00685f] font-bold text-xs sm:text-sm tracking-wider uppercase mb-4"
            >
              &ldquo;{langCode === 'hi' ? 'आपकी स्वास्थ्य कहानी, व्यवस्थित रूप में।' : 'YOUR HEALTH STORY, STRUCTURED.'}&rdquo;
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`font-black tracking-tight leading-[1.1] ${fontSizeClasses.title} ${
                isHighContrast ? 'text-white' : 'text-[#151c27]'
              }`}
            >
              <span>{langCode === 'hi' ? 'स्वागत है' : 'Welcome to'}</span>
              <span className={`block font-extrabold mt-1 ${isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'}`}>
                CarePortal
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`font-medium mt-3 text-base sm:text-lg lg:text-xl max-w-md ${
                isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
              }`}
            >
              {langCode === 'hi'
                ? 'आइए हम आपको आपके परामर्श के लिए तैयार करें।'
                : "Let's get you ready for your consultation."}
            </motion.p>

            {/* Info Box: 5-10 Minutes */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={`w-full max-w-md rounded-2xl p-4 sm:p-5 my-6 flex items-center gap-4 border shadow-xs transition-colors ${
                isHighContrast
                  ? 'bg-zinc-900 border-yellow-400/40 text-white'
                  : 'bg-[#eefaf6] border-[#b2e8de]/70 text-[#151c27]'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                isHighContrast ? 'bg-yellow-400 text-black' : 'bg-[#00685f] text-white'
              }`}>
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold">
                  {langCode === 'hi' ? 'इसमें लगभग ५–१० मिनट लगते हैं।' : 'It takes about 5–10 minutes.'}
                </h4>
                <p className={`text-xs sm:text-sm mt-0.5 ${isHighContrast ? 'text-zinc-300' : 'text-[#475569]'}`}>
                  {langCode === 'hi' ? 'आप अपनी पसंदीदा भाषा में बोल या लिख सकते हैं।' : 'You can speak or type in your preferred language.'}
                </p>
              </div>
            </motion.div>

            {/* Primary Action & Voice Guide Mode Section */}
            <div className="w-full max-w-md flex flex-col gap-4">
              
              {/* Primary Action Button: Start your visit (Touch Mode - Voice Disabled) */}
              <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                  isHighContrast
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20'
                    : 'bg-[#00685f] hover:bg-[#005049] text-white shadow-[#00685f]/30'
                }`}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="leading-tight text-lg sm:text-xl">
                    {langCode === 'hi' ? 'शुरू करें' : 'Start your visit'}
                  </span>
                  <span className={`text-[11px] font-semibold opacity-85 ${isHighContrast ? 'text-zinc-900' : 'text-teal-100'}`}>
                    {langCode === 'hi' ? 'टच कियोस्क • सामान्य सहायता' : 'Touch Kiosk • Standard Self-Service'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-5 h-5 stroke-[2.75]" />
                </div>
              </motion.button>

              {/* Attractive Voice Guide Mode Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`w-full rounded-2xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden ${
                  voiceGuideActive || voiceMode !== 'idle'
                    ? isHighContrast
                      ? 'bg-zinc-900 border-yellow-400 ring-2 ring-yellow-400/40'
                      : 'bg-gradient-to-br from-[#e6f7f4] via-teal-50 to-[#ebf4ff] border-teal-500 shadow-md ring-2 ring-teal-500/20'
                    : isHighContrast
                    ? 'bg-zinc-900/90 border-zinc-700 hover:border-yellow-400/60'
                    : 'bg-white hover:bg-[#fafffe] border-[#cbd5e1] hover:border-teal-400 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Subtle luminous background aura when active */}
                {(voiceGuideActive || voiceMode !== 'idle') && (
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
                )}

                {/* Top Card Row: Badge, Icon, Title */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    {/* Glowing Mic Icon with Equalizer Wave */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm relative ${
                      voiceMode === 'speaking'
                        ? 'bg-[#00685f] text-white animate-pulse'
                        : voiceMode === 'listening'
                        ? 'bg-red-600 text-white animate-pulse'
                        : voiceGuideActive
                        ? 'bg-teal-600 text-white'
                        : isHighContrast
                        ? 'bg-zinc-800 text-yellow-300'
                        : 'bg-[#eefaf6] text-[#00685f]'
                    }`}>
                      <Mic className={`w-5 h-5 ${voiceMode !== 'idle' ? 'animate-bounce' : ''}`} />
                      {(voiceMode !== 'idle' || voiceGuideActive) && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm sm:text-base font-bold ${
                          isHighContrast ? 'text-white' : 'text-[#151c27]'
                        }`}>
                          {langCode === 'hi' ? 'वॉयस गाइड मोड' : 'Voice Guide Mode'}
                        </h4>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                          voiceGuideActive
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {langCode === 'hi' ? 'हैंड्स-फ्री' : 'Hands-Free'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
                      }`}>
                        {langCode === 'hi'
                          ? 'हर पेज पर बोलकर समझाएगा और आपकी बात सुनेगा।'
                          : 'Speaks & listens across every page from start to complete.'}
                      </p>
                    </div>
                  </div>

                  {/* Equalizer Sound Waves when Speaking/Listening */}
                  {voiceMode !== 'idle' && (
                    <div className="flex items-center gap-1 h-6 shrink-0 pr-1">
                      <span className="wave-bar w-1 bg-teal-600 rounded-full" />
                      <span className="wave-bar w-1 bg-teal-600 rounded-full" />
                      <span className="wave-bar w-1 bg-teal-600 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Card Action Row: Interactive Activation & Direct Start */}
                <div className="mt-3.5 pt-3 border-t border-teal-100/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  
                  {/* Status / Activation Toggle Button */}
                  <button
                    onClick={handleToggleVoiceGuide}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      voiceMode === 'speaking'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : voiceMode === 'listening'
                        ? 'bg-red-600 text-white animate-pulse shadow-xs'
                        : voiceGuideActive
                        ? isHighContrast
                          ? 'bg-yellow-400 text-black'
                          : 'bg-teal-100 text-teal-900 border border-teal-300'
                        : isHighContrast
                        ? 'bg-zinc-800 text-yellow-300 hover:bg-zinc-700'
                        : 'bg-teal-50 hover:bg-teal-100 text-[#00685f] border border-teal-200'
                    }`}
                  >
                    <Radio className={`w-3.5 h-3.5 ${voiceMode !== 'idle' ? 'animate-spin' : ''}`} />
                    <span>
                      {voiceMode === 'speaking'
                        ? (langCode === 'hi' ? 'बोल रहा हूँ... (रुकें)' : 'Speaking... (Tap to pause)')
                        : voiceMode === 'listening'
                        ? (langCode === 'hi' ? 'सुन रहा हूँ... (रुकें)' : 'Listening... (Tap to stop)')
                        : voiceGuideActive
                        ? (langCode === 'hi' ? '✓ मोड चालू है' : '✓ Voice Mode Enabled')
                        : (langCode === 'hi' ? 'मोड सक्रिय करें 🎙️' : 'Activate Voice Guide 🎙️')}
                    </span>
                  </button>

                  {/* Immediate Start in Voice Mode */}
                  <button
                    onClick={handleStartWithVoiceGuide}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      voiceGuideActive || voiceMode !== 'idle'
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30'
                        : isHighContrast
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'bg-[#151c27] hover:bg-black text-white'
                    }`}
                  >
                    <span>{langCode === 'hi' ? 'वॉयस मोड से शुरू करें' : 'Start with Voice Mode'}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Right Column: Hero Doctors Team Photography */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 relative flex items-center justify-center"
          >
            {/* Ambient Background Soft Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00685f]/10 to-teal-100/30 rounded-3xl blur-2xl -z-10" />
            
            <div className="relative w-full overflow-hidden rounded-3xl shadow-lg border border-teal-100/60 bg-gradient-to-b from-[#f0fbf8] to-[#e4f6f1]">
              <img
                src="/images/doctors-hero.jpg"
                alt="CarePortal Medical Team"
                className="w-full h-auto object-cover object-center max-h-[440px] drop-shadow-md"
              />
            </div>
          </motion.div>
        </div>

        {/* Bottom Feature Cards Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`w-full rounded-2xl p-4 sm:p-5 border shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${
            isHighContrast
              ? 'bg-zinc-900 border-zinc-700 divide-zinc-800'
              : 'bg-white border-[#e2e8f0]'
          }`}
        >
          {/* Card 1: Private & Secure */}
          <div className="flex items-center gap-3.5 p-2">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-[#eefaf6] text-[#00685f]'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-[#151c27] dark:text-white">
                {langCode === 'hi' ? 'गोपनीय व सुरक्षित' : 'Private & Secure'}
              </h5>
              <p className="text-xs text-[#64748b] mt-0.5 leading-tight">
                {langCode === 'hi' ? 'आपकी जानकारी सुरक्षित और निजी है।' : 'Your information is safe and confidential.'}
              </p>
            </div>
          </div>

          {/* Card 2: 5-10 minutes */}
          <div className="flex items-center gap-3.5 p-2">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-[#eefaf6] text-[#00685f]'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-[#151c27] dark:text-white">
                {langCode === 'hi' ? '५–१० मिनट' : '5–10 minutes'}
              </h5>
              <p className="text-xs text-[#64748b] mt-0.5 leading-tight">
                {langCode === 'hi' ? 'आपका समय बचाने हेतु त्वरित प्रक्रिया।' : 'Quick & simple process to save your time.'}
              </p>
            </div>
          </div>

          {/* Card 3: Voice assistance */}
          <div className="flex items-center gap-3.5 p-2">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-[#eefaf6] text-[#00685f]'
            }`}>
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-[#151c27] dark:text-white">
                {langCode === 'hi' ? 'आवाज सहायता' : 'Voice assistance'}
              </h5>
              <p className="text-xs text-[#64748b] mt-0.5 leading-tight">
                {langCode === 'hi' ? 'स्वाभाविक रूप से बोलें, हम मदद के लिए यहाँ हैं।' : "Speak naturally, we're here to help."}
              </p>
            </div>
          </div>

          {/* Card 4: Hindi & English */}
          <div className="flex items-center gap-3.5 p-2">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-[#eefaf6] text-[#00685f]'
            }`}>
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-[#151c27] dark:text-white">
                {langCode === 'hi' ? 'हिंदी और अंग्रेजी' : 'Hindi & English'}
              </h5>
              <p className="text-xs text-[#64748b] mt-0.5 leading-tight">
                {langCode === 'hi' ? 'कई भाषाओं में उपलब्ध।' : 'Available in multiple languages.'}
              </p>
            </div>
          </div>
        </motion.div>

      </main>

      {/* Voice Status Indicator */}
      {voiceMode !== 'idle' && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-xs font-bold pointer-events-none select-none transition-all ${
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

      {/* Bottom Footer Bar with Accessibility & Exit Kiosk */}
      <footer
        className={`w-full h-24 px-6 md:px-12 flex items-center justify-between relative z-30 border-t transition-colors ${
          isHighContrast
            ? 'bg-zinc-950 border-zinc-800'
            : 'bg-[#e7eefe]/95 backdrop-blur-md border-[#cbd5e1] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Left: Accessibility Controls */}
        <div className="flex flex-col items-start gap-1">
          <span
            className={`text-[10px] md:text-xs font-bold tracking-widest uppercase ${
              isHighContrast ? 'text-yellow-400' : 'text-[#475569]'
            }`}
          >
            {t.welcome.accessibility || 'ACCESSIBILITY'}
          </span>
          <div className="flex items-center gap-3">
            
            {/* Audio / Read Aloud */}
            <button
              onClick={toggleSpeech}
              title="Read aloud"
              className={`w-13 h-13 p-2.5 rounded-xl flex items-center justify-center shadow-xs border transition-all active:scale-95 ${
                isSpeaking
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-yellow-300'
                    : 'bg-[#00685f] text-white border-[#00685f]'
                  : isHighContrast
                  ? 'bg-zinc-900 text-yellow-400 border-zinc-700 hover:bg-zinc-800'
                  : 'bg-white text-[#00685f] border-[#cbd5e1] hover:bg-[#e6f4f2]'
              }`}
              aria-label="Read page out loud"
            >
              {isSpeaking ? (
                <div className="flex items-center gap-0.5">
                  <span className="wave-bar w-1 bg-current rounded-full" />
                  <span className="wave-bar w-1 bg-current rounded-full" />
                  <span className="wave-bar w-1 bg-current rounded-full" />
                </div>
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>

            {/* Font Size Toggle */}
            <button
              onClick={cycleFontSize}
              title="Change text size"
              className={`w-13 h-13 p-2.5 rounded-xl flex items-center justify-center shadow-xs border transition-all active:scale-95 ${
                fontSizeLevel !== 'normal'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-yellow-300'
                    : 'bg-[#00685f] text-white border-[#00685f]'
                  : isHighContrast
                  ? 'bg-zinc-900 text-yellow-400 border-zinc-700 hover:bg-zinc-800'
                  : 'bg-white text-[#00685f] border-[#cbd5e1] hover:bg-[#e6f4f2]'
              }`}
              aria-label="Adjust font size"
            >
              <Type className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => setIsHighContrast(!isHighContrast)}
              title="Toggle high contrast"
              className={`w-13 h-13 p-2.5 rounded-xl flex items-center justify-center shadow-xs border transition-all active:scale-95 ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-yellow-500'
                  : 'bg-white text-[#00685f] border-[#cbd5e1] hover:bg-[#e6f4f2]'
              }`}
              aria-label="Toggle high contrast"
            >
              <Contrast className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Right: Exit Kiosk Button */}
        <div>
          <button
            onClick={handleExitKiosk}
            className={`px-7 md:px-9 py-3.5 rounded-xl font-bold text-xs md:text-sm uppercase tracking-wider shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 ${
              isHighContrast
                ? 'bg-zinc-900 text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                : 'bg-[#0058be] hover:bg-[#0047a3] text-white'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>{t.welcome.exitKiosk || 'EXIT KIOSK'}</span>
          </button>
        </div>
      </footer>

      {/* Interactive Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${
                isHighContrast
                  ? 'bg-zinc-900 text-white border-yellow-400'
                  : 'bg-white text-[#151c27] border-[#cbd5e1]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-[#00685f]" />
                  <h3 className="text-xl font-bold">
                    {langCode === 'hi' ? 'सहायता गाइड' : 'How to Use CarePortal'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-sm sm:text-base leading-relaxed text-[#475569]">
                <p>
                  {langCode === 'hi'
                    ? '१. अपना पसंदीदा भाषा चुनने के लिए ऊपर दाईं ओर EN या HI दबाएं।'
                    : '1. Choose your preferred language using the EN / HI toggle at the top right.'}
                </p>
                <p>
                  {langCode === 'hi'
                    ? '२. डॉक्टर से मिलने से पहले अपनी स्वास्थ्य जानकारी दर्ज करने के लिए "START" बटन दबाएं।'
                    : '2. Press the large green "START" button to begin patient identification.'}
                </p>
                <p>
                  {langCode === 'hi'
                    ? '३. यदि आपको आवाज़ या बड़े अक्षरों की आवश्यकता है, तो नीचे दिए गए सुलभता बटन का उपयोग करें।'
                    : '3. Use the accessibility buttons at the bottom for voice read-aloud, larger text, or high contrast mode.'}
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold bg-[#00685f] hover:bg-[#005049] text-white text-sm"
                >
                  {langCode === 'hi' ? 'समझ गया' : 'Got it'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
