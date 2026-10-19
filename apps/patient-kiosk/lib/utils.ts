import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: string = 'en-IN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatTime(date: string | Date, locale: string = 'en-IN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function validateIndianMobileNumber(number: string): boolean {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(number);
}

export function validateABHAId(abhaId: string): boolean {
  const abhaRegex = /^\d{2}-\d{4}-\d{4}-\d{4}$/;
  return abhaRegex.test(abhaId);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function extractFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPDFFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTokenNumber(department: string, count: number): string {
  const deptCode = department.substring(0, 2).toUpperCase();
  return `${deptCode}-${String(count).padStart(3, '0')}`;
}

export function getCompletenessColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'info':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function parseVoiceNumber(text: string, language: string): number | null {
  // English numbers
  const englishNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4,
    five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  
  // Hindi numbers
  const hindiNumbers: Record<string, number> = {
    शून्य: 0, एक: 1, दो: 2, तीन: 3, चार: 4,
    पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  };
  
  const lowerText = text.toLowerCase().trim();
  
  // Try parsing as digit
  const digit = parseInt(lowerText);
  if (!isNaN(digit)) return digit;
  
  // Try parsing as word
  if (language === 'hi' && hindiNumbers[lowerText] !== undefined) {
    return hindiNumbers[lowerText];
  }
  
  if (englishNumbers[lowerText] !== undefined) {
    return englishNumbers[lowerText];
  }
  
  return null;
}

export function detectRedFlags(symptoms: string[]): string[] {
  const redFlags: string[] = [];
  const lowerSymptoms = symptoms.map(s => s.toLowerCase());
  
  // Chest pain red flags
  if (lowerSymptoms.some(s => s.includes('chest pain') || s.includes('सीने में दर्द'))) {
    if (lowerSymptoms.some(s => s.includes('severe') || s.includes('crushing') || s.includes('गंभीर'))) {
      redFlags.push('Severe chest pain - Possible cardiac emergency');
    }
    if (lowerSymptoms.some(s => s.includes('radiating') || s.includes('arm') || s.includes('jaw'))) {
      redFlags.push('Radiating chest pain - Possible acute coronary syndrome');
    }
    if (lowerSymptoms.some(s => s.includes('breathless') || s.includes('dyspnea') || s.includes('सांस'))) {
      redFlags.push('Chest pain with dyspnea - Requires immediate attention');
    }
  }
  
  // Neurological red flags
  if (lowerSymptoms.some(s => s.includes('headache') || s.includes('सिरदर्द'))) {
    if (lowerSymptoms.some(s => s.includes('worst') || s.includes('thunderclap') || s.includes('sudden'))) {
      redFlags.push('Sudden severe headache - Possible subarachnoid hemorrhage');
    }
  }
  
  // Abdominal red flags
  if (lowerSymptoms.some(s => s.includes('abdominal pain') || s.includes('पेट दर्द'))) {
    if (lowerSymptoms.some(s => s.includes('severe') || s.includes('rigid') || s.includes('guarding'))) {
      redFlags.push('Acute abdomen - Requires urgent evaluation');
    }
  }
  
  // Bleeding
  if (lowerSymptoms.some(s => s.includes('bleeding') || s.includes('blood') || s.includes('खून'))) {
    if (lowerSymptoms.some(s => s.includes('heavy') || s.includes('profuse') || s.includes('severe'))) {
      redFlags.push('Severe bleeding - Immediate intervention required');
    }
  }
  
  // Trauma
  if (lowerSymptoms.some(s => s.includes('injury') || s.includes('trauma') || s.includes('accident') || s.includes('चोट'))) {
    if (lowerSymptoms.some(s => s.includes('head') || s.includes('unconscious') || s.includes('सिर'))) {
      redFlags.push('Head trauma - Requires immediate assessment');
    }
  }
  
  return redFlags;
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isLocalhost(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = window.navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
  
  if (isTablet) return 'Tablet';
  if (isMobile) return 'Mobile';
  return 'Desktop';
}

export function copyToClipboard(text: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  return window.navigator.clipboard.writeText(text);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createObjectURL(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}
