'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { speak, speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, extractDigits, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import { 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Type, 
  Contrast, 
  User, 
  Plus, 
  X, 
  LogOut, 
  ArrowRight, 
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PlusCircle,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Available body parts with approximate 2D/3D map coordinate percentages
const BODY_REGIONS = [
  { id: 'head', nameEn: 'Head', nameHi: 'सिर', x: 50, y: 12 },
  { id: 'neck', nameEn: 'Neck', nameHi: 'गर्दन', x: 50, y: 19 },
  { id: 'right_shoulder', nameEn: 'Right Shoulder', nameHi: 'दायां कंधा', x: 38, y: 25 },
  { id: 'left_shoulder', nameEn: 'Left Shoulder', nameHi: 'बायां कंधा', x: 62, y: 25 },
  { id: 'chest', nameEn: 'Chest', nameHi: 'छाती', x: 50, y: 28 },
  { id: 'abdomen', nameEn: 'Abdomen', nameHi: 'पेट', x: 50, y: 40 },
  { id: 'lower_back', nameEn: 'Lower Back', nameHi: 'पीठ का निचला हिस्सा', x: 50, y: 46 },
  { id: 'right_arm', nameEn: 'Right Arm', nameHi: 'दायां हाथ', x: 31, y: 38 },
  { id: 'left_arm', nameEn: 'Left Arm', nameHi: 'बायां हाथ', x: 69, y: 38 },
  { id: 'right_knee', nameEn: 'Right Knee', nameHi: 'दायां घुटना', x: 44, y: 72 },
  { id: 'left_knee', nameEn: 'Left Knee', nameHi: 'बायां घुटना', x: 56, y: 72 },
  { id: 'right_ankle', nameEn: 'Right Ankle', nameHi: 'दायां टखना', x: 43, y: 88 },
  { id: 'left_ankle', nameEn: 'Left Ankle', nameHi: 'बायां टखना', x: 57, y: 88 },
];

const PAIN_CHARACTERS = [
  { id: 'sharp', labelEn: 'Sharp', labelHi: 'तीव्र (Sharp)' },
  { id: 'dull', labelEn: 'Dull', labelHi: 'मंद (Dull)' },
  { id: 'throbbing', labelEn: 'Throbbing', labelHi: 'धड़कता हुआ (Throbbing)' },
  { id: 'burning', labelEn: 'Burning', labelHi: 'जलन (Burning)' },
  { id: 'aching', labelEn: 'Aching', labelHi: 'दर्द (Aching)' },
  { id: 'stabbing', labelEn: 'Stabbing', labelHi: 'चुभन (Stabbing)' },
];

export default function PainLocationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Model viewing mode & zoom
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [modelRotation, setModelRotation] = useState<number>(0);

  // Clinical pain attributes
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['right_shoulder']);
  const [painIntensity, setPainIntensity] = useState<number>(7);
  const [onset, setOnset] = useState<'suddenly' | 'gradually'>('gradually');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(['dull', 'aching']);

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

  // Auto voice guidance on mount (if Voice Guide Mode is enabled)
  useEffect(() => {
    if (!mounted || !isVoiceGuideEnabled()) return;
    const script = VOICE_SCRIPTS.painLocation[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        
        // 1. Body Parts
        if (matchesCommand(transcript, CMD.head)) {
          toggleArea('head');
        } else if (transcript.includes('neck') || transcript.includes('गर्दन')) {
          toggleArea('neck');
        } else if (matchesCommand(transcript, CMD.chest)) {
          toggleArea('chest');
        } else if (matchesCommand(transcript, CMD.stomach)) {
          toggleArea('abdomen');
        } else if (matchesCommand(transcript, CMD.back) || matchesCommand(transcript, CMD.backPain)) {
          toggleArea('lower_back');
        } else if (matchesCommand(transcript, CMD.shoulder)) {
          toggleArea('right_shoulder');
        } else if (transcript.includes('arm') || transcript.includes('hand') || transcript.includes('हाथ')) {
          toggleArea('right_arm');
        } else if (matchesCommand(transcript, CMD.knee)) {
          toggleArea('right_knee');
        } else if (transcript.includes('ankle') || transcript.includes('foot') || transcript.includes('टखना') || transcript.includes('पैर')) {
          toggleArea('right_ankle');
        }

        // 2. Pain Intensity (0-10)
        const digits = extractDigits(transcript);
        if (digits && digits.length <= 2) {
          const num = parseInt(digits, 10);
          if (num >= 0 && num <= 10) {
            setPainIntensity(num);
          }
        }

        // 3. Onset
        if (transcript.includes('sudden') || transcript.includes('अचानक')) {
          setOnset('suddenly');
        } else if (transcript.includes('gradual') || transcript.includes('धीरे')) {
          setOnset('gradually');
        }

        // 4. Character
        if (transcript.includes('sharp') || transcript.includes('तीव्र') || transcript.includes('तेज')) {
          toggleCharacter('sharp');
        } else if (transcript.includes('burning') || transcript.includes('जलन')) {
          toggleCharacter('burning');
        } else if (transcript.includes('throbbing') || transcript.includes('धड़क')) {
          toggleCharacter('throbbing');
        } else if (transcript.includes('dull') || transcript.includes('मंद')) {
          toggleCharacter('dull');
        }

        // 5. Navigation & Wake Word
        if (matchesCommand(transcript, CMD.wake)) {
          speak(langCode === 'hi' ? 'हाँ! जहाँ दर्द है उस अंग का नाम बोलें, फिर "आगे" बोलें।' : 'Yes! Say the body part where it hurts, then say "next".', langCode);
          return;
        } else if (matchesCommand(transcript, CMD.skip) || matchesCommand(transcript, CMD.agree) || matchesCommand(transcript, CMD.submit)) {
          handleNext();
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

  const toggleArea = (id: string) => {
    if (selectedAreas.includes(id)) {
      setSelectedAreas(selectedAreas.filter((a) => a !== id));
    } else {
      setSelectedAreas([...selectedAreas, id]);
    }
  };

  const removeArea = (id: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a !== id));
  };

  const toggleCharacter = (charId: string) => {
    if (selectedCharacters.includes(charId)) {
      setSelectedCharacters(selectedCharacters.filter((c) => c !== charId));
    } else {
      setSelectedCharacters([...selectedCharacters, charId]);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomScale((prev) => Math.min(Math.max(prev + delta, 0.8), 1.6));
  };

  const handleResetView = () => {
    setZoomScale(1);
    setModelRotation(0);
  };

  const handleNext = async () => {
    stopVoiceRef.current?.();
    setLoading(true);
    try {
      const historyId = typeof window !== 'undefined' ? localStorage.getItem('careportal_history_id') : null;
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('careportal_session_id') : null;
      const patientId = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_id') : null;

      const painLocationNames = selectedAreas.map((areaId) => {
        const region = BODY_REGIONS.find((r) => r.id === areaId);
        return region?.nameEn || areaId;
      });

      localStorage.setItem('careportal_pain_locations', JSON.stringify(painLocationNames.length > 0 ? painLocationNames : ['General / Discomfort']));
      localStorage.setItem('careportal_pain_intensity', String(painIntensity));
      localStorage.setItem('careportal_pain_onset', onset || 'Gradually');
      localStorage.setItem('careportal_pain_character', selectedCharacters.length > 0 ? selectedCharacters.join(', ') : 'Aching');

      if (sessionId && selectedAreas.length > 0) {
        for (const areaId of selectedAreas) {
          const region = BODY_REGIONS.find((r) => r.id === areaId);
          await supabase.from('pain_locations').insert({
            history_id: historyId,
            session_id: sessionId,
            patient_id: patientId,
            body_part: region?.nameEn || areaId,
            intensity: painIntensity,
            onset: onset,
            character: selectedCharacters.join(', '),
            x_position: region?.x || 50,
            y_position: region?.y || 50,
            view: viewMode,
          });
        }

        await supabase
          .from('patient_sessions')
          .update({
            pain_locations_added: selectedAreas.length,
            current_step: 'history',
            progress: 55,
          })
          .eq('id', sessionId);
      }

      toast({
        title: langCode === 'hi' ? 'दर्द का नक्शा दर्ज किया गया' : 'Pain Map Saved',
        description: langCode === 'hi' ? 'चिकित्सा इतिहास पर आगे बढ़ रहे हैं...' : 'Proceeding to medical history...',
      });

      router.push('/history');
    } catch (error) {
      console.warn('Pain map save fallback:', error);
      router.push('/history');
    } finally {
      setLoading(false);
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
      ? 'हमें बताएं कि आपको कहाँ दर्द है। असुविधा वाले क्षेत्रों को चिह्नित करने के लिए शरीर के मॉडल पर टैप करें।'
      : 'Show Us Where It Hurts. Tap on the anatomical model to pinpoint areas of discomfort, or describe them in the panel.';
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
    router.push('/');
  };

  const t = {
    en: {
      help: 'HELP',
      step: 'STEP 4 OF 7: PAIN MAP',
      title: 'Show Us Where It Hurts',
      subtitle: 'Tap on the anatomical model to pinpoint areas of discomfort, or describe them in the panel.',
      view3D: '3D View',
      view2D: '2D View',
      instruction: 'Drag to rotate • Pinch to zoom • Tap to select area',
      selectedAreas: 'Selected Areas',
      addArea: 'Add Area manually',
      painIntensity: 'Pain Intensity',
      none: '0 - None',
      moderate: '5 - Moderate',
      severe: '10 - Severe',
      onset: 'ONSET',
      suddenly: 'Suddenly',
      gradually: 'Gradually',
      character: 'CHARACTER',
      characterHint: '(Select all that apply)',
      skip: 'Skip',
      next: 'Next',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      guideTitle: 'Pain Location Help',
      guideText: 'Touch any hotspot on the body to highlight the pain area, then slide the intensity bar from 0 to 10.',
    },
    hi: {
      help: 'सहायता',
      step: 'चरण ४ / ७: दर्द का नक्शा (PAIN MAP)',
      title: 'हमें बताएं कि आपको कहाँ दर्द है',
      subtitle: 'असुविधा वाले क्षेत्रों को चिह्नित करने के लिए शरीर के मॉडल पर टैप करें, या नीचे दिए गए पैनल में चुनें।',
      view3D: '3D दृश्य',
      view2D: '2D दृश्य',
      instruction: 'घुमाने के लिए खींचें • ज़ूम करें • चुनने के लिए टैप करें',
      selectedAreas: 'चुने गए क्षेत्र',
      addArea: 'क्षेत्र मैन्युअल रूप से जोड़ें',
      painIntensity: 'दर्द की तीव्रता',
      none: '० - बिल्कुल नहीं',
      moderate: '५ - मध्यम',
      severe: '१० - अत्यधिक',
      onset: 'दर्द की शुरुआत (ONSET)',
      suddenly: 'अचानक (Suddenly)',
      gradually: 'धीरे-धीरे (Gradually)',
      character: 'दर्द का प्रकार (CHARACTER)',
      characterHint: '(सभी लागू विकल्प चुनें)',
      skip: 'छोड़ें',
      next: 'आगे बढ़ें',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      guideTitle: 'दर्द नक्शा सहायता',
      guideText: 'शरीर के किसी भी हिस्से पर टैप करें और ० से १० के पैमाने पर दर्द की तीव्रता चुनें।',
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Decorative Ambient Background Glow Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00685f]/10 rounded-full blur-[100px] -z-10 -mr-32 -mt-20 pointer-events-none" />
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

      {/* Main Content Container */}
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

        {/* Main 2-Card Vertical Flow */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Card 1: Interactive 3D/2D Anatomical Model Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`rounded-[22px] p-6 shadow-sm border relative min-h-[460px] sm:min-h-[500px] flex flex-col overflow-hidden ${
              isHighContrast
                ? 'bg-zinc-950 border-zinc-800'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            {/* Top Toolbar: View Mode Switcher + Instruction Pill */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 z-10 mb-4">
              <div className={`p-1 rounded-xl border flex items-center shadow-xs ${
                isHighContrast ? 'bg-zinc-900 border-zinc-700' : 'bg-[#e2e8f0]/80 border-[#cbd5e1]'
              }`}>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                    viewMode === '3d'
                      ? isHighContrast ? 'bg-yellow-400 text-black shadow-xs' : 'bg-white text-[#151c27] shadow-xs'
                      : 'text-[#475569] hover:text-[#151c27]'
                  }`}
                >
                  {t.view3D}
                </button>
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                    viewMode === '2d'
                      ? isHighContrast ? 'bg-yellow-400 text-black shadow-xs' : 'bg-white text-[#151c27] shadow-xs'
                      : 'text-[#475569] hover:text-[#151c27]'
                  }`}
                >
                  {t.view2D}
                </button>
              </div>

              <span className={`text-[11px] sm:text-xs font-semibold px-4 py-1.5 rounded-full border backdrop-blur-md shadow-xs ${
                isHighContrast
                  ? 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
                  : 'bg-white/90 border-[#e2e8f0] text-[#64748b]'
              }`}>
                {t.instruction}
              </span>
            </div>

            {/* Anatomical Model Viewport with Interactive Hotspots */}
            <div className="flex-1 w-full flex items-center justify-center relative min-h-[380px] sm:min-h-[400px]">
              
              {/* Human Anatomical Silhouette / Model Frame */}
              <div 
                style={{ transform: `scale(${zoomScale}) rotate(${modelRotation}deg)`, transition: 'transform 0.25s ease-out' }}
                className="w-64 sm:w-72 h-[360px] sm:h-[390px] relative flex items-center justify-center select-none"
              >
                {/* SVG Stylized Anatomical Human Body Map */}
                <svg
                  viewBox="0 0 200 400"
                  className={`w-full h-full drop-shadow-md transition-colors ${
                    isHighContrast ? 'text-zinc-700 fill-zinc-800 stroke-zinc-600' : 'text-slate-200 fill-slate-100 stroke-slate-300'
                  }`}
                >
                  {/* Head */}
                  <circle cx="100" cy="45" r="24" strokeWidth="2.5" />
                  {/* Neck */}
                  <rect x="92" y="70" width="16" height="18" rx="4" strokeWidth="2" />
                  {/* Shoulders & Torso */}
                  <path
                    d="M 50 100 Q 100 88 150 100 L 140 220 Q 100 230 60 220 Z"
                    strokeWidth="2.5"
                  />
                  {/* Left & Right Arms */}
                  <path d="M 50 100 L 32 180 L 26 240" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 150 100 L 168 180 L 174 240" strokeWidth="12" strokeLinecap="round" />
                  {/* Pelvis & Legs */}
                  <path d="M 65 220 L 70 310 L 68 375" strokeWidth="16" strokeLinecap="round" />
                  <path d="M 135 220 L 130 310 L 132 375" strokeWidth="16" strokeLinecap="round" />
                </svg>

                {/* Interactive Clickable Hotspots & Pulsing Glowing Indicators */}
                {BODY_REGIONS.map((region) => {
                  const isSelected = selectedAreas.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      onClick={() => toggleArea(region.id)}
                      style={{ top: `${region.y}%`, left: `${region.x}%` }}
                      title={langCode === 'hi' ? region.nameHi : region.nameEn}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'w-9 h-9 z-30'
                          : 'w-5 h-5 z-20 hover:scale-130'
                      }`}
                    >
                      {/* Outer pulse aura for selected spots */}
                      {isSelected && (
                        <>
                          <span className="absolute w-10 h-10 rounded-full bg-[#00685f]/30 animate-ping" />
                          <span className="absolute w-7 h-7 rounded-full bg-[#00685f]/50 animate-pulse" />
                        </>
                      )}

                      <span className={`rounded-full transition-all shadow-md ${
                        isSelected
                          ? 'w-5 h-5 bg-[#00685f] border-2 border-white'
                          : isHighContrast
                          ? 'w-3.5 h-3.5 bg-yellow-400/80 border border-white'
                          : 'w-3.5 h-3.5 bg-slate-400/60 hover:bg-[#00685f] border border-white'
                      }`} />
                    </button>
                  );
                })}
              </div>

              {/* Bottom Floating View Controls (Zoom In, Zoom Out, Reset) */}
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full border backdrop-blur-xl shadow-md z-20 ${
                isHighContrast ? 'bg-zinc-900/90 border-zinc-700' : 'bg-white/90 border-[#cbd5e1]'
              }`}>
                <button
                  onClick={() => handleZoom(0.15)}
                  title="Zoom In"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleZoom(-0.15)}
                  title="Zoom Out"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetView}
                  title="Reset View"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>
          </motion.div>

          {/* Card 2: Clinical Details Panel (Selected Areas, Pain Slider, Onset, Character) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-[22px] p-6 sm:p-8 shadow-sm border flex flex-col gap-6 ${
              isHighContrast
                ? 'bg-zinc-950 border-zinc-800'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            {/* Selected Areas Chips */}
            <div>
              <h2 className={`font-bold text-base sm:text-lg mb-3 ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                {t.selectedAreas}
              </h2>
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedAreas.map((areaId) => {
                  const reg = BODY_REGIONS.find((r) => r.id === areaId);
                  return (
                    <span
                      key={areaId}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-xs ${
                        isHighContrast
                          ? 'bg-yellow-400 text-black'
                          : 'bg-[#00685f] text-white'
                      }`}
                    >
                      <span>{langCode === 'hi' ? reg?.nameHi || areaId : reg?.nameEn || areaId}</span>
                      <button
                        onClick={() => removeArea(areaId)}
                        className="hover:opacity-70 rounded-full"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </span>
                  );
                })}

                <button
                  onClick={() => setShowAddModal(true)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs sm:text-sm border transition-colors ${
                    isHighContrast
                      ? 'border-yellow-400 text-yellow-400 hover:bg-zinc-900'
                      : 'border-[#00685f] text-[#00685f] hover:bg-[#00685f]/10'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addArea}</span>
                </button>
              </div>
            </div>

            {/* Intensity & Onset / Character 2-Column Split */}
            <div className="flex flex-col lg:flex-row gap-8 w-full pt-2">
              
              {/* Left Column: Pain Intensity Slider */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-end mb-4">
                  <h2 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                    {t.painIntensity}
                  </h2>
                  <span className={`font-extrabold text-3xl sm:text-4xl tracking-tight ${
                    isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'
                  }`}>
                    {painIntensity}
                    <span className="text-base sm:text-lg font-normal text-[#64748b]"> / 10</span>
                  </span>
                </div>

                {/* Custom Styled Slider */}
                <div className="relative w-full my-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={painIntensity}
                    onChange={(e) => setPainIntensity(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-[#e2e8f8] rounded-lg appearance-none cursor-pointer accent-[#00685f]"
                  />
                </div>

                <div className="flex justify-between text-xs font-bold text-[#64748b] mt-2">
                  <span>{t.none}</span>
                  <span>{t.moderate}</span>
                  <span>{t.severe}</span>
                </div>
              </div>

              {/* Center Divider Line */}
              <div className="w-[1px] bg-[#e2e8f0] hidden lg:block" />

              {/* Right Column: Onset & Character Selectors */}
              <div className="flex-1 flex flex-col gap-5">
                
                {/* Onset */}
                <div>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-[#64748b] mb-2.5">
                    {t.onset}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOnset('suddenly')}
                      className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
                        onset === 'suddenly'
                          ? isHighContrast
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm'
                            : 'bg-[#00685f] text-white border-[#00685f] shadow-sm'
                          : isHighContrast
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          : 'bg-[#f0f3ff] text-[#334155] border-[#cbd5e1]/60 hover:bg-[#e2e8f0]'
                      }`}
                    >
                      {t.suddenly}
                    </button>

                    <button
                      onClick={() => setOnset('gradually')}
                      className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
                        onset === 'gradually'
                          ? isHighContrast
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm'
                            : 'bg-[#00685f] text-white border-[#00685f] shadow-sm'
                          : isHighContrast
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          : 'bg-[#f0f3ff] text-[#334155] border-[#cbd5e1]/60 hover:bg-[#e2e8f0]'
                      }`}
                    >
                      {t.gradually}
                    </button>
                  </div>
                </div>

                {/* Character Chips */}
                <div>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-[#64748b] mb-2.5">
                    {t.character} <span className="text-[10px] normal-case font-medium opacity-80">{t.characterHint}</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {PAIN_CHARACTERS.map((char) => {
                      const isCharSelected = selectedCharacters.includes(char.id);
                      return (
                        <button
                          key={char.id}
                          onClick={() => toggleCharacter(char.id)}
                          className={`px-4 py-2 rounded-full font-bold text-xs transition-all border ${
                            isCharSelected
                              ? isHighContrast
                                ? 'bg-yellow-400 text-black border-yellow-400 shadow-xs'
                                : 'bg-[#00685f] text-white border-[#00685f] shadow-xs'
                              : isHighContrast
                              ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                              : 'bg-white text-[#334155] border-[#cbd5e1] hover:bg-[#f0f3ff]'
                          }`}
                        >
                          {langCode === 'hi' ? char.labelHi : char.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

          </motion.div>

        </div>

        {/* Bottom Actions Bar (Skip & Next) */}
        <div className="flex items-center justify-between w-full pt-6 pb-2">
          <button
            onClick={() => router.push('/history')}
            className={`px-8 py-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 ${
              isHighContrast
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f0f3ff]'
            }`}
          >
            {t.skip}
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className={`px-9 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-md active:scale-95 transition-all flex items-center gap-2 ${
              isHighContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-[#00685f] hover:bg-[#005049] text-white shadow-[#00685f]/30'
            }`}
          >
            <span>{loading ? '...' : t.next}</span>
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
            onClick={handleExitKiosk}
            className="px-8 py-3.5 bg-[#0058be] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm md:text-base tracking-wide shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.exit}</span>
          </button>
        </div>
      </footer>

      {/* Add Body Area Manual Selection Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#cbd5e1] relative z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">
                  {langCode === 'hi' ? 'शरीर का हिस्सा चुनें' : 'Select Body Area'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto">
                {BODY_REGIONS.map((region) => {
                  const isSelected = selectedAreas.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      onClick={() => toggleArea(region.id)}
                      className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#00685f] text-white border-[#00685f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {langCode === 'hi' ? region.nameHi : region.nameEn}
                    </button>
                  );
                })}
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 bg-[#00685f] hover:bg-[#005049] text-white font-bold rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
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
