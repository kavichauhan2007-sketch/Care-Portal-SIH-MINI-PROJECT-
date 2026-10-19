'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { speak, speakThenListen, matchesCommand, CMD, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  HelpCircle,
  Volume2,
  VolumeX,
  Type,
  Contrast,
  User,
  Sparkles,
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  X,
  Mic,
  MicOff,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ClinicalQuestion, KioskOption } from '@/app/api/generate-questions/route';

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Voice guidance state
  const [voiceMode, setVoiceMode] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Dynamic Questions State
  const [questions, setQuestions] = useState<ClinicalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [patientContext, setPatientContext] = useState<string>('');

  // Voice input for text questions
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    loadPatientQuestions();

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const loadPatientQuestions = async (forceBypass = false) => {
    setLoading(true);
    try {
      const chiefComplaint = localStorage.getItem('careportal_chief_complaint') || 
                             localStorage.getItem('careportal_symptoms_text') || 
                             '';
      
      let painLocations: any[] = [];
      try {
        const storedPain = localStorage.getItem('careportal_pain_locations');
        if (storedPain) painLocations = JSON.parse(storedPain);
      } catch (e) {}

      // Attempt to fetch real-time tailored questions from API with Gemini
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: chiefComplaint || 'General discomfort and pain',
          painLocations: painLocations,
          painIntensity: 7,
          onset: 'gradually',
          language: langCode,
          bypass: forceBypass,
        }),
      });

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setIsBypassMode(data.isBypass || forceBypass);
        setPatientContext(data.aiSymptomContext || chiefComplaint || 'Patient Intake');
      } else {
        throw new Error('No questions returned');
      }
    } catch (error) {
      console.warn('Questions load error, activating resilient bypass question bank:', error);
      setIsBypassMode(true);
      
      // Fallback questions triggered directly
      try {
        const res = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bypass: true }),
        });
        const data = await res.json();
        if (data.questions) setQuestions(data.questions);
      } catch (err) {
        console.error('Critical fallback error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  const toggleBypassMode = () => {
    const newBypassState = !isBypassMode;
    setIsBypassMode(newBypassState);
    loadPatientQuestions(newBypassState);
    toast({
      title: newBypassState ? '⚡ Standard Clinical Protocol Activated' : '✨ Real-time AI Adaptive Protocol Activated',
      description: newBypassState 
        ? 'Using standard pre-validated bypass questions.' 
        : 'Gemini is generating dynamic questions tailored to your symptoms.',
    });
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

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 71;

  // Auto voice guidance for current question (if Voice Guide Mode is enabled)
  useEffect(() => {
    if (!mounted || !currentQuestion || loading || !isVoiceGuideEnabled()) return;
    const qText = langCode === 'hi' ? (currentQuestion.questionHi || currentQuestion.question) : currentQuestion.question;
    const descText = langCode === 'hi' ? (currentQuestion.descriptionHi || '') : (currentQuestion.description || '');
    let fullText = `${qText}. ${descText}`;

    if (currentQuestion.options && currentQuestion.options.length > 0) {
      const optTexts = currentQuestion.options.map(
        (o) => (langCode === 'hi' ? (o.labelHi || o.label) : o.label)
      ).join(', ');
      fullText += langCode === 'hi' ? `. विकल्प हैं: ${optTexts}` : `. Options are: ${optTexts}`;
    }

    setVoiceMode('speaking');
    const stop = speakThenListen(
      fullText,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (currentQuestion.options) {
          const matchedOpt = currentQuestion.options.find(
            (o) => (o.label && transcript.includes(o.label.toLowerCase())) ||
                   (o.labelHi && transcript.includes(o.labelHi.toLowerCase())) ||
                   (o.id && transcript.includes(o.id.toLowerCase()))
          );
          if (matchedOpt) {
            handleSelectOption(matchedOpt.id, true);
            return;
          }
        } else if (currentQuestion.type === 'text' && transcript.length > 2 && !matchesCommand(transcript, CMD.skip) && !matchesCommand(transcript, CMD.back) && !matchesCommand(transcript, CMD.wake)) {
          handleTextChange(transcript);
        }

        if (matchesCommand(transcript, CMD.wake)) {
          // Wake word triggered: speak brief acknowledgment
          speak(langCode === 'hi' ? 'हाँ, कृपया अपना उत्तर बोलें।' : 'Yes, please speak your answer.', langCode);
          return;
        }

        if (matchesCommand(transcript, CMD.skip) || matchesCommand(transcript, CMD.agree) || matchesCommand(transcript, CMD.submit)) {
          handleNext();
        } else if (matchesCommand(transcript, CMD.back)) {
          handleBack();
        }
      },
      () => setVoiceMode('listening'),
      () => setVoiceMode('idle')
    );
    stopVoiceRef.current = stop;
    return () => stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, currentIndex, currentQuestion?.id, loading, langCode]);

  const handleSelectOption = (optionId: string, isFromVoice = false) => {
    if (!currentQuestion) return;

    if (currentQuestion.type === 'multiple') {
      const current = (answers[currentQuestion.id] as string[]) || [];
      if (current.includes(optionId)) {
        setAnswers({
          ...answers,
          [currentQuestion.id]: current.filter((id) => id !== optionId),
        });
      } else {
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...current, optionId],
        });
      }
    } else {
      // Single choice question - set answer and auto-advance to next question
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: optionId,
      }));
      
      // Auto next feature: proceed smoothly after visual selection feedback
      setTimeout(() => {
        stopVoiceRef.current?.();
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((idx) => idx + 1);
        } else {
          router.push('/documents');
        }
      }, 550);
    }
  };

  const handleTextChange = (text: string) => {
    if (!currentQuestion) return;
    setAnswers({
      ...answers,
      [currentQuestion.id]: text,
    });
  };

  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    const ans = answers[currentQuestion.id];
    if (currentQuestion.type === 'multiple') {
      return Array.isArray(ans) && ans.length > 0;
    }
    if (currentQuestion.type === 'text') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    return ans !== undefined && ans !== null && ans !== '';
  };

  const handleNext = () => {
    stopVoiceRef.current?.();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    stopVoiceRef.current?.();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      router.push('/pain-location');
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    stopVoiceRef.current?.();
    setSaving(true);
    try {
      const historyId = localStorage.getItem('careportal_history_id');
      const sessionId = localStorage.getItem('careportal_session_id');

      // Save complete clinical questionnaire responses to Supabase
      if (historyId) {
        await supabase
          .from('clinical_histories')
          .update({
            history_of_present_illness: JSON.stringify(answers),
            completeness_score: 75,
            updated_at: new Date().toISOString(),
          })
          .eq('id', historyId);
      }

      if (sessionId) {
        await supabase
          .from('patient_sessions')
          .update({
            current_step: 'documents',
            progress: 75,
          })
          .eq('id', sessionId);
      }

      localStorage.setItem('careportal_history_answers', JSON.stringify(answers));

      toast({
        title: langCode === 'hi' ? 'चिकित्सा इतिहास सहेजा गया' : 'Clinical History Recorded',
        description: langCode === 'hi' ? 'दस्तावेज़ सत्यापन पर आगे बढ़ रहे हैं...' : 'Proceeding to document verification...',
      });

      router.push('/documents');
    } catch (error) {
      console.warn('History save fallback:', error);
      router.push('/documents');
    } finally {
      setSaving(false);
    }
  };

  // Text-to-speech for Question & Options
  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentQuestion) return;

    const qText = langCode === 'hi' ? currentQuestion.questionHi : currentQuestion.question;
    const descText = langCode === 'hi' ? currentQuestion.descriptionHi : currentQuestion.description;
    let fullText = `${qText}. ${descText}`;

    if (currentQuestion.options) {
      const optTexts = currentQuestion.options.map(
        (o) => (langCode === 'hi' ? o.labelHi : o.label)
      ).join(', ');
      fullText += `. Options are: ${optTexts}`;
    }

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleFontSize = () => {
    setFontLevel((prev) => (prev + 1) % 3);
  };

  // Voice recording toggle for open text questions
  const toggleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      setIsRecording(true);
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRec();
        recognition.lang = langCode === 'hi' ? 'hi-IN' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          if (current) handleTextChange(current);
        };

        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => setIsRecording(false);

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {}
      } else {
        setTimeout(() => {
          setIsRecording(false);
          handleTextChange(
            langCode === 'hi'
              ? 'मुझे पिछले दो सप्ताह से लगातार थकान और कभी-कभी चक्कर आने की समस्या भी है।'
              : 'I have also been feeling fatigued and occasionally dizzy over the past two weeks.'
          );
        }, 1500);
      }
    }
  };

  const renderOptionIcon = (iconName?: string) => {
    if (!iconName) return <Clock className="w-5 h-5" />;
    return <span className="material-symbols-outlined text-[24px]">{iconName}</span>;
  };

  const t = {
    en: {
      help: 'HELP',
      step: `STEP 5 OF 7: CLINICAL HISTORY`,
      stepCounter: `Step 5 of 7`,
      questionOf: `Question ${currentIndex + 1} of ${questions.length || 7}`,
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      skip: 'Skip',
      next: 'Next',
      complete: 'Complete',
      back: 'Back',
      saving: 'Saving...',
      secureNotice: 'Your information is confidential and secure.',
      selectAll: 'Select all options that apply',
      textPlaceholder: 'Type any additional details or notes for the doctor here...',
      speak: 'Speak',
      listening: 'Listening...',
    },
    hi: {
      help: 'सहायता',
      step: `चरण ५ / ७: चिकित्सीय इतिहास (CLINICAL HISTORY)`,
      stepCounter: `चरण ५ / ७`,
      questionOf: `प्रश्न ${currentIndex + 1} / ${questions.length || 7}`,
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      skip: 'छोड़ें',
      next: 'आगे बढ़ें',
      complete: 'पूरा करें',
      back: 'पीछे',
      saving: 'सहेजा जा रहा है...',
      secureNotice: 'आपकी जानकारी पूरी तरह गोपनीय एवं सुरक्षित है।',
      selectAll: 'सभी लागू विकल्प चुनें',
      textPlaceholder: 'यहाँ अपने लक्षण या कोई अन्य जानकारी लिखें...',
      speak: 'माइक से बोलें',
      listening: 'सुन रहे हैं...',
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

      {/* Top Header Bar (Identical to Symptoms & Pain-Location) */}
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
      <main className="flex-1 pt-24 pb-28 w-full max-w-4xl mx-auto px-6 md:px-8 flex flex-col justify-between">
        
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

        {/* Progress Bar & Protocol Pill */}
        <div className="w-full max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#64748b]">
                {langCode === 'hi' ? 'चिकित्सीय इतिहास' : 'Clinical History'}
              </span>
              {patientContext && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100/80 text-teal-800 border border-teal-200">
                  {patientContext}
                </span>
              )}
            </div>

            <button
              onClick={toggleBypassMode}
              title="Toggle AI Adaptive / Standard Protocol"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                isBypassMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
              }`}
            >
              {isBypassMode ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Standard Bypass Protocol</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin-slow" />
                  <span>AI Real-time Protocol</span>
                </>
              )}
            </button>
          </div>

          <div className="h-2 w-full bg-[#e2e8f8] rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#00685f] rounded-full transition-all duration-500 ease-out"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-teal-200 border-t-[#00685f] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-[#151c27]">
              {langCode === 'hi' ? 'आपके लक्षणों के अनुसार प्रश्न तैयार किए जा रहे हैं...' : 'Generating tailored clinical questions...'}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748b] max-w-md mt-1">
              {langCode === 'hi' 
                ? 'जेमिनी एआई आपके पिछले उत्तरों का विश्लेषण करके अनुकूलित पूछताछ तैयार कर रहा है।' 
                : 'Gemini AI is analyzing your symptoms and pain map to construct a targeted history protocol.'}
            </p>
          </div>
        ) : currentQuestion ? (

          /* Question Card & Bento Options */
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto pb-4">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                {/* Question Pill Badge */}
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#2170e4]/15 rounded-full mb-3 shadow-xs">
                  <HelpCircle className="w-4 h-4 text-[#0058be]" />
                  <span className="text-xs font-bold text-[#0058be]">
                    {t.questionOf}
                  </span>
                </div>

                {/* Heading */}
                <h1 className={`text-center font-extrabold tracking-tight leading-tight mb-2 ${
                  isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
                } ${
                  fontLevel === 1 
                    ? 'text-3xl sm:text-4xl' 
                    : fontLevel === 2 
                    ? 'text-4xl sm:text-5xl' 
                    : 'text-2xl sm:text-3xl md:text-[34px]'
                }`}>
                  {langCode === 'hi' ? currentQuestion.questionHi : currentQuestion.question}
                </h1>

                {/* Subtitle */}
                <p className={`text-center max-w-xl mx-auto mb-6 font-medium text-xs sm:text-sm md:text-base leading-relaxed ${
                  isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
                }`}>
                  {langCode === 'hi' ? currentQuestion.descriptionHi : currentQuestion.description}
                </p>

                {/* Multiple Choice Notice */}
                {currentQuestion.type === 'multiple' && (
                  <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200">
                    <span>💡 {t.selectAll}</span>
                  </div>
                )}

                {/* Question Input Section */}
                {currentQuestion.type === 'text' ? (
                  
                  /* Text/Voice Input Card */
                  <div className={`w-full max-w-2xl rounded-2xl p-6 shadow-sm border ${
                    isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <label className={`text-xs font-bold tracking-wider uppercase ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                        {langCode === 'hi' ? 'आपका विवरण (वैकल्पिक)' : 'Your Response (Optional)'}
                      </label>
                      <button
                        onClick={toggleVoiceInput}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-teal-50 text-[#00685f] hover:bg-teal-100'
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{isRecording ? t.listening : t.speak}</span>
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder={t.textPlaceholder}
                      className={`w-full p-4 rounded-xl border focus:outline-none focus:ring-2 text-sm sm:text-base resize-none ${
                        isHighContrast
                          ? 'bg-zinc-900 border-zinc-700 text-white focus:ring-yellow-400'
                          : 'bg-[#f0f3ff] border-[#bcc9c6]/40 text-[#151c27] focus:ring-[#00685f]/30 focus:border-[#00685f]'
                      }`}
                    />
                  </div>

                ) : (

                  /* Bento-Style Tap Options */
                  <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
                    {currentQuestion.options?.map((option) => {
                      const isSelected = currentQuestion.type === 'multiple'
                        ? Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option.id)
                        : answers[currentQuestion.id] === option.id;

                      return (
                        <motion.button
                          key={option.id}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => handleSelectOption(option.id)}
                          className={`group relative flex items-center justify-between w-full p-4 sm:p-5 rounded-2xl transition-all duration-200 text-left border ${
                            isSelected
                              ? isHighContrast
                                ? 'bg-zinc-900 border-yellow-400 ring-2 ring-yellow-400 shadow-md'
                                : 'bg-white border-[#00685f] ring-2 ring-[#00685f] shadow-md'
                              : isHighContrast
                              ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900'
                              : 'bg-white border-slate-200/80 hover:border-[#00685f]/40 hover:shadow-md shadow-xs'
                          }`}
                        >
                          {/* Left: Icon + Text */}
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? isHighContrast
                                    ? 'bg-yellow-400 text-black'
                                    : 'bg-[#00685f] text-white'
                                  : isHighContrast
                                  ? 'bg-zinc-800 text-yellow-400'
                                  : 'bg-[#e7eefe] text-[#0058be]'
                              }`}
                            >
                              {renderOptionIcon(option.icon)}
                            </div>

                            <div className="flex flex-col items-start">
                              <span
                                className={`text-base sm:text-lg font-bold transition-colors ${
                                  isSelected
                                    ? isHighContrast
                                      ? 'text-yellow-400'
                                      : 'text-[#00685f]'
                                    : isHighContrast
                                    ? 'text-white'
                                    : 'text-[#151c27]'
                                }`}
                              >
                                {langCode === 'hi' ? option.labelHi : option.label}
                              </span>
                              <span className="text-xs sm:text-sm text-[#64748b] mt-0.5 text-left">
                                {langCode === 'hi' ? option.sublabelHi : option.sublabel}
                              </span>
                            </div>
                          </div>

                          {/* Right: Check / Radio */}
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 ${
                              isSelected
                                ? isHighContrast
                                  ? 'border-yellow-400 bg-yellow-400 text-black'
                                  : 'border-[#00685f] bg-[#00685f] text-white'
                                : isHighContrast
                                ? 'border-zinc-600'
                                : 'border-slate-300 group-hover:border-slate-400'
                            }`}
                          >
                            <Check
                              className={`w-4 h-4 stroke-[3] transition-opacity ${
                                isSelected ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                )}

              </motion.div>
            </AnimatePresence>

          </div>

        ) : null}

        {/* Bottom Actions Bar (Skip, Back, Next & Security Notice) */}
        <div className={`w-full rounded-2xl py-4 px-6 shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4 mt-auto ${
          isHighContrast ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#e2e8f0]'
        }`}>
          {/* Security Badge */}
          <div className="flex items-center gap-2 order-2 md:order-1 text-[#64748b] text-xs">
            <Lock className="w-4 h-4 stroke-[2]" />
            <span>{t.secureNotice}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
            <button
              onClick={handleBack}
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
              onClick={handleSkip}
              className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 ${
                isHighContrast
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f0f3ff]'
              }`}
            >
              {t.skip}
            </button>

            <button
              onClick={handleNext}
              disabled={saving || (!isCurrentQuestionAnswered() && currentQuestion?.type !== 'text')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 ${
                isCurrentQuestionAnswered() || currentQuestion?.type === 'text'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-[#00685f] hover:bg-[#005049] text-white shadow-[#00685f]/30 cursor-pointer'
                  : isHighContrast
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                  : 'bg-[#e2e8f8] text-[#8c9ba5] cursor-not-allowed'
              }`}
            >
              <span>
                {saving
                  ? t.saving
                  : currentIndex === questions.length - 1
                  ? t.complete
                  : t.next}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </main>

      {/* Bottom Accessibility & Exit Footer (Identical to Symptoms & Pain-Location) */}
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
                    {langCode === 'hi' ? 'चिकित्सीय पूछताछ सहायता' : 'Clinical History Help'}
                  </h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 text-slate-600 text-sm leading-relaxed space-y-3">
                <p>
                  <strong>{langCode === 'hi' ? 'वास्तविक समय प्रश्न:' : 'Real-time AI Questions:'}</strong>{' '}
                  {langCode === 'hi'
                    ? 'यह प्रणाली जेमिनी एआई का उपयोग करके आपके द्वारा बताए गए दर्द और लक्षणों के आधार पर व्यक्तिगत प्रश्न पूछती है।'
                    : 'The kiosk utilizes Gemini AI to craft precise, SOCRATES-aligned anamnesis questions according to your exact symptoms.'}
                </p>
                <p>
                  <strong>{langCode === 'hi' ? 'बाईपास सुरक्षा प्रणाली:' : 'Resilient Bypass System:'}</strong>{' '}
                  {langCode === 'hi'
                    ? 'यदि नेटवर्क या एआई में कोई बाधा आती है, तो प्रणाली स्वचालित रूप से मानक नैदानिक प्रोटोकॉल पर स्विच हो जाती है ताकि आपका समय व्यर्थ न हो।'
                    : 'If network connectivity or AI generation is interrupted, the kiosk instantly switches to standard pre-validated bypass questions.'}
                </p>
              </div>

              <div className="pt-3 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={toggleBypassMode}
                  className="text-xs font-bold text-[#00685f] hover:underline"
                >
                  {isBypassMode ? 'Switch to AI Mode' : 'Switch to Bypass Mode'}
                </button>

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
