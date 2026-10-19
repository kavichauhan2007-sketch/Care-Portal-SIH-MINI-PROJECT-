/**
 * voiceGuide.ts
 * Sequential high-speed voice guidance & dictation parser for CarePortal patient-kiosk.
 * Designed for illiterate users: system SPEAKS → waits until done → instantly LISTENS.
 * Allows filling details (phone, OTP, name, age, gender) and giving instructions via voice.
 */

// ─── Language map ────────────────────────────────────────────────────────────
export const LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
};

function getLangCode(code: string): string {
  return LANG_MAP[code] || 'en-IN';
}

// ─── TTS: speak ──────────────────────────────────────────────────────────────
/**
 * Speak text aloud via Web Speech Synthesis with natural fast pacing.
 * Returns a cancel function.
 */
export function speak(
  text: string,
  lang: string,
  onEnd?: () => void,
  rate = 1.02
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLangCode(lang);
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  let ended = false;
  const finish = () => {
    if (!ended) {
      ended = true;
      onEnd?.();
    }
  };

  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
    finish();
  };
}

// ─── STT: listen ─────────────────────────────────────────────────────────────
/**
 * Fast Web Speech Recognition with immediate dispatch, auto-retry on silence,
 * and 5-second silence auto-stop so listening cleanly pauses if patient doesn't speak.
 */
export function startListening(
  lang: string,
  onResult: (transcript: string, isFinal?: boolean) => void,
  onStop?: () => void,
  persistent = false,
  silenceTimeoutMs = 5000
): () => void {
  if (typeof window === 'undefined') {
    onStop?.();
    return () => {};
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onStop?.();
    return () => {};
  }

  let cancelled = false;
  let currentRec: any = null;
  let silenceTimer: any = null;

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (silenceTimeoutMs > 0 && !cancelled) {
      silenceTimer = setTimeout(() => {
        // Patient hasn't spoken for 5 seconds -> automatically stop listening
        cancelled = true;
        try {
          currentRec?.stop();
        } catch {}
        onStop?.();
      }, silenceTimeoutMs);
    }
  }

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function startRec() {
    if (cancelled) return;

    const rec = new SpeechRecognition();
    rec.lang = getLangCode(lang);
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    currentRec = rec;

    // Start 5-second countdown on init
    resetSilenceTimer();

    rec.onspeechstart = () => {
      resetSilenceTimer();
    };

    rec.onsoundstart = () => {
      resetSilenceTimer();
    };

    rec.onresult = (event: any) => {
      resetSilenceTimer();

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const res = (final || interim).trim();
      if (res) {
        if (final) {
          onResult(res.toLowerCase(), true);
        } else {
          onResult(res.toLowerCase(), false);
        }
      }
    };

    rec.onend = () => {
      if (cancelled) {
        clearSilenceTimer();
        onStop?.();
        return;
      }

      if (persistent) {
        // Only restart if persistent and not timed out
        setTimeout(() => {
          if (!cancelled) startRec();
        }, 200);
      } else {
        clearSilenceTimer();
        onStop?.();
      }
    };

    rec.onerror = (event: any) => {
      if (cancelled) {
        clearSilenceTimer();
        onStop?.();
        return;
      }
      if (persistent && event.error !== 'not-allowed') {
        setTimeout(() => {
          if (!cancelled) startRec();
        }, 300);
      } else {
        clearSilenceTimer();
        onStop?.();
      }
    };

    try {
      rec.start();
    } catch (e) {
      setTimeout(() => {
        if (!cancelled) startRec();
      }, 300);
    }
  }

  startRec();

  return () => {
    cancelled = true;
    clearSilenceTimer();
    try { currentRec?.stop(); } catch {}
  };
}

// ─── Helper: speak then listen ────────────────────────────────────────────────
/**
 * Speak text, then automatically start listening with 5-second silence auto-stop.
 */
export function speakThenListen(
  text: string,
  lang: string,
  onResult: (transcript: string, isFinal?: boolean) => void,
  onListeningStart?: () => void,
  onListeningStop?: () => void,
  persistent = false,
  silenceTimeoutMs = 5000
): () => void {
  let stopListenFn: (() => void) | null = null;
  let cancelled = false;

  const stopSpeak = speak(text, lang, () => {
    if (cancelled) return;
    onListeningStart?.();
    setTimeout(() => {
      if (!cancelled) {
        stopListenFn = startListening(
          lang, 
          onResult, 
          () => {
            onListeningStop?.();
          }, 
          persistent, 
          silenceTimeoutMs
        );
      }
    }, 80);
  });

  return () => {
    cancelled = true;
    stopSpeak();
    stopListenFn?.();
  };
}

// ─── Number & Detail Parsing Utilities ────────────────────────────────────────

const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0', o: '0', oh: '0', शून्य: '0', सिफर: '0',
  one: '1', won: '1', एक: '1',
  two: '2', to: '2', too: '2', दो: '2',
  three: '3', teen: '3', तीन: '3',
  four: '4', for: '4', चार: '4',
  five: '5', fivey: '5', पाँच: '5', पांच: '5',
  six: '6', siks: '6', छह: '6', छे: '6',
  seven: '7', सात: '7',
  eight: '8', ate: '8', आठ: '8',
  nine: '9', नौ: '9', नो: '9',
};

/**
 * Converts spoken words ("nine eight seven...", "नौ आठ सात...") or digits into numeric string.
 */
export function extractDigits(transcript: string): string {
  if (!transcript) return '';
  
  // Replace words with digits
  let cleaned = transcript.toLowerCase();
  for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
  }
  
  // Extract all digits joined together
  const matches = cleaned.match(/\d+/g);
  return matches ? matches.join('') : '';
}

/**
 * Extracts age number from transcript e.g. "35 years", "age is 42", "पैंतालीस साल", "35"
 */
export function extractAge(transcript: string): string {
  const digits = extractDigits(transcript);
  if (digits) {
    const num = parseInt(digits, 10);
    if (num > 0 && num <= 120) return num.toString();
  }
  return '';
}

/**
 * Extracts gender from transcript
 */
export function extractGender(transcript: string): 'male' | 'female' | 'other' | null {
  const t = transcript.toLowerCase();
  if (t.includes('female') || t.includes('woman') || t.includes('lady') || t.includes('महिला') || t.includes('औरत') || t.includes('स्त्री')) {
    return 'female';
  }
  if (t.includes('male') || t.includes('man') || t.includes('boy') || t.includes('पुरुष') || t.includes('आदमी') || t.includes('मर्दाना')) {
    return 'male';
  }
  if (t.includes('other') || t.includes('अन्य')) {
    return 'other';
  }
  return null;
}

/**
 * Extracts candidate name from dictation (cleans prefixes like "my name is", "नाम है")
 */
export function extractName(transcript: string): string {
  let cleaned = transcript
    .replace(/^(my name is|i am|name is|this is|मेरा नाम|नाम है|नाम)\s+/i, '')
    .replace(/(is my name|मेरा नाम है)$/i, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .trim();
  // Capitalize words
  if (cleaned.length > 1) {
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return cleaned;
}

/**
 * Detects emergency red flag keywords from speech transcript
 */
export function detectRedFlags(transcript: string): string[] {
  const t = transcript.toLowerCase();
  const flags: string[] = [];

  if (t.includes('chest pain') || t.includes('heart') || t.includes('छाती') || t.includes('सीना') || t.includes('dil') || t.includes('attack')) {
    flags.push('Severe Chest Pain / Cardiac Distress');
  }
  if (t.includes('breath') || t.includes('saans') || t.includes('सांस') || t.includes('suffocation') || t.includes('asthma')) {
    flags.push('Acute Shortness of Breath / Dyspnea');
  }
  if (t.includes('faint') || t.includes('unconscious') || t.includes('chakkar') || t.includes('चक्कर') || t.includes('बेहोश') || t.includes('dizzy')) {
    flags.push('Loss of Consciousness / Syncope');
  }
  if (t.includes('bleed') || t.includes('blood') || t.includes('खून') || t.includes('रक्त') || t.includes('injury') || t.includes('chot')) {
    flags.push('Severe Bleeding / Acute Trauma');
  }
  if (t.includes('seizure') || t.includes('fit') || t.includes('stroke') || t.includes('दौरा') || t.includes('lakwa') || t.includes('paralysis')) {
    flags.push('Seizure / Sudden Neurological Weakness');
  }
  if (t.includes('high fever') || t.includes('bukhar') || t.includes('तेज बुखार')) {
    flags.push('High Grade Febrile Episode');
  }

  return flags;
}

// ─── Voice scripts (per page) ─────────────────────────────────────────────────
export const VOICE_SCRIPTS = {
  welcome: {
    en: 'Welcome to CarePortal. Say "start" or tap the Start button to begin your visit.',
    hi: 'केयरपोर्टल में आपका स्वागत है। शुरू करने के लिए "शुरू" बोलें या स्टार्ट बटन दबाएं।',
  },
  identity: {
    en: 'Please select an option or speak. Say "existing" for registered patient, "new" for new patient, or "ABHA" to login.',
    hi: 'कृपया विकल्प चुनें या बोलें। पुराने मरीज के लिए "पंजीकृत", नए मरीज के लिए "नया", या "आभा" बोलें।',
  },
  identityExistingModal: {
    en: 'Please speak your 10-digit mobile number, or say "verify".',
    hi: 'कृपया अपना १० अंकों का मोबाइल नंबर बोलें, या "सत्यापित करें" बोलें।',
  },
  identityOtpModal: {
    en: 'Please speak the 6-digit OTP code received on your phone.',
    hi: 'कृपया अपने फोन पर आया हुआ ६ अंकों का ओटीपी कोड बोलें।',
  },
  // Sequential New Patient Steps
  identityNewName: {
    en: 'Please speak your full name.',
    hi: 'कृपया अपना पूरा नाम बोलें।',
  },
  identityNewAge: {
    en: 'Please speak your age in years.',
    hi: 'कृपया अपनी उम्र बताएं।',
  },
  identityNewPhone: {
    en: 'Please speak your 10-digit mobile number.',
    hi: 'कृपया अपना १० अंकों का मोबाइल नंबर बोलें।',
  },
  identityNewRedFlags: {
    en: 'Do you have any emergency symptoms like chest pain or breathing difficulty? Speak your symptoms, or say "none".',
    hi: 'क्या आपको छाती में दर्द या सांस लेने जैसी कोई इमरजेंसी तकलीफ है? लक्षण बोलें या "कोई नहीं" बोलें।',
  },
  identityNewModal: {
    en: 'Please speak your full name.',
    hi: 'कृपया अपना पूरा नाम बोलें।',
  },
  consent: {
    en: 'We collect your information to help your doctor. Say "agree" to give permission, or say "disagree".',
    hi: 'स्वास्थ्य जानकारी सहेजने के लिए अनुमति दें। "सहमत" बोलें या "असहमत" बोलें।',
  },
  symptoms: {
    en: 'Please speak your symptoms clearly. Tell us what problem you are facing.',
    hi: 'कृपया अपनी तकलीफ या लक्षण बोलकर बताएं।',
  },
  painLocation: {
    en: 'Tap on where it hurts, or say the body part: head, chest, stomach, back, shoulder, or knee. Say "next" to continue.',
    hi: 'जहाँ दर्द है उस अंग का नाम बोलें: सिर, छाती, पेट, पीठ, कंधा, या घुटना। आगे बढ़ने के लिए "आगे" बोलें।',
  },
  history: {
    en: 'Please answer the question by tapping or speaking your choice. Say "next" to proceed.',
    hi: 'कृपया सवाल का जवाब बोलें या टैप करें। आगे बढ़ने के लिए "आगे" बोलें।',
  },
  documents: {
    en: 'You can upload prescriptions or test reports. Say "upload" or say "skip" to continue.',
    hi: 'पर्ची या जांच रिपोर्ट अपलोड करें, या आगे बढ़ने के लिए "छोड़ें" या "आगे" बोलें।',
  },
  family: {
    en: 'Does your family have diabetes, heart disease, or blood pressure? Select or say the condition and relation. Say "done" when finished.',
    hi: 'क्या परिवार में किसी को शुगर, दिल की बीमारी या बीपी है? बोलें या चुनें। पूरा होने पर "आगे" बोलें।',
  },
  complaint: {
    en: 'Please tell us what brings you to the doctor today. When you are ready, tap the microphone to speak your symptoms.',
    hi: 'आज आप डॉक्टर के पास किस समस्या के लिए आए हैं? अपनी तकलीफ बताने के लिए माइक पर टैप करें और बोलें।',
  },
  review: {
    en: 'Please review your details. Say "submit" to complete check-in and get your token.',
    hi: 'अपनी जानकारी की जांच करें। टोकन प्राप्त करने के लिए "जमा करें" बोलें।',
  },
  complete: {
    en: 'Your check-in is complete! Please collect your printed token slip or wait for your SMS confirmation.',
    hi: 'आपका चेक-इन पूरा हो गया है! कृपया अपनी टोकन पर्ची लें अथवा एसएमएस पुष्टि की प्रतीक्षा करें।',
  },
};

// ─── Voice Guide Mode Global State ──────────────────────────────────────────
export function isVoiceGuideEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('careportal_voice_guide_enabled') === 'true';
}

export function setVoiceGuideEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('careportal_voice_guide_enabled', enabled ? 'true' : 'false');
}


// ─── Command matchers ─────────────────────────────────────────────────────────
export function matchesCommand(transcript: string, keywords: string[]): boolean {
  const t = transcript.toLowerCase();
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

export const CMD = {
  start: ['start', 'begin', 'शुरू', 'शुरु', 'प्रारंभ', 'chalu'],
  existing: ['existing', 'पंजीकृत', 'पुराना', 'old', 'purana', 'already'],
  new: ['new', 'नया', 'नई', 'register', 'पहली बार', 'first', 'registration'],
  abha: ['abha', 'आभा', 'ayushman'],
  agree: ['agree', 'yes', 'ok', 'हाँ', 'हां', 'सहमत', 'proceed', 'आगे', 'हा', 'theek', 'done'],
  disagree: ['disagree', 'no', 'नहीं', 'नही', 'not agree', 'असहमत', 'कोई नहीं', 'none'],
  skip: ['skip', 'आगे', 'next', 'continue', 'आगे बढ़ें', 'जारी', 'no upload', 'aage', 'chod', 'chodo'],
  submit: ['submit', 'जमा', 'जमा करें', 'complete', 'done', 'confirm', 'send', 'bhejo', 'verify', 'सत्यापित', 'register', 'पंजीकरण'],
  sendOtp: ['send otp', 'otp bhejo', 'ओटीपी', 'otp', 'send code', 'ओटीपी भेजें'],
  back: ['back', 'पीछे', 'go back', 'previous', 'peeche'],
  head: ['head', 'सिर', 'sir', 'headache'],
  chest: ['chest', 'छाती', 'seena'],
  stomach: ['stomach', 'abdomen', 'पेट', 'belly', 'pet'],
  backPain: ['back pain', 'lower back', 'पीठ', 'पीठ दर्द', 'peeth'],
  knee: ['knee', 'घुटना', 'ghutna'],
  shoulder: ['shoulder', 'कंधा', 'kandha'],
  wake: ['hi', 'hello', 'hey', 'namaste', 'नमस्ते', 'हाय', 'हेल्लो', 'सुनो', 'careportal', 'sun'],
  emergency: ['emergency', 'इमरजेंसी', 'urgent', 'chest pain', 'severe', 'गंभीर', 'खतरा', 'hospital'],
};
