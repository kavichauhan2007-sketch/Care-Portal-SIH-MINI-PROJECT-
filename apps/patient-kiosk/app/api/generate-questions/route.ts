import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface for question option
export interface KioskOption {
  id: string;
  label: string;
  labelHi: string;
  sublabel: string;
  sublabelHi: string;
  icon?: string;
}

// Interface for clinical history question
export interface ClinicalQuestion {
  id: string;
  question: string;
  questionHi: string;
  description: string;
  descriptionHi: string;
  type: 'single' | 'multiple' | 'text' | 'scale';
  category: string;
  options?: KioskOption[];
  redFlag?: boolean;
}

// Comprehensive Bypass & Fallback Question Banks
const GENERAL_BYPASS_QUESTIONS: ClinicalQuestion[] = [
  {
    id: 'q_onset_timeline',
    question: 'When did your main problem start?',
    questionHi: 'आपकी मुख्य समस्या कब शुरू हुई?',
    description: 'Please select the timeframe that best describes when you first noticed these symptoms.',
    descriptionHi: 'कृपया वह समय-सीमा चुनें जब आपने पहली बार इन लक्षणों को देखा।',
    type: 'single',
    category: 'timeline',
    options: [
      {
        id: 'today',
        label: 'Today',
        labelHi: 'आज (Today)',
        sublabel: 'Within the last 24 hours',
        sublabelHi: 'पिछले 24 घंटों के भीतर',
        icon: 'today',
      },
      {
        id: '1-3_days',
        label: '1-3 days ago',
        labelHi: '1-3 दिन पहले',
        sublabel: 'Recent onset',
        sublabelHi: 'हाल ही में शुरू हुआ',
        icon: 'calendar_view_day',
      },
      {
        id: '1_week',
        label: '1 week ago',
        labelHi: '1 सप्ताह पहले',
        sublabel: 'About 7 days',
        sublabelHi: 'लगभग 7 दिन',
        icon: 'date_range',
      },
      {
        id: '1_month_plus',
        label: 'More than a month',
        labelHi: 'एक महीने से अधिक',
        sublabel: 'Chronic symptom',
        sublabelHi: 'लगातार रहने वाला लक्षण',
        icon: 'calendar_month',
      },
      {
        id: '1_year_plus',
        label: 'More than a year',
        labelHi: 'एक वर्ष से अधिक',
        sublabel: 'Long-term condition',
        sublabelHi: 'दीर्घकालिक स्थिति',
        icon: 'history',
      },
    ],
  },
  {
    id: 'q_symptom_progression',
    question: 'How has the problem progressed since it began?',
    questionHi: 'शुरुआत के बाद से समस्या कैसे बढ़ी है?',
    description: 'Tell us whether the symptoms are getting worse, improving, or remaining steady.',
    descriptionHi: 'हमें बताएं कि क्या लक्षण बिगड़ रहे हैं, सुधर रहे हैं या स्थिर हैं।',
    type: 'single',
    category: 'progression',
    options: [
      {
        id: 'worsening',
        label: 'Getting Worse',
        labelHi: 'लगातार बिगड़ रहा है',
        sublabel: 'Increasing in frequency or severity',
        sublabelHi: 'तीव्रता या बारंबारता में वृद्धि',
        icon: 'trending_up',
      },
      {
        id: 'staying_same',
        label: 'Staying the Same',
        labelHi: 'वैसा ही बना हुआ है',
        sublabel: 'Constant unchanged discomfort',
        sublabelHi: 'बिना बदलाव के निरंतर असुविधा',
        icon: 'trending_flat',
      },
      {
        id: 'fluctuating',
        label: 'Comes and Goes',
        labelHi: 'आता-जाता रहता है',
        sublabel: 'Intermittent episodes',
        sublabelHi: 'रुक-रुक कर होने वाले दौरे',
        icon: 'swap_horiz',
      },
      {
        id: 'improving',
        label: 'Improving Gradually',
        labelHi: 'धीरे-धीरे सुधर रहा है',
        sublabel: 'Less intense than before',
        sublabelHi: 'पहले से कम गंभीर',
        icon: 'trending_down',
      },
    ],
  },
  {
    id: 'q_aggravating_factors',
    question: 'What makes your symptoms worse?',
    questionHi: 'किन गतिविधियों से आपके लक्षण बढ़ जाते हैं?',
    description: 'Select all factors that trigger or aggravate your discomfort.',
    descriptionHi: 'उन सभी कारणों को चुनें जो आपकी असुविधा को बढ़ाते हैं।',
    type: 'multiple',
    category: 'aggravating',
    options: [
      {
        id: 'physical_activity',
        label: 'Physical Activity / Movement',
        labelHi: 'शारीरिक गतिविधि या चलना-फिरना',
        sublabel: 'Walking, lifting, or exercising',
        sublabelHi: 'चलना, वजन उठाना या व्यायाम',
        icon: 'directions_walk',
      },
      {
        id: 'bending_sitting',
        label: 'Sitting or Bending Down',
        labelHi: 'बैठना या आगे झुकना',
        sublabel: 'Postural strain or pressure',
        sublabelHi: 'बैठने का तनाव या दबाव',
        icon: 'airline_seat_recline_normal',
      },
      {
        id: 'eating_meals',
        label: 'Eating or Empty Stomach',
        labelHi: 'खाना खाने के बाद या भूखे पेट',
        sublabel: 'Digestive triggers',
        sublabelHi: 'पाचन संबंधी कारण',
        icon: 'restaurant',
      },
      {
        id: 'stress_fatigue',
        label: 'Stress or Lack of Sleep',
        labelHi: 'तनाव या नींद की कमी',
        sublabel: 'Mental exhaustion & tension',
        sublabelHi: 'मानसिक तनाव और थकान',
        icon: 'psychology',
      },
      {
        id: 'weather_cold',
        label: 'Cold or Weather Changes',
        labelHi: 'ठंड या मौसम का बदलाव',
        sublabel: 'Exposure to cold air / AC',
        sublabelHi: 'ठंडी हवा या एसी का संपर्क',
        icon: 'ac_unit',
      },
      {
        id: 'none_specific',
        label: 'Nothing Specific',
        labelHi: 'कोई विशिष्ट कारण नहीं',
        sublabel: 'Constant regardless of activity',
        sublabelHi: 'गतिविधि से अप्रभावित',
        icon: 'radio_button_unchecked',
      },
    ],
  },
  {
    id: 'q_relieving_factors',
    question: 'What brings you relief?',
    questionHi: 'किस चीज़ से आपको आराम मिलता है?',
    description: 'Select any remedies or positions that help soothe the discomfort.',
    descriptionHi: 'उन उपायों या स्थितियों को चुनें जो असुविधा को कम करती हैं।',
    type: 'multiple',
    category: 'relieving',
    options: [
      {
        id: 'rest_lying',
        label: 'Rest / Lying Down',
        labelHi: 'आराम करना या लेटना',
        sublabel: 'Stopping physical effort',
        sublabelHi: 'शारीरिक श्रम रोकना',
        icon: 'bed',
      },
      {
        id: 'pain_meds',
        label: 'Pain Relievers / Medications',
        labelHi: 'दर्द निवारक दवाएं',
        sublabel: 'Tablets, ointments, or syrups',
        sublabelHi: 'गोलियां या मलहम',
        icon: 'medication',
      },
      {
        id: 'heat_cold_pack',
        label: 'Hot or Cold Compress',
        labelHi: 'गर्म या ठंडी सिकाई',
        sublabel: 'Heating pad or ice bag',
        sublabelHi: 'हीटिंग पैड या बर्फ',
        icon: 'thermostat',
      },
      {
        id: 'hydration_food',
        label: 'Water, Fluids or Eating',
        labelHi: 'पानी, तरल पदार्थ या भोजन',
        sublabel: 'Drinking or light meal',
        sublabelHi: 'पानी पीना या हल्का भोजन',
        icon: 'local_drink',
      },
      {
        id: 'nothing_helps',
        label: 'Nothing Brings Relief',
        labelHi: 'किसी भी चीज़ से आराम नहीं मिलता',
        sublabel: 'Persistent discomfort',
        sublabelHi: 'लगातार बना रहने वाला दर्द',
        icon: 'block',
      },
    ],
  },
  {
    id: 'q_past_medical',
    question: 'Do you have any existing medical conditions?',
    questionHi: 'क्या आपको पहले से कोई बीमारी या समस्या है?',
    description: 'Please indicate any diagnosed long-term health conditions.',
    descriptionHi: 'कृपया किसी भी निदान की गई पुरानी बीमारी का चयन करें।',
    type: 'multiple',
    category: 'past_medical',
    options: [
      {
        id: 'diabetes',
        label: 'Diabetes (High Blood Sugar)',
        labelHi: 'मधुमेह / डायबिटीज',
        sublabel: 'Type 1 or Type 2 Diabetes',
        sublabelHi: 'रक्त शर्करा की समस्या',
        icon: 'bloodtype',
      },
      {
        id: 'hypertension',
        label: 'Hypertension (High BP)',
        labelHi: 'उच्च रक्तचाप (High BP)',
        sublabel: 'Taking BP medications',
        sublabelHi: 'रक्तचाप की दवा ले रहे हैं',
        icon: 'favorite',
      },
      {
        id: 'heart_condition',
        label: 'Heart Disease / Cholesterol',
        labelHi: 'हृदय रोग / कोलेस्ट्रॉल',
        sublabel: 'Coronary artery disease, stent, etc.',
        sublabelHi: 'हृदय या धमनी संबंधी समस्या',
        icon: 'monitor_heart',
      },
      {
        id: 'asthma_copd',
        label: 'Asthma / Respiratory Issues',
        labelHi: 'अस्थमा / सांस की बीमारी',
        sublabel: 'Wheezing, inhaler use, allergies',
        sublabelHi: 'सांस फूलना या इनहेलर का उपयोग',
        icon: 'air',
      },
      {
        id: 'thyroid_arthritis',
        label: 'Thyroid or Arthritis / Joint Disease',
        labelHi: 'थायराइड या गठिया / जोड़ों का दर्द',
        sublabel: 'Joint stiffness or hormone condition',
        sublabelHi: 'जोड़ों में अकड़न या थायराइड',
        icon: 'accessibility_new',
      },
      {
        id: 'none_pmh',
        label: 'None / No Known Conditions',
        labelHi: 'कोई बीमारी नहीं',
        sublabel: 'Generally healthy medical history',
        sublabelHi: 'कोई ज्ञात पुरानी बीमारी नहीं',
        icon: 'check_circle',
      },
    ],
  },
  {
    id: 'q_current_medications',
    question: 'Are you currently taking any regular medications?',
    questionHi: 'क्या आप वर्तमान में कोई नियमित दवा ले रहे हैं?',
    description: 'This includes prescription pills, supplements, or Ayurvedic remedies.',
    descriptionHi: 'इसमें डॉक्टर द्वारा लिखी दवाएं, सप्लीमेंट्स या आयुर्वेदिक उपचार शामिल हैं।',
    type: 'single',
    category: 'medications',
    options: [
      {
        id: 'regular_daily',
        label: 'Yes, Daily Prescribed Medicines',
        labelHi: 'हाँ, रोजाना लिखी गई दवाएं',
        sublabel: 'For BP, sugar, thyroid, etc.',
        sublabelHi: 'बीपी, शुगर, थायराइड आदि के लिए',
        icon: 'vaccines',
      },
      {
        id: 'occasional_otc',
        label: 'Occasionally / Over-the-Counter Only',
        labelHi: 'कभी-कभार / केवल दर्द निवारक',
        sublabel: 'Vitamins, pain relievers when needed',
        sublabelHi: 'विटामिन या आवश्यकता पड़ने पर',
        icon: 'medication_liquid',
      },
      {
        id: 'no_medications',
        label: 'No Current Medications',
        labelHi: 'कोई दवा नहीं ले रहे',
        sublabel: 'Not taking any regular pills',
        sublabelHi: 'कोई नियमित गोली नहीं',
        icon: 'do_not_disturb',
      },
    ],
  },
  {
    id: 'q_allergies',
    question: 'Do you have any known drug or substance allergies?',
    questionHi: 'क्या आपको किसी दवा या खाद्य पदार्थ से एलर्जी है?',
    description: 'Help us prevent adverse drug reactions during your consultation.',
    descriptionHi: 'परामर्श के दौरान प्रतिकूल प्रतिक्रिया से बचने के लिए बताएं।',
    type: 'single',
    category: 'allergies',
    options: [
      {
        id: 'drug_allergy',
        label: 'Yes, Allergic to Certain Medicines',
        labelHi: 'हाँ, कुछ दवाओं से एलर्जी है',
        sublabel: 'Penicillin, Sulfa, Aspirin, NSAIDs, etc.',
        sublabelHi: 'पेनिसिलिन, सल्फा, एस्पिरिन आदि',
        icon: 'warning',
      },
      {
        id: 'food_env_allergy',
        label: 'Food or Environmental Allergies',
        labelHi: 'भोजन या धूल/पराग से एलर्जी',
        sublabel: 'Peanuts, eggs, pollen, dust',
        sublabelHi: 'खाद्य पदार्थ या धूल',
        icon: 'eco',
      },
      {
        id: 'no_allergies',
        label: 'No Known Allergies (NKDA)',
        labelHi: 'कोई ज्ञात एलर्जी नहीं है',
        sublabel: 'No previous adverse drug reactions',
        sublabelHi: 'दवाओं से कोई दुष्प्रभाव नहीं देखा गया',
        icon: 'verified_user',
      },
    ],
  },
  {
    id: 'q_additional_notes',
    question: 'Is there anything else you would like the doctor to know?',
    questionHi: 'क्या आप डॉक्टर को कोई अन्य महत्वपूर्ण बात बताना चाहते हैं?',
    description: 'You can mention any specific concerns, recent travel, or family circumstances.',
    descriptionHi: 'आप अपनी कोई विशेष चिंता या हालिया घटना साझा कर सकते हैं।',
    type: 'text',
    category: 'additional',
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      chiefComplaint = '',
      painLocations = [],
      painIntensity = 5,
      onset = 'gradually',
      character = '',
      bypass = false,
    } = body;

    // If explicit bypass requested, return bypass questions directly
    if (bypass) {
      return NextResponse.json({
        questions: GENERAL_BYPASS_QUESTIONS,
        isBypass: true,
        source: 'bypass_protocol',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ No GEMINI_API_KEY found, using standard bypass clinical questions.');
      return NextResponse.json({
        questions: GENERAL_BYPASS_QUESTIONS,
        isBypass: true,
        source: 'fallback_no_key',
      });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const targetModelName = process.env.AI_MODEL || 'gemini-1.5-flash-latest';
    const model = genAI.getGenerativeModel({
      model: targetModelName,
      generationConfig: {
        temperature: 0.2,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 2500,
      },
    });

    const locationList = Array.isArray(painLocations)
      ? painLocations.map((l: any) => (typeof l === 'string' ? l : l.body_part || l.id)).join(', ')
      : String(painLocations);

    const prompt = `You are an expert Clinical Intake & Anamnesis AI for an advanced hospital kiosk.
Patient Presentation:
- Chief Complaint / Symptoms: "${chiefComplaint || 'General discomfort'}"
- Pain Locations: "${locationList || 'Not specified'}"
- Pain Intensity: ${painIntensity} / 10
- Onset: ${onset}
- Pain Character: "${character || 'Not specified'}"

TASK:
Generate an optimal, highly structured sequence of 6 to 8 clinical anamnesis questions tailored specifically to this patient's symptoms and presentation.
Follow SOCRATES principles (Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving, Severity) and crucial medical safety checks.

CRITICAL REQUIREMENTS:
1. Question 1 MUST BE the timeline/onset question: "When did your main problem start?" with time options (Today, 1-3 days ago, 1 week ago, More than a month, More than a year).
2. Follow-up questions MUST be dynamically tailored to the chief complaint (e.g. if back pain, ask about radiation to legs/sciatica or lifting; if chest pain, ask about breathing/exertion/radiation; if fever/cough, ask about temperature/sputum; if abdominal, ask about meals/nausea).
3. Include structured past medical history and allergy checks.
4. The final question should be an open-ended text question for additional patient notes.
5. Provide both English ("question", "description", "label", "sublabel") AND accurate Hindi ("questionHi", "descriptionHi", "labelHi", "sublabelHi") translations for all fields!
6. Each option MUST have an intuitive Material Symbol icon name (e.g. "today", "calendar_view_day", "date_range", "directions_walk", "bed", "medication", "bloodtype", "favorite", "warning", "check_circle", "history", "trending_up").

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema with NO markdown wrappers or extra text:
{
  "questions": [
    {
      "id": "q_1",
      "question": "When did your main problem start?",
      "questionHi": "आपकी मुख्य समस्या कब शुरू हुई?",
      "description": "Please select the timeframe that best describes when you first noticed these symptoms.",
      "descriptionHi": "कृपया वह समय-सीमा चुनें जब आपने पहली बार इन लक्षणों को देखा।",
      "type": "single",
      "category": "timeline",
      "options": [
        {
          "id": "today",
          "label": "Today",
          "labelHi": "आज",
          "sublabel": "Within the last 24 hours",
          "sublabelHi": "पिछले 24 घंटों में",
          "icon": "today"
        }
      ]
    }
  ]
}`;

    // Execute generation with increased timeout and retry logic
    let result;
    let retryCount = 0;
    const maxRetries = 2;
    const timeoutMs = 15000; // Increased to 15 seconds

    while (retryCount <= maxRetries) {
      try {
        result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs)
          ),
        ]);
        break; // Success, exit retry loop
      } catch (timeoutError: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw timeoutError;
        }
        console.warn(`⚠️ Gemini timeout attempt ${retryCount}/${maxRetries}, retrying...`);
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!result) {
      throw new Error('Failed to get response from Gemini after retries');
    }

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON extracted from Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Invalid questions array in Gemini output');
    }

    return NextResponse.json({
      questions: parsed.questions,
      isBypass: false,
      source: 'gemini_realtime',
      aiSymptomContext: chiefComplaint || locationList,
    });
  } catch (error: any) {
    console.warn('⚠️ Gemini question generation error, applying bypass protocol:', error?.message);
    return NextResponse.json({
      questions: GENERAL_BYPASS_QUESTIONS,
      isBypass: true,
      source: 'bypass_error_fallback',
      errorMessage: error?.message || 'Unknown error',
    });
  }
}
