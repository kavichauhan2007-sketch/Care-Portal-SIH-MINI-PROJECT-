import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY is not set. AI features will use fallback responses.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Configure model with safety settings
const model = genAI ? genAI.getGenerativeModel({
  model: process.env.AI_MODEL || 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.3,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
}) : null;

// System prompt for clinical history taking
const CLINICAL_SYSTEM_PROMPT = `You are an AI clinical history assistant for a hospital patient intake system.

CRITICAL RULES:
1. You assist in collecting patient history - you DO NOT diagnose or provide medical advice
2. Ask only ONE question at a time
3. Questions must be clear, simple, and medically relevant
4. Be empathetic and professional
5. Extract structured information from patient responses
6. Identify missing critical information
7. Detect red flag symptoms that require immediate attention
8. Do NOT hallucinate symptoms or information
9. Do NOT make up medications or diagnoses
10. Response MUST be valid JSON

Your role: Ask appropriate follow-up questions based on the patient's chief complaint and previous answers.

Output Format: Return ONLY a valid JSON object with this structure:
{
  "nextQuestion": "The next question to ask",
  "questionType": "text|single_choice|multiple_choice|number|scale",
  "options": ["option1", "option2"] or null,
  "extractedInfo": {
    "field": "value extracted from patient response"
  },
  "redFlags": ["red flag descriptions"] or [],
  "missingInfo": ["missing field descriptions"] or [],
  "category": "chief_complaint|hpi|past_medical|medications|allergies|family|personal|ros"
}`;

interface AIQuestionResponse {
  nextQuestion: string;
  questionType: 'text' | 'single_choice' | 'multiple_choice' | 'number' | 'scale';
  options?: string[];
  extractedInfo?: Record<string, any>;
  redFlags?: string[];
  missingInfo?: string[];
  category: string;
}

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export class AIService {
  private conversationHistory: ConversationMessage[] = [];

  /**
   * Get next question based on conversation history
   */
  async getNextQuestion(
    chiefComplaint: string,
    conversationHistory: Array<{ role: string; content: string }>,
    collectedInfo: Record<string, any>
  ): Promise<AIQuestionResponse> {
    try {
      // If no API key or model, return fallback question
      if (!genAI || !model) {
        return this.getFallbackQuestion(collectedInfo);
      }

      const prompt = this.buildQuestionPrompt(chiefComplaint, conversationHistory, collectedInfo);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        nextQuestion: parsed.nextQuestion || 'Can you tell me more about your condition?',
        questionType: parsed.questionType || 'text',
        options: parsed.options,
        extractedInfo: parsed.extractedInfo,
        redFlags: parsed.redFlags || [],
        missingInfo: parsed.missingInfo || [],
        category: parsed.category || 'hpi',
      };
    } catch (error) {
      console.error('AI question generation error:', error);
      return this.getFallbackQuestion(collectedInfo);
    }
  }

  /**
   * Get fallback question when AI is not available
   */
  private getFallbackQuestion(collectedInfo: Record<string, any>): AIQuestionResponse {
    // Simple rule-based fallback questions
    const questionCount = Object.keys(collectedInfo).length;
    
    const fallbackQuestions = [
      'When did this problem start?',
      'How would you describe the severity of your symptoms on a scale of 1-10?',
      'What makes your symptoms better or worse?',
      'Are you currently taking any medications?',
      'Do you have any known allergies?',
    ];
    
    return {
      nextQuestion: fallbackQuestions[questionCount] || 'Is there anything else you would like to add?',
      questionType: 'text',
      category: 'hpi',
      redFlags: [],
      missingInfo: [],
    };
  }

  /**
   * Generate clinical summary
   */
  async generateClinicalSummary(
    clinicalData: {
      chiefComplaint: string;
      hpi: Record<string, any>;
      pastMedicalHistory: string[];
      pastSurgicalHistory: string[];
      medications: any[];
      allergies: any[];
      familyHistory: any[];
      personalHistory: Record<string, any>;
      reviewOfSystems: Record<string, any>;
    }
  ): Promise<{
    summary: {
      chiefComplaint: string;
      historyPresentIllness: string;
      pastMedicalHistory: string;
      pastSurgicalHistory: string;
      medications: string;
      allergies: string;
      familyHistory: string;
      personalHistory: string;
      reviewOfSystems: string;
    };
    redFlags: string[];
    missingInformation: string[];
    confidence: number;
  }> {
    try {
      const prompt = `${CLINICAL_SYSTEM_PROMPT}

Create a physician-ready clinical summary from the following patient data.

Chief Complaint: ${clinicalData.chiefComplaint}

History of Present Illness: ${JSON.stringify(clinicalData.hpi)}

Past Medical History: ${clinicalData.pastMedicalHistory.join(', ') || 'None reported'}

Past Surgical History: ${clinicalData.pastSurgicalHistory.join(', ') || 'None reported'}

Current Medications: ${JSON.stringify(clinicalData.medications)}

Allergies: ${JSON.stringify(clinicalData.allergies)}

Family History: ${JSON.stringify(clinicalData.familyHistory)}

Personal History: ${JSON.stringify(clinicalData.personalHistory)}

Review of Systems: ${JSON.stringify(clinicalData.reviewOfSystems)}

Generate a structured clinical summary in standard medical format.

Return ONLY valid JSON:
{
  "summary": {
    "chiefComplaint": "Brief CC",
    "historyPresentIllness": "Narrative HPI",
    "pastMedicalHistory": "Formatted PMH",
    "pastSurgicalHistory": "Formatted PSH",
    "medications": "Current medications with dosages",
    "allergies": "Known allergies",
    "familyHistory": "Relevant family history",
    "personalHistory": "Social history",
    "reviewOfSystems": "Pertinent ROS findings"
  },
  "redFlags": ["Critical findings requiring immediate attention"],
  "missingInformation": ["Important missing information"],
  "confidence": 0.85
}`;

      if (!model) {
        throw new Error('AI model not initialized');
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in summary response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Summary generation error:', error);
      
      // Return basic summary
      return {
        summary: {
          chiefComplaint: clinicalData.chiefComplaint,
          historyPresentIllness: JSON.stringify(clinicalData.hpi),
          pastMedicalHistory: clinicalData.pastMedicalHistory.join(', '),
          pastSurgicalHistory: clinicalData.pastSurgicalHistory.join(', '),
          medications: JSON.stringify(clinicalData.medications),
          allergies: JSON.stringify(clinicalData.allergies),
          familyHistory: JSON.stringify(clinicalData.familyHistory),
          personalHistory: JSON.stringify(clinicalData.personalHistory),
          reviewOfSystems: JSON.stringify(clinicalData.reviewOfSystems),
        },
        redFlags: [],
        missingInformation: ['Unable to generate detailed analysis'],
        confidence: 0.5,
      };
    }
  }

  /**
   * Extract information from patient response
   */
  async extractInformation(
    question: string,
    patientResponse: string,
    expectedType: string
  ): Promise<Record<string, any>> {
    try {
      const prompt = `Extract structured medical information from the patient response.

Question: ${question}
Patient Response: ${patientResponse}
Expected Type: ${expectedType}

Extract relevant medical information and return as JSON.
Do NOT invent information not present in the response.

Return ONLY valid JSON:
{
  "extracted": {
    "field": "value"
  },
  "confidence": 0.9
}`;

      if (!model) {
        return { extracted: {}, confidence: 0 };
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { extracted: {}, confidence: 0 };
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Information extraction error:', error);
      return { extracted: {}, confidence: 0 };
    }
  }

  /**
   * Detect contradictions between patient statements and documents
   */
  async detectContradictions(
    patientStatements: Record<string, any>,
    documentData: Record<string, any>
  ): Promise<Array<{ field: string; patientSaid: string; documentShows: string }>> {
    try {
      const prompt = `Compare patient statements with document data and identify contradictions.

Patient Statements: ${JSON.stringify(patientStatements)}

Document Data: ${JSON.stringify(documentData)}

Identify any contradictions or discrepancies.

Return ONLY valid JSON:
{
  "contradictions": [
    {
      "field": "field name",
      "patientSaid": "what patient said",
      "documentShows": "what document shows"
    }
  ]
}`;

      if (!model) {
        return [];
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.contradictions || [];
    } catch (error) {
      console.error('Contradiction detection error:', error);
      return [];
    }
  }

  /**
   * Build prompt for next question
   */
  private buildQuestionPrompt(
    chiefComplaint: string,
    conversationHistory: Array<{ role: string; content: string }>,
    collectedInfo: Record<string, any>
  ): string {
    return `${CLINICAL_SYSTEM_PROMPT}

Chief Complaint: ${chiefComplaint}

Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Information Collected So Far:
${JSON.stringify(collectedInfo, null, 2)}

Based on the chief complaint and conversation so far, determine the most relevant next question to ask.
Focus on gathering SOCRATES information for pain, associated symptoms, and relevant past history.

Return the next question in the specified JSON format.`;
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export type
export type { AIQuestionResponse };
