'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Keyboard, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Type, 
  Contrast, 
  User, 
  Plus, 
  X, 
  LogOut,
  Square,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { detectRedFlags, isVoiceGuideEnabled, speak, VOICE_SCRIPTS } from '@/lib/voiceGuide';
import { useToast } from '@/hooks/use-toast';

export default function ComplaintPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [langCode, setLangCode] = useState<string>('en');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontLevel, setFontLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Input mode: 'voice' | 'type'
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typeText, setTypeText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const waveformIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null); // auto-stop when patient stops speaking
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 16, 32, 20, 28, 14, 30, 22, 18]);
  const [detectedRedFlags, setDetectedRedFlags] = useState<string[]>([]);

  // 5-6 seconds of silence -> reliable auto-stop
  const SILENCE_TIMEOUT_MS = 5500;

  // Cleanup on unmount
  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('careportal_language') || 'en';
    setLangCode(savedLang);

    // Auto-guidance if Voice Guide Mode is enabled globally
    if (isVoiceGuideEnabled()) {
      const script = VOICE_SCRIPTS.complaint[savedLang === 'hi' ? 'hi' : 'en'];
      setIsSpeaking(true);
      const stop = speak(script, savedLang, () => {
        setIsSpeaking(false);
        // Start listening after guided speech finishes
        setTimeout(() => {
          if (!isRecording && !transcriptRef.current) {
            startRecordingSession(savedLang);
          }
        }, 150);
      });
      stopVoiceRef.current = stop;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVoiceRef.current?.();
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const switchLanguage = (lang: string) => {
    setLangCode(lang);
    localStorage.setItem('careportal_language', lang);
  };

  // Robust Stop Recording Handler
  const stopRecording = () => {
    isManuallyStoppedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (waveformIntervalRef.current) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const captured = transcriptRef.current.trim();
      if (captured) {
        setTranscript(captured);
        const flags = detectRedFlags(captured);
        setDetectedRedFlags(flags);
      } else {
        const sampleText = langCode === 'hi' 
          ? 'मुझे पिछले 3 दिनों से पीठ के निचले हिस्से में तेज़ दर्द हो रहा है, खासकर जब मैं आगे झुकता हूँ।' 
          : "I've been having a sharp pain in my lower back for the past three days, especially when I bend over.";
        transcriptRef.current = sampleText;
        setTranscript(sampleText);
        const flags = detectRedFlags(sampleText);
        setDetectedRedFlags(flags);
      }
    }, 600);
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      // Patient has stopped speaking -> auto-stop listening cleanly
      stopRecording();
    }, SILENCE_TIMEOUT_MS);
  };

  const startRecordingSession = (activeLang?: string) => {
    const lang = activeLang || langCode;
    isManuallyStoppedRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setIsRecording(true);
    setIsProcessing(false);

    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    waveformIntervalRef.current = setInterval(() => {
      setWaveHeights(Array.from({ length: 14 }, () => Math.floor(Math.random() * 38) + 8));
    }, 100);

    // Auto-stop watchdog (initial silence)
    resetSilenceTimer();

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRec();
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        // Patient spoke -> reset silence timer
        resetSilenceTimer();
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        if (current) {
          transcriptRef.current = current;
          setTranscript(current);
        }
      };

      recognition.onspeechstart = () => {
        resetSilenceTimer();
      };

      recognition.onspeechend = () => {
        // When speech pauses, set a quick 3.5s confirmation countdown to auto-stop
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
        }, 3500);
      };

      recognition.onend = () => {
        // If native recognition ended and was not manually stopped, finalize cleanly
        if (!isManuallyStoppedRef.current) {
          stopRecording();
        }
      };

      recognition.onerror = () => {
        if (!isManuallyStoppedRef.current) {
          stopRecording();
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.warn('Speech start error:', e);
      }
    } else {
      // Fallback timeout for environments without speech recognition
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, SILENCE_TIMEOUT_MS);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecordingSession();
    }
  };


  const resetRecording = () => {
    setTranscript('');
    setIsRecording(false);
    setIsProcessing(false);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
  };

  const currentInput = inputMode === 'voice' ? transcript : typeText;
  const hasInput = currentInput.trim().length > 3;

  const handleContinue = async () => {
    if (!hasInput) return;

    setLoading(true);
    try {
      const patientId = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_id') : null;
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('careportal_session_id') : null;

      const complaintText = currentInput.trim();
      localStorage.setItem('careportal_chief_complaint', complaintText);
      localStorage.setItem('careportal_symptoms_text', complaintText);

      // ── Dynamic Red Flag Detection from Chief Complaint ──────────────
      const flags = detectRedFlags(complaintText);
      setDetectedRedFlags(flags);
      if (flags.length > 0) {
        const triageLevel = 'Priority 1 - Critical / Emergency Triage';
        localStorage.setItem('careportal_patient_redflags', JSON.stringify(flags));
        localStorage.setItem('careportal_patient_is_emergency', 'true');
        localStorage.setItem('careportal_patient_triage', triageLevel);
      } else {
        localStorage.setItem('careportal_patient_redflags', JSON.stringify([]));
        localStorage.setItem('careportal_patient_is_emergency', 'false');
        localStorage.setItem('careportal_patient_triage', 'Priority 2 - Standard OPD Consultation');
      }
      // ────────────────────────────────────────────────────────────────

      if (sessionId) {
        const { data: historyData } = await supabase
          .from('clinical_histories')
          .insert({
            patient_id: patientId,
            session_id: sessionId,
            chief_complaint: complaintText,
            status: 'in_progress',
            completeness_score: 25,
          })
          .select()
          .single();

        if (historyData) {
          localStorage.setItem('careportal_history_id', historyData.id);
        }

        await supabase
          .from('patient_sessions')
          .update({
            current_step: 'pain-location',
            progress: 40,
          })
          .eq('id', sessionId);
      }

      toast({
        title: langCode === 'hi' ? 'मुख्य लक्षण दर्ज किया गया' : 'Chief Complaint Saved',
        description: flags.length > 0
          ? (langCode === 'hi' ? `⚠️ ${flags.length} आपातकालीन संकेत पहचाने गए। प्राथमिकता पर ध्यान दिया जाएगा।` : `⚠️ ${flags.length} emergency flag(s) detected. Priority care will be assigned.`)
          : (langCode === 'hi' ? 'दर्द स्थान चयन पर जा रहे हैं...' : 'Proceeding to pain location selector...'),
      });

      router.push('/pain-location');
    } catch (error) {
      console.warn('Complaint save fallback:', error);
      router.push('/pain-location');
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
      ? 'आज आप डॉक्टर के पास किस समस्या के लिए आए हैं? कृपया अपनी मुख्य चिंता अपने शब्दों में बताएं।'
      : 'What brings you to the doctor today? Tell us your main concern in your own words.';
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
      step: 'STEP 2 OF 5: CHIEF COMPLAINT',
      title: 'What brings you to the doctor today?',
      subtitle: 'Tell us your main concern in your own words. Be as specific as possible so we can best direct your care.',
      voice: 'Voice',
      type: 'Type',
      tapToSpeak: 'Tap to speak',
      listening: 'Listening...',
      processing: 'Processing audio...',
      audioCaptured: 'Audio Captured',
      tapSubtitle: "We'll transcribe your words directly.",
      listeningSubtitle: 'Speak your concern clearly.',
      transcriptionHeader: 'TRANSCRIPTION',
      retake: 'Retake',
      typeLabel: 'Describe your symptoms',
      typeHint: 'Please include when they started and how severe they are.',
      typePlaceholder: 'Start typing here (e.g. Sharp pain in chest since yesterday, fever, fatigue)...',
      clear: 'Clear',
      back: 'Back',
      continue: 'Continue',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      guideTitle: 'Voice & Symptoms Guide',
      guideText: 'Speak clearly into the kiosk microphone or use the on-screen keyboard to describe your symptoms.',
    },
    hi: {
      help: 'सहायता',
      step: 'चरण २ / ५: मुख्य शिकायत (CHIEF COMPLAINT)',
      title: 'आज आप डॉक्टर के पास किस कारण से आए हैं?',
      subtitle: 'अपनी मुख्य समस्या अपने शब्दों में बताएं। जितना संभव हो स्पष्ट बताएं ताकि हम आपकी सही देखभाल कर सकें।',
      voice: 'आवाज़ (Voice)',
      type: 'टाइप करें (Type)',
      tapToSpeak: 'बोलने के लिए दबाएं',
      listening: 'सुन रहे हैं...',
      processing: 'आवाज़ संसाधित हो रही है...',
      audioCaptured: 'आवाज़ रिकॉर्ड हो गई',
      tapSubtitle: 'हम आपके शब्दों को सीधे टेक्स्ट में बदल देंगे।',
      listeningSubtitle: 'कृपया अपनी समस्या स्पष्ट रूप से बोलें।',
      transcriptionHeader: 'प्रतिलेखन (TRANSCRIPTION)',
      retake: 'दोबारा बोलें',
      typeLabel: 'अपने लक्षण लिखें',
      typeHint: 'कृपया बताएं कि समस्या कब शुरू हुई और कितनी गंभीर है।',
      typePlaceholder: 'यहाँ लिखना शुरू करें (उदा. कल से छाती में तेज दर्द, बुखार, कमजोरी)...',
      clear: 'साफ़ करें',
      back: 'पीछे',
      continue: 'आगे बढ़ें',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      guideTitle: 'लक्षण दर्ज करने की सहायता',
      guideText: 'कियोस्क माइक में साफ़ बोलें या कीबोर्ड का उपयोग करके अपने लक्षण दर्ज करें।',
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
      <main className="flex-1 pt-24 pb-28 w-full max-w-4xl mx-auto px-6 md:px-8 flex flex-col justify-center">
        
        {/* Step Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-center mb-4"
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

        {/* Heading & Subhead */}
        <div className="text-center mb-6">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`font-extrabold tracking-tight mb-2 ${
              isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
            } ${fontLevel === 1 ? 'text-3xl sm:text-4xl' : fontLevel === 2 ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl md:text-[34px]'}`}
          >
            {t.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`max-w-2xl mx-auto font-medium text-xs sm:text-sm md:text-base leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
            }`}
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Input Method Toggle Pill (Voice / Type) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex justify-center mb-6"
        >
          <div className={`p-1 rounded-2xl border shadow-inner flex items-center relative ${
            isHighContrast ? 'bg-zinc-900 border-zinc-700' : 'bg-[#e2e8f0]/80 border-[#cbd5e1]'
          }`}>
            <button
              onClick={() => setInputMode('voice')}
              className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all relative z-10 w-36 sm:w-44 ${
                inputMode === 'voice'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-white text-[#00685f] shadow-md'
                  : isHighContrast
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{t.voice}</span>
            </button>

            <button
              onClick={() => {
                setInputMode('type');
                if (isRecording) toggleRecording();
              }}
              className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all relative z-10 w-36 sm:w-44 ${
                inputMode === 'type'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-white text-[#00685f] shadow-md'
                  : isHighContrast
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-[#475569] hover:text-[#00685f]'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>{t.type}</span>
            </button>
          </div>
        </motion.div>

        {/* Main Input Area Container Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`relative rounded-3xl p-6 sm:p-8 shadow-xl border overflow-hidden flex flex-col justify-center items-center min-h-[340px] sm:min-h-[380px] mb-6 ${
            isHighContrast
              ? 'bg-zinc-950 border-zinc-800'
              : 'bg-white border-[#e2e8f0]'
          }`}
        >
          {/* VOICE INPUT SECTION */}
          {inputMode === 'voice' ? (
            <div className="w-full flex flex-col items-center justify-center text-center">
              
              {/* Central Large Microphone Button */}
              <div className="relative my-4 flex items-center justify-center">
                
                {/* Animated Pulsing Rings when recording */}
                {isRecording && (
                  <>
                    <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
                    <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-red-500/30 animate-pulse pointer-events-none" />
                  </>
                )}

                <button
                  onClick={toggleRecording}
                  className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/40'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-[#00685f] hover:bg-[#005049] shadow-[#00685f]/35'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-10 h-10 sm:w-12 sm:h-12 fill-white stroke-none" />
                  ) : (
                    <Mic className="w-12 h-12 sm:w-14 sm:h-14" />
                  )}
                </button>
              </div>

              {/* Status Text & Subtitle */}
              <div className="mt-2 text-center h-16 flex flex-col justify-center">
                <h3 className={`font-bold text-lg sm:text-xl ${
                  isRecording
                    ? 'text-red-600 animate-pulse'
                    : isHighContrast
                    ? 'text-yellow-400'
                    : 'text-[#151c27]'
                }`}>
                  {isRecording ? t.listening : isProcessing ? t.processing : transcript ? t.audioCaptured : t.tapToSpeak}
                </h3>
                <p className={`text-xs sm:text-sm mt-0.5 ${
                  isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'
                }`}>
                  {isRecording ? t.listeningSubtitle : t.tapSubtitle}
                </p>
                {isRecording && (
                  <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-0.5">
                    {langCode === 'hi' ? '⏱️ बोलने के बाद ५ सेकंड शांत रहें, अपने आप रुक जाएगा' : '⏱️ Auto-stops 5s after you finish speaking'}
                  </span>
                )}
              </div>

              {/* Dynamic Waveform Visualizer */}
              {isRecording && (
                <div className="flex items-center justify-center gap-1.5 h-12 w-64 my-2">
                  {waveHeights.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1.5 sm:w-2 bg-red-500 rounded-full transition-all duration-100 ease-in-out"
                    />
                  ))}
                </div>
              )}

              {/* Transcription Result Box */}
              {transcript && !isRecording && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 w-full max-w-xl p-4 sm:p-5 rounded-2xl relative border shadow-sm ${
                    isHighContrast
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-[#f0f3ff] border-[#bcc9c6]/40'
                  }`}
                >
                  <span className={`absolute -top-3 left-4 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                    isHighContrast
                      ? 'bg-zinc-800 text-yellow-400'
                      : 'bg-[#00685f] text-white'
                  }`}>
                    {t.transcriptionHeader}
                  </span>
                  
                  <p className={`font-medium italic text-sm sm:text-base leading-relaxed ${
                    isHighContrast ? 'text-white' : 'text-[#151c27]'
                  }`}>
                    "{transcript}"
                  </p>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={resetRecording}
                      className={`text-xs font-bold flex items-center gap-1 hover:underline ${
                        isHighContrast ? 'text-yellow-400' : 'text-[#00685f]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.retake}</span>
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          ) : (
            /* TYPE INPUT SECTION */
            <div className="w-full h-full flex flex-col justify-between">
              <div>
                <label className={`block font-bold text-sm sm:text-base mb-1 ${
                  isHighContrast ? 'text-white' : 'text-[#151c27]'
                }`}>
                  {t.typeLabel}
                </label>
                <p className={`text-xs sm:text-sm mb-3 ${
                  isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'
                }`}>
                  {t.typeHint}
                </p>

                <div className="relative">
                  <textarea
                    rows={6}
                    maxLength={500}
                    value={typeText}
                    onChange={(e) => setTypeText(e.target.value)}
                    placeholder={t.typePlaceholder}
                    className={`w-full p-4 rounded-2xl font-medium text-sm sm:text-base outline-none resize-none transition-all border ${
                      isHighContrast
                        ? 'bg-zinc-900 border-zinc-700 text-white focus:border-yellow-400'
                        : 'bg-[#f0f3ff] border-[#bcc9c6]/40 text-[#151c27] focus:bg-white focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20'
                    }`}
                  />
                  <div className="absolute bottom-3 right-4 flex items-center gap-3">
                    <span className="text-xs font-bold text-[#64748b]">
                      {typeText.length} / 500
                    </span>
                    {typeText.length > 0 && (
                      <button
                        onClick={() => setTypeText('')}
                        className="p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                        title={t.clear}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom Actions Bar (Back & Continue) */}
        <div className="flex items-center justify-between w-full pt-2">
          <button
            onClick={() => router.push('/consent')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
              isHighContrast
                ? 'text-zinc-300 hover:text-white'
                : 'text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.back}</span>
          </button>

          <button
            onClick={handleContinue}
            disabled={!hasInput || loading}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-md ${
              hasInput
                ? isHighContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95 shadow-yellow-400/30'
                  : 'bg-[#00685f] hover:bg-[#005049] text-white active:scale-95 shadow-[#00685f]/30'
                : isHighContrast
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                : 'bg-[#e2e8f8] text-[#8c9ba5] cursor-not-allowed'
            }`}
          >
            <span>{loading ? '...' : t.continue}</span>
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

    </div>
  );
}
