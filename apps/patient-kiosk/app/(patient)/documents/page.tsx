'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { speakThenListen, VOICE_SCRIPTS, matchesCommand, CMD, isVoiceGuideEnabled } from '@/lib/voiceGuide';
import { 
  ScanLine, 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  FileText, 
  FileCheck, 
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
  RefreshCw,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function DocumentsPage() {
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

  // Scan & Upload state
  // 'idle' | 'scanning' | 'scanned' | 'confirmed'
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'scanned' | 'confirmed'>('idle');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recent uploads state
  const [recentUploads, setRecentUploads] = useState<any[]>([
    { id: '1', name: 'Dr. Smith Prescription.pdf', time: 'Yesterday, 2:30 PM', type: 'prescription' },
    { id: '2', name: 'Q3 Blood Panel Results.jpg', time: 'Oct 12, 2023', type: 'lab' },
  ]);

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
    const script = VOICE_SCRIPTS.documents[langCode === 'hi' ? 'hi' : 'en'];
    setVoiceMode('speaking');
    const stop = speakThenListen(
      script,
      langCode,
      (transcript) => {
        setVoiceMode('idle');
        if (matchesCommand(transcript, CMD.skip) || matchesCommand(transcript, CMD.agree)) {
          handleSkipOrContinue();
        } else if (transcript.includes('upload') || transcript.includes('scan') || transcript.includes('अपलोड')) {
          handleTriggerUpload();
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

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        triggerScanProcess();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerScanProcess = () => {
    setScanState('scanning');
    
    // Simulate OCR AI Scanning
    setTimeout(() => {
      setScanState('scanned');
    }, 2800);
  };

  const resetUpload = () => {
    setScanState('idle');
    setUploadedImage(null);
  };

  const finishScan = () => {
    setScanState('confirmed');
  };

  const handleConfirmAndSave = async () => {
    stopVoiceRef.current?.();
    setLoading(true);
    try {
      const patientId = typeof window !== 'undefined' ? localStorage.getItem('careportal_patient_id') : null;
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('careportal_session_id') : null;

      // Add to recent list
      const newDoc = {
        id: Date.now().toString(),
        name: 'CBC_Lab_Report_Scan.pdf',
        time: 'Just now',
        type: 'lab',
      };
      setRecentUploads([newDoc, ...recentUploads]);

      if (sessionId) {
        // Update session progress
        await supabase
          .from('patient_sessions')
          .update({
            documents_uploaded: recentUploads.length + 1,
            current_step: 'family',
            progress: 85,
          })
          .eq('id', sessionId);
      }

      toast({
        title: langCode === 'hi' ? 'दस्तावेज़ सहेजा गया' : 'Document Saved',
        description: langCode === 'hi' ? 'परिवार इतिहास पृष्ठ पर जा रहे हैं...' : 'Proceeding to family history...',
      });

      router.push('/family');
    } catch (error) {
      console.warn('Doc save fallback:', error);
      router.push('/family');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipOrContinue = async () => {
    stopVoiceRef.current?.();
    router.push('/family');
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = langCode === 'hi'
      ? 'दस्तावेज़ अपलोड करें। अपने पिछले पर्चे, लैब रिपोर्ट या डिस्चार्ज सारांश को अपने मेडिकल रिकॉर्ड में सुरक्षित रूप से जोड़ें।'
      : 'Upload Documents. Securely add previous prescriptions, lab reports, or discharge summaries to your medical record.';
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
      title: 'Upload Documents',
      subtitle: 'Securely add previous prescriptions, lab reports, or discharge summaries to your medical record.',
      scanCardTitle: 'Scan Document',
      scanCardSub: 'Point your camera at the document or upload a clear photo.',
      tapCapture: 'Tap to Capture or Upload',
      tapCaptureSub: 'Ensure the document is well-lit and all text is clearly visible within the frame.',
      readingDoc: 'Reading document... extracting data...',
      scanComplete: 'Scan complete. Review extracted data below.',
      cancel: 'CANCEL',
      useScan: 'USE THIS SCAN',
      extractedInfo: 'Extracted Information',
      docType: 'DOCUMENT TYPE',
      docTypeVal: 'Lab Report - Complete Blood Count',
      dateExtracted: 'DATE EXTRACTED',
      dateVal: 'October 24, 2023',
      keyFindings: 'KEY FINDINGS (OCR PREVIEW)',
      confirmSave: 'CONFIRM & SAVE TO RECORD',
      securityTitle: 'Security & Privacy',
      encTitle: 'End-to-End Encryption',
      encDesc: 'All uploaded documents are encrypted in transit and at rest. Only authorized clinical staff can access them.',
      hipaaTitle: 'HIPAA & ABDM Compliant',
      hipaaDesc: 'This system meets all national guidelines for secure handling of Protected Health Information (PHI).',
      recentTitle: 'Recent Uploads',
      skip: 'Skip for now',
      access: 'ACCESSIBILITY',
      exit: 'EXIT KIOSK',
      guideTitle: 'Document Upload Guide',
      guideText: 'You can upload physical medical papers, digital PDFs, or take a clear photo with the kiosk camera.',
    },
    hi: {
      help: 'सहायता',
      title: 'दस्तावेज़ अपलोड करें',
      subtitle: 'अपने पिछले पर्चे, लैब रिपोर्ट या डिस्चार्ज सारांश को अपने मेडिकल रिकॉर्ड में सुरक्षित रूप से जोड़ें।',
      scanCardTitle: 'दस्तावेज़ स्कैन करें',
      scanCardSub: 'दस्तावेज़ पर अपना कैमरा लाएं या साफ़ फ़ोटो अपलोड करें।',
      tapCapture: 'फ़ोटो लेने या अपलोड करने के लिए टैप करें',
      tapCaptureSub: 'सुनिश्चित करें कि दस्तावेज़ पर पर्याप्त रोशनी है और सभी अक्षर साफ़ दिखाई दे रहे हैं।',
      readingDoc: 'दस्तावेज़ पढ़ा जा रहा है... डेटा निकाला जा रहा है...',
      scanComplete: 'स्कैन पूरा हुआ। नीचे निकाले गए डेटा की समीक्षा करें।',
      cancel: 'रद्द करें',
      useScan: 'इस स्कैन का उपयोग करें',
      extractedInfo: 'निकाली गई जानकारी (OCR Data)',
      docType: 'दस्तावेज़ प्रकार',
      docTypeVal: 'लैब रिपोर्ट - कम्प्लीट ब्लड काउंट (CBC)',
      dateExtracted: 'निकाली गई तिथि',
      dateVal: '24 अक्टूबर, 2023',
      keyFindings: 'प्रमुख निष्कर्ष (OCR पूर्वावलोकन)',
      confirmSave: 'पुष्टि करें और रिकॉर्ड में सहेजें',
      securityTitle: 'सुरक्षा और गोपनीयता',
      encTitle: 'एंड-टू-एंड एन्क्रिप्शन',
      encDesc: 'सभी दस्तावेज़ ट्रांसमिशन और स्टोरेज में सुरक्षित रूप से एन्क्रिप्ट किए जाते हैं। केवल डॉक्टर ही इसे देख सकते हैं।',
      hipaaTitle: 'ABDM एवं राष्ट्रीय सुरक्षा अनुरूप',
      hipaaDesc: 'यह प्रणाली स्वास्थ्य डेटा संरक्षण के सभी राष्ट्रीय दिशानिर्देशों का पालन करती है।',
      recentTitle: 'हाल ही में अपलोड किए गए',
      skip: 'अभी छोड़ें',
      access: 'सुलभता',
      exit: 'कियोस्क छोड़ें',
      guideTitle: 'दस्तावेज़ अपलोड सहायता',
      guideText: 'आप किसी भी पर्चे, एक्स-रे रिपोर्ट या लैब टेस्ट की साफ़ तस्वीर अपलोड कर सकते हैं।',
    }
  }[langCode === 'hi' ? 'hi' : 'en'];

  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between select-none relative overflow-x-hidden font-sans transition-colors duration-300 ${
      isHighContrast ? 'bg-black text-white' : 'bg-[#f9f9ff] text-[#151c27]'
    }`}>
      
      {/* Inline Laser Scan CSS */}
      <style jsx global>{`
        @keyframes laserScan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-laser-scan {
          animation: laserScan 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative Background Blur Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00685f]/10 rounded-full blur-[100px] -z-10 -mr-28 -mt-20 pointer-events-none" />
      <div className="absolute bottom-16 left-0 w-80 h-80 bg-[#0058be]/10 rounded-full blur-[90px] -z-10 -ml-24 -mb-24 pointer-events-none" />

      {/* Hidden File Input for Native File Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

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
      <main className="flex-1 pt-24 pb-28 w-full max-w-[1360px] mx-auto px-6 md:px-10 flex flex-col">
        
        {/* Title & Subtitle Section */}
        <div className="flex flex-col gap-1 mb-8 max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-extrabold tracking-tight ${
              isHighContrast ? 'text-yellow-400' : 'text-[#151c27]'
            } ${fontLevel === 1 ? 'text-4xl md:text-5xl' : fontLevel === 2 ? 'text-5xl md:text-6xl' : 'text-3xl sm:text-4xl md:text-[44px]'}`}
          >
            {t.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`font-medium text-sm sm:text-base md:text-lg leading-relaxed ${
              isHighContrast ? 'text-zinc-300' : 'text-[#475569]'
            }`}
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column (8 Columns): Scanner & OCR Results */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            {/* Scan Document Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`rounded-[24px] p-6 sm:p-7 shadow-sm border relative overflow-hidden flex flex-col gap-4 ${
                isHighContrast
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              {/* Subtle top corner gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00685f]/5 to-transparent pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#00685f] text-white flex items-center justify-center shadow-sm">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-lg sm:text-xl ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                      {t.scanCardTitle}
                    </h2>
                    <p className={`text-xs sm:text-sm ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                      {t.scanCardSub}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Upload / Scan View Area */}
              <div 
                onClick={() => {
                  if (scanState === 'idle') {
                    handleTriggerUpload();
                  }
                }}
                className={`w-full h-[360px] sm:h-[390px] relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col items-center justify-center border-2 border-dashed ${
                  scanState === 'idle'
                    ? isHighContrast
                      ? 'bg-zinc-900 border-zinc-700 hover:border-yellow-400'
                      : 'bg-[#f0f3ff] border-[#bcc9c6]/60 hover:border-[#00685f] hover:shadow-md'
                    : isHighContrast
                    ? 'bg-zinc-900 border-zinc-700'
                    : 'bg-[#f0f3ff] border-[#bcc9c6]'
                }`}
              >
                {/* Dotted Grid Background */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:20px_20px] pointer-events-none" />

                {/* IDLE STATE */}
                {scanState === 'idle' && (
                  <div className="relative z-10 flex flex-col items-center text-center p-6 transition-transform duration-300 hover:scale-105">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm border-2 border-dashed ${
                      isHighContrast
                        ? 'bg-zinc-800 border-yellow-400 text-yellow-400'
                        : 'bg-white border-[#00685f]/40 text-[#00685f]'
                    }`}>
                      <Camera className="w-8 h-8" />
                    </div>
                    <p className={`font-bold text-lg sm:text-xl mb-1 ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                      {t.tapCapture}
                    </p>
                    <p className={`text-xs sm:text-sm max-w-sm leading-relaxed ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                      {t.tapCaptureSub}
                    </p>
                  </div>
                )}

                {/* SCANNING & SCANNED STATE */}
                {(scanState === 'scanning' || scanState === 'scanned') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-20 bg-slate-900/60 backdrop-blur-xs">
                    <div className="w-full max-w-sm h-56 sm:h-64 border-2 border-[#00685f] rounded-2xl relative overflow-hidden flex items-center justify-center bg-zinc-900 shadow-2xl">
                      
                      {/* Document Preview Image */}
                      {uploadedImage ? (
                        <img 
                          src={uploadedImage} 
                          alt="Scanned Document" 
                          className="w-full h-full object-cover opacity-60"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-4 text-center">
                          <FileText className="w-12 h-12 mb-2 text-[#00685f]/60" />
                          <span>SIMULATED MEDICAL REPORT PREVIEW</span>
                        </div>
                      )}

                      {/* Laser Beam Scanner Line */}
                      {scanState === 'scanning' && (
                        <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-[#00685f]/50 to-transparent animate-laser-scan border-b border-[#2170e4] pointer-events-none" />
                      )}

                      {/* Corner Target Markers */}
                      <div className="absolute top-2 left-2 w-5 h-5 border-t-3 border-l-3 border-[#00685f]" />
                      <div className="absolute top-2 right-2 w-5 h-5 border-t-3 border-r-3 border-[#00685f]" />
                      <div className="absolute bottom-2 left-2 w-5 h-5 border-b-3 border-l-3 border-[#00685f]" />
                      <div className="absolute bottom-2 right-2 w-5 h-5 border-b-3 border-r-3 border-[#00685f]" />
                    </div>

                    <p className={`font-bold text-xs sm:text-sm mt-4 uppercase tracking-wider ${
                      scanState === 'scanning' ? 'text-[#89f5e7] animate-pulse' : 'text-green-400'
                    }`}>
                      {scanState === 'scanning' ? t.readingDoc : t.scanComplete}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Scanned State */}
              {scanState === 'scanned' && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 w-full justify-end z-10 pt-2"
                >
                  <button
                    onClick={resetUpload}
                    className="px-6 py-3 rounded-xl bg-white border border-[#cbd5e1] text-[#151c27] font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={finishScan}
                    className="px-6 py-3 rounded-xl bg-[#00685f] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#005049] transition-all"
                  >
                    {t.useScan}
                  </button>
                </motion.div>
              )}
            </motion.div>

            {/* Extracted Information OCR Card (Shown after finishing scan) */}
            {(scanState === 'confirmed' || scanState === 'scanned') && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[24px] p-6 sm:p-7 shadow-sm border relative overflow-hidden flex flex-col gap-4 ${
                  isHighContrast
                    ? 'bg-zinc-950 border-zinc-800'
                    : 'bg-white border-[#e2e8f0]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-6 h-6 text-[#00685f]" />
                  <h3 className={`font-bold text-lg sm:text-xl ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                    {t.extractedInfo}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${isHighContrast ? 'bg-zinc-900' : 'bg-[#f0f3ff]'}`}>
                    <p className="text-[11px] font-bold tracking-wider text-[#64748b] uppercase mb-1">
                      {t.docType}
                    </p>
                    <p className={`font-semibold text-sm sm:text-base ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                      {t.docTypeVal}
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl ${isHighContrast ? 'bg-zinc-900' : 'bg-[#f0f3ff]'}`}>
                    <p className="text-[11px] font-bold tracking-wider text-[#64748b] uppercase mb-1">
                      {t.dateExtracted}
                    </p>
                    <p className={`font-semibold text-sm sm:text-base ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                      {t.dateVal}
                    </p>
                  </div>
                </div>

                {/* Key Findings Table */}
                <div className={`p-5 rounded-2xl flex flex-col gap-3 border ${
                  isHighContrast ? 'bg-zinc-900 border-zinc-700' : 'bg-[#f0f3ff] border-[#bcc9c6]/40'
                }`}>
                  <p className="text-[11px] font-bold tracking-wider text-[#64748b] uppercase">
                    {t.keyFindings}
                  </p>
                  
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between border-b border-[#cbd5e1]/40 pb-2">
                      <span className={isHighContrast ? 'text-zinc-300' : 'text-[#334155]'}>Hemoglobin (Hb)</span>
                      <span className="font-mono font-bold text-[#00685f]">14.2 g/dL</span>
                    </div>
                    <div className="flex justify-between border-b border-[#cbd5e1]/40 pb-2">
                      <span className={isHighContrast ? 'text-zinc-300' : 'text-[#334155]'}>White Blood Cells (WBC)</span>
                      <span className="font-mono font-bold text-[#00685f]">6.8 x10^3/uL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isHighContrast ? 'text-zinc-300' : 'text-[#334155]'}>Platelet Count</span>
                      <span className="font-mono font-bold text-[#00685f]">245 x10^3/uL</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmAndSave}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-sm sm:text-base shadow-md transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 ${
                    isHighContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-[#0058be] hover:bg-[#0048a0] text-white shadow-blue-500/20'
                  }`}
                >
                  <FileCheck className="w-5 h-5" />
                  <span>{loading ? '...' : t.confirmSave}</span>
                </button>
              </motion.div>
            )}

          </div>

          {/* Right Column (4 Columns): Security & Privacy + Recent Uploads */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            
            {/* Security & Privacy Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-[24px] p-6 shadow-sm border flex flex-col gap-4 ${
                isHighContrast
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <h3 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                {t.securityTitle}
              </h3>

              <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                isHighContrast ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f0f3ff] border-[#bcc9c6]/30'
              }`}>
                <Lock className="w-5 h-5 text-[#0058be] shrink-0 mt-0.5" />
                <div>
                  <p className={`font-bold text-xs sm:text-sm mb-1 ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                    {t.encTitle}
                  </p>
                  <p className={`text-xs leading-relaxed ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                    {t.encDesc}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                isHighContrast ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f0f3ff] border-[#bcc9c6]/30'
              }`}>
                <ShieldCheck className="w-5 h-5 text-[#0058be] shrink-0 mt-0.5" />
                <div>
                  <p className={`font-bold text-xs sm:text-sm mb-1 ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                    {t.hipaaTitle}
                  </p>
                  <p className={`text-xs leading-relaxed ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                    {t.hipaaDesc}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Recent Uploads Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`rounded-[24px] p-6 shadow-sm border flex flex-col gap-4 ${
                isHighContrast
                  ? 'bg-zinc-950 border-zinc-800'
                  : 'bg-white border-[#e2e8f0]'
              }`}
            >
              <h3 className={`font-bold text-base sm:text-lg ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                {t.recentTitle}
              </h3>

              <div className="flex flex-col divide-y divide-[#e2e8f0]">
                {recentUploads.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] text-[#00685f] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-xs sm:text-sm truncate ${isHighContrast ? 'text-white' : 'text-[#151c27]'}`}>
                        {item.name}
                      </p>
                      <p className={`text-[11px] ${isHighContrast ? 'text-zinc-400' : 'text-[#64748b]'}`}>
                        {item.time}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#00685f] shrink-0" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Skip or Proceed Navigation */}
            <button
              onClick={handleSkipOrContinue}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                isHighContrast
                  ? 'border-yellow-400 text-yellow-400 hover:bg-zinc-900'
                  : 'border-[#cbd5e1] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              <span>{t.skip}</span>
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
