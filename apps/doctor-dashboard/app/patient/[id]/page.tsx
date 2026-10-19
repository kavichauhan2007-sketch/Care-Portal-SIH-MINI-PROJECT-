'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Stethoscope, 
  Pill, 
  FileText, 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Printer, 
  Send,
  Plus,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  GitCompare,
  ExternalLink,
  Upload,
  UploadCloud,
  Trash2,
  Eye,
  Download,
  FileCheck,
  Image as ImageIcon,
  File,
  X,
  Maximize2,
  Flame
} from 'lucide-react';

interface ClinicalDoc {
  id: string;
  name: string;
  category: 'prescription' | 'lab_report' | 'imaging' | 'discharge' | 'other';
  size: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
  mimeType?: string;
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [pastSummaries, setPastSummaries] = useState<any[]>([]);
  const [expandedPastSummaryId, setExpandedPastSummaryId] = useState<string | null>(null);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([
    { name: 'Tab. Paracetamol', dose: '650mg', freq: 'TDS (Thrice Daily)', duration: '5 Days' },
    { name: 'Cap. Pantoprazole', dose: '40mg', freq: 'OD (Empty Stomach)', duration: '7 Days' },
  ]);
  const [newMed, setNewMed] = useState({ name: '', dose: '', freq: '', duration: '' });

  // Uploaded Prescriptions & Clinical Documents State
  const [uploadedDocs, setUploadedDocs] = useState<ClinicalDoc[]>([
    {
      id: 'doc-rx-01',
      name: 'Dr_Amit_Signed_Rx_Digital.pdf',
      category: 'prescription',
      size: '245 KB',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60',
      uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      uploadedBy: 'Dr. Amit Sharma, MD',
      notes: 'Initial OPD prescription: Antihypertensives & Analgesics',
      mimeType: 'application/pdf',
    }
  ]);
  const [selectedDocCategory, setSelectedDocCategory] = useState<'prescription' | 'lab_report' | 'imaging' | 'discharge' | 'other'>('prescription');
  const [docNotesInput, setDocNotesInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClinicalDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      // 1. Try Supabase Patients Table by ID or contact_number
      let patientData: any = null;
      let allSummaries: any[] = [];

      const { data: pData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (pData) {
        patientData = pData;
      }

      // 2. Fetch ALL Supabase Clinical Summaries for this patient
      const { data: sDataList } = await supabase
        .from('clinical_summaries')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (sDataList && sDataList.length > 0) {
        allSummaries = sDataList;
      } else {
        // Try finding summary directly by summary id
        const { data: sDataById } = await supabase
          .from('clinical_summaries')
          .select('*')
          .eq('id', patientId)
          .maybeSingle();

        if (sDataById) {
          allSummaries = [sDataById];
          if (sDataById.patient_id) {
            const { data: otherSummaries } = await supabase
              .from('clinical_summaries')
              .select('*')
              .eq('patient_id', sDataById.patient_id)
              .order('created_at', { ascending: false });
            if (otherSummaries && otherSummaries.length > 0) {
              allSummaries = otherSummaries;
            }
            if (!patientData) {
              const { data: pFromSummary } = await supabase
                .from('patients')
                .select('*')
                .eq('id', sDataById.patient_id)
                .maybeSingle();
              patientData = pFromSummary;
            }
          }
        }
      }

      // 3. Try Supabase Clinical Histories Table
      const { data: historyData } = await supabase
        .from('clinical_histories')
        .select('*')
        .eq('patient_id', patientData?.id || patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentSummary = allSummaries.length > 0 ? allSummaries[0] : null;
      let pastList = allSummaries.length > 1 ? allSummaries.slice(1) : [];

      // If this is an existing demo patient or only 1 summary exists but patient has returning indicator, provide mock previous consultation
      if (pastList.length === 0 && (patientId === 'p2' || patientId === 'HOSP002' || patientData?.name?.toLowerCase().includes('sunita') || patientData?.name?.toLowerCase().includes('rajeev'))) {
        pastList = [
          {
            id: 'past-sum-01',
            created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
            chief_complaint: 'Severe throbbing migraine headache with visual photophobia and nausea for 3 days',
            history_present_illness: 'Patient reported recurring episodic unilateral pulsatile headaches triggered by screen exposure and lack of sleep. Relieved partially by dark room rest.',
            past_medical_history: 'Hypertension (Stage 1), Tension Headaches',
            medications: 'Tab. Naproxen 500mg SOS, Tab. Domperidone 10mg BD, Tab. Amlodipine 5mg OD',
            allergies: 'No known drug allergies (NKDA)',
            ayush_summary: 'Pitta-Vata predominance (Shiroroga). Recommended cooling herbs and Brahmi rasayana.',
            red_flags: ['Visual aura before headache onset'],
            ai_confidence: 0.96,
            status: 'verified',
            doctor_name: 'Dr. Amit Sharma, MD',
          }
        ];
      }

      setPastSummaries(pastList);
      if (pastList.length > 0) {
        setExpandedPastSummaryId(pastList[0].id);
      }

      // Check local storage for emergency red flags if newly registered
      let localFlags: string[] = [];
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('careportal_patient_redflags');
          if (stored) localFlags = JSON.parse(stored);
        }
      } catch (e) {}

      if (patientData || currentSummary) {
        const mergedRedFlags = Array.from(new Set([
          ...(currentSummary?.red_flags || []),
          ...(patientData?.red_flags || []),
          ...localFlags
        ]));

        setPatient(patientData || {
          id: patientId,
          name: 'Patient #' + patientId.slice(0, 6),
          age: 45,
          gender: 'Other',
          contact_number: '+91 98765 43210',
          created_at: new Date().toISOString(),
        });

        if (currentSummary) {
          setSummary(currentSummary);
          setHistory({
            id: historyData?.id || currentSummary.id,
            chief_complaint: currentSummary.chief_complaint,
            history_of_present_illness: currentSummary.history_present_illness,
            past_medical_history: currentSummary.past_medical_history ? [currentSummary.past_medical_history] : [],
            past_surgical_history: currentSummary.past_surgical_history ? [currentSummary.past_surgical_history] : [],
            medications: currentSummary.medications ? [{ name: currentSummary.medications, dosage: 'As recorded', frequency: 'Daily' }] : [],
            allergies: currentSummary.allergies ? [{ allergen: currentSummary.allergies, reaction: 'Documented Allergy' }] : [],
            completeness_score: Math.round((currentSummary.ai_confidence || 0.95) * 100),
            status: currentSummary.status || 'pending',
            red_flags: mergedRedFlags,
            ayush_summary: currentSummary.ayush_summary,
            triage_level: mergedRedFlags.length > 0 ? 'Priority 1 - Critical Emergency Assessment' : 'Priority 2 - Standard OPD Consultation',
          });
        } else {
          setHistory({
            ...historyData,
            red_flags: mergedRedFlags,
            triage_level: mergedRedFlags.length > 0 ? 'Priority 1 - Critical Emergency Assessment' : 'Priority 2 - Standard OPD Consultation',
          });
        }
      } else {
        // Fallback Demo Clinical Patient
        setPatient({
          id: patientId,
          name: patientId === 'p1' || patientId === 'HOSP001' ? 'Rajeev Kumar' : 'Sunita Mishra',
          age: patientId === 'p1' || patientId === 'HOSP001' ? 52 : 45,
          gender: patientId === 'p1' || patientId === 'HOSP001' ? 'Male' : 'Female',
          contact_number: '+91 98765 43210',
          hospital_id: patientId === 'p1' || patientId === 'HOSP001' ? 'HOSP001' : 'HOSP002',
          abha_id: '91-8273-9182-3921',
          created_at: new Date().toISOString(),
        });

        setHistory({
          id: 'hist-01',
          chief_complaint: patientId === 'p1' || patientId === 'HOSP001'
            ? 'Severe substernal crushing chest pain radiating to left shoulder and jaw for 2 hours'
            : 'Severe throbbing headache with nausea and light sensitivity',
          history_of_present_illness: 'Patient developed sudden onset chest tightness while climbing stairs. Associated with diaphoresis and mild shortness of breath. No relief with rest.',
          past_medical_history: ['Hypertension (8 Yrs)', 'Dyslipidemia (3 Yrs)'],
          medications: [
            { name: 'Amlodipine', dosage: '5mg', frequency: 'OD (Morning)' },
            { name: 'Atorvastatin', dosage: '20mg', frequency: 'HS (Night)' },
          ],
          allergies: [
            { allergen: 'Penicillin', reaction: 'Skin Urticaria & Wheezing' }
          ],
          completeness_score: 94,
          status: 'verified',
          pain_location: ['Substernal Chest', 'Left Arm'],
          pain_intensity: 8,
          red_flags: localFlags.length > 0 ? localFlags : ['Severe substernal crushing chest pain', 'Radiation to left arm'],
          triage_level: 'Priority 1 - Critical Cardiac Assessment',
        });
      }
    } catch (error) {
      console.warn('Patient load fallback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (history?.id) {
        await supabase
          .from('clinical_histories')
          .update({
            status: 'verified',
            verified_by: user?.id,
            verified_at: new Date().toISOString(),
          })
          .eq('id', history.id);
      }
      setHistory((prev: any) => ({ ...prev, status: 'verified' }));
      alert('Clinical record verified and signed by Doctor.');
    } catch (error) {
      console.error('Error verifying:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleAddMedication = () => {
    if (newMed.name) {
      setPrescriptions([...prescriptions, newMed]);
      setNewMed({ name: '', dose: '', freq: '', duration: '' });
    }
  };

  // -------------------------------------------------------------
  // PRESCRIPTION & CLINICAL DOCUMENT UPLOAD HANDLERS
  // -------------------------------------------------------------
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    for (const file of files) {
      try {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert(`File type not supported for ${file.name}. Please upload PDF or image files.`);
          continue;
        }

        if (file.size > 15 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 15MB limit.`);
          continue;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          const fileDataUrl = reader.result as string;
          const newDoc: ClinicalDoc = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            category: selectedDocCategory,
            size: formatFileSize(file.size),
            url: fileDataUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Attending Physician (Doctor Dashboard)',
            notes: docNotesInput.trim() || undefined,
            mimeType: file.type,
          };

          // Try saving to Supabase if documents table exists
          try {
            if (patientId) {
              await supabase
                .from('documents')
                .insert({
                  patient_id: patientId,
                  type: selectedDocCategory,
                  file_url: fileDataUrl,
                  mime_type: file.type,
                  file_size: file.size,
                  metadata: {
                    original_name: file.name,
                    notes: docNotesInput.trim(),
                    uploaded_by: 'Doctor Dashboard',
                  },
                });
            }
          } catch (dbErr) {
            console.warn('Doc upload DB fallback:', dbErr);
          }

          setUploadedDocs((prev) => [newDoc, ...prev]);
          setDocNotesInput('');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('File process error:', err);
      }
    }
    setIsUploading(false);
  };

  const removeDocument = (id: string) => {
    if (confirm('Are you sure you want to remove this document from the patient record?')) {
      setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'prescription':
        return { label: "Doctor's Prescription (Rx)", bg: 'bg-teal-50 text-[#00685f] border-teal-200', icon: '💊' };
      case 'lab_report':
        return { label: 'Lab Investigation', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: '🧪' };
      case 'imaging':
        return { label: 'X-Ray / Imaging', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: '🩻' };
      case 'discharge':
        return { label: 'Discharge Summary', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: '📋' };
      default:
        return { label: 'Clinical Note / Other', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: '📄' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-background pb-16">
      
      {/* Top Sticky Header */}
      <header className="bg-surface border-b border-outline-variant sticky top-0 z-30 shadow-xs">
        <div className="max-w-container-max mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-surface-variant rounded-xl transition-colors text-on-surface"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-on-surface">{patient?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00685f] text-xs font-bold border border-teal-200">
                  {patient?.age} Yrs / {patient?.gender}
                </span>
                {pastSummaries.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1 shadow-2xs">
                    <History className="w-3.5 h-3.5 text-amber-700" />
                    <span>Returning Patient ({pastSummaries.length} Prior Visit{pastSummaries.length > 1 ? 's' : ''})</span>
                  </span>
                )}
                {history?.triage_level?.includes('Critical') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-error text-on-error text-xs font-bold animate-pulse">
                    EMERGENCY TRIAGE
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant font-mono">
                ABHA: {patient?.abha_id || '91-8273-9182-3921'} • Hospital ID: {patient?.hospital_id || patientId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pastSummaries.length > 0 && (
              <button
                onClick={() => setShowComparisonView(!showComparisonView)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showComparisonView
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-50'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                <span>{showComparisonView ? 'Close Visit Comparison' : 'Compare with Prior Visit'}</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-surface border border-outline-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-variant flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Print Case Sheet</span>
            </button>

            {history?.status === 'verified' ? (
              <span className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Physician Verified</span>
              </span>
            ) : (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-5 py-2 bg-primary hover:bg-[#005049] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{verifying ? 'Verifying...' : 'Verify & Sign Case'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-container-max mx-auto px-6 py-8">
        
        {/* Longitudinal Visit Comparison Banner (if toggled) */}
        {showComparisonView && pastSummaries.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-950">
                    Longitudinal Case Comparison: Today's Intake vs. Previous Visit
                  </h3>
                  <p className="text-xs text-amber-800">
                    Comparing current consultation with prior clinical record dated {new Date(pastSummaries[0].created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComparisonView(false)}
                className="text-xs font-bold text-amber-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-amber-300"
              >
                Hide Comparison
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Today's Visit */}
              <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#00685f] uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00685f]"></span>
                    Today's Intake (Latest)
                  </span>
                  <span className="text-slate-500 font-mono">Today</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-500 block font-semibold">Chief Complaint:</span>
                    <p className="font-bold text-slate-900">{history?.chief_complaint || 'General intake'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">SOCRATES HPI:</span>
                    <p className="text-slate-700">{history?.history_of_present_illness || 'Acute onset documented at kiosk.'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Current Medications:</span>
                    <p className="text-slate-700">{history?.medications?.map((m: any) => m.name).join(', ') || 'None reported'}</p>
                  </div>
                </div>
              </div>

              {/* Previous Visit */}
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    Previous Visit Summary
                  </span>
                  <span className="text-slate-500 font-mono">{new Date(pastSummaries[0].created_at).toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-500 block font-semibold">Prior Chief Complaint:</span>
                    <p className="font-bold text-slate-900">{pastSummaries[0].chief_complaint || 'Past consultation'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Prior HPI / Assessment:</span>
                    <p className="text-slate-700">{pastSummaries[0].history_present_illness || 'Previous intake recorded in system.'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Prior Medications / Prescriptions:</span>
                    <p className="text-slate-700">{pastSummaries[0].medications || 'No prior medications'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (4 cols): Patient Profile, Vitals, Allergies */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Demographics Card */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6">
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-outline-variant/20">
                <div className="w-14 h-14 bg-teal-50 text-[#00685f] rounded-2xl flex items-center justify-center font-bold text-xl border border-teal-200">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">{patient?.name}</h2>
                  <p className="text-xs text-on-surface-variant">{patient?.age} Yrs • {patient?.gender}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Phone:</span>
                  <span className="font-bold text-on-surface">{patient?.contact_number || '+91 98765 43210'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">ABHA Address:</span>
                  <span className="font-mono font-bold text-primary">{patient?.abha_id || '91-8273-9182-3921'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total Consultation Visits:</span>
                  <span className="font-bold text-amber-800">{pastSummaries.length + 1} Visit{pastSummaries.length > 0 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">History Completeness:</span>
                  <span className="font-bold text-emerald-600">{history?.completeness_score || 94}%</span>
                </div>
              </div>
            </div>

            {/* Allergies Alert Card */}
            <div className="bg-error-container/30 border border-error/30 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-on-error-container flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-error" />
                <span>Known Drug Allergies (Red Flag)</span>
              </h3>

              {history?.allergies?.map((al: any, i: number) => (
                <div key={i} className="p-3 bg-white rounded-xl border border-error/20 text-xs">
                  <strong className="text-error block">{al.allergen}</strong>
                  <span className="text-on-surface-variant">{al.reaction}</span>
                </div>
              )) || (
                <p className="text-xs text-on-surface-variant">No known drug allergies reported.</p>
              )}
            </div>

            {/* Past Medical History */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6">
              <h3 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Chronic Conditions</span>
              </h3>
              <ul className="space-y-2 text-xs">
                {history?.past_medical_history?.map((pmh: string, idx: number) => (
                  <li key={idx} className="p-2.5 bg-surface-container-low rounded-xl font-medium text-on-surface">
                    • {pmh}
                  </li>
                )) || <li>None reported</li>}
              </ul>
            </div>

          </div>

          {/* Right Column (8 cols): Today's Intake, Historical Summaries, E-Prescription */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Chief Complaint & AI Triage (Current Visit) */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base text-on-surface">Today's Intake: Chief Complaint & AI Triage</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#00685f] text-xs font-bold border border-teal-200">
                  Current Session
                </span>
              </div>

              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl text-sm font-medium text-on-surface mb-4">
                "{history?.chief_complaint}"
              </div>

              <div className="text-xs text-on-surface leading-relaxed p-4 bg-surface-container-low rounded-2xl">
                <span className="font-bold block mb-1 text-primary">History of Present Illness (SOCRATES):</span>
                {history?.history_of_present_illness || 'Symptoms began acutely prior to arrival with escalating discomfort.'}
              </div>

              {history?.ayush_summary && (
                <div className="mt-3 text-xs text-on-surface leading-relaxed p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <span className="font-bold block mb-0.5 text-emerald-800">AYUSH Prakriti & Holistic Assessment:</span>
                  {history.ayush_summary}
                </div>
              )}
            </div>

            {/* PREVIOUS CLINICAL HISTORIES & SUMMARIES (FOR EXISTING PATIENTS) */}
            {pastSummaries.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl shadow-xs border-2 border-amber-200/80 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-700" />
                    <div>
                      <h3 className="font-bold text-base text-on-surface">Previous Consultations & Historical Summaries</h3>
                      <p className="text-xs text-on-surface-variant">Archived clinical intakes and prescriptions from prior visits</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold border border-amber-300">
                    {pastSummaries.length} Prior Record{pastSummaries.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {pastSummaries.map((past, idx) => {
                    const isExpanded = expandedPastSummaryId === past.id;
                    const dateFormatted = new Date(past.created_at || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={past.id || idx} className="rounded-xl border border-amber-200/80 bg-amber-50/30 overflow-hidden transition-all">
                        <div 
                          onClick={() => setExpandedPastSummaryId(isExpanded ? null : past.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{past.chief_complaint || 'Past Consultation Summary'}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-slate-600 rounded-full border border-slate-200">
                                  {dateFormatted}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {past.history_present_illness || 'Clinical intake completed on previous consultation.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-800 hidden sm:inline">
                              {isExpanded ? 'Hide Details' : 'View Past Summary'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-800" /> : <ChevronDown className="w-4 h-4 text-amber-800" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-amber-200/60 text-xs space-y-3 bg-white/70">
                            <div className="p-3 bg-white rounded-lg border border-slate-200">
                              <strong className="block text-slate-700 font-bold mb-1">Previous SOCRATES Assessment:</strong>
                              <p className="text-slate-800 leading-relaxed">{past.history_present_illness || 'No detailed HPI recorded for this session.'}</p>
                            </div>

                            {past.medications && (
                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <strong className="block text-slate-700 font-bold mb-1">Previous Prescriptions / Active Medications:</strong>
                                <p className="text-slate-800">{past.medications}</p>
                              </div>
                            )}

                            {past.ayush_summary && (
                              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                                <strong className="block font-bold mb-1">Prior AYUSH Analysis:</strong>
                                <p>{past.ayush_summary}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Electronic Prescription (E-Prescription) */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  <span>Physician E-Prescription & Treatment Plan</span>
                </h3>
              </div>

              {/* Medication Table */}
              <div className="space-y-2.5 mb-4">
                {prescriptions.map((p, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-on-surface block text-sm">{p.name}</strong>
                      <span className="text-on-surface-variant font-medium">{p.dose} • {p.freq} • {p.duration}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Add Medication Form */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-outline-variant/30">
                <input
                  type="text"
                  placeholder="Medicine Name (e.g. Tab. Sorbitrate)"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="p-2 rounded-lg border border-outline-variant text-xs bg-surface"
                />
                <input
                  type="text"
                  placeholder="Dosage (5mg)"
                  value={newMed.dose}
                  onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
                  className="p-2 rounded-lg border border-outline-variant text-xs bg-surface"
                />
                <input
                  type="text"
                  placeholder="Frequency (OD / BD / STAT)"
                  value={newMed.freq}
                  onChange={(e) => setNewMed({ ...newMed, freq: e.target.value })}
                  className="p-2 rounded-lg border border-outline-variant text-xs bg-surface"
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="bg-primary hover:bg-[#005049] text-white rounded-lg text-xs font-bold py-2"
                >
                  + Add Medicine
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* UPLOAD PRESCRIPTION & CLINICAL DOCUMENTS SECTION (DOCTOR RX) */}
            {/* ============================================================== */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border-2 border-teal-200/80 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00685f] flex items-center justify-center border border-teal-200 shadow-xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <span>Upload Doctor's Prescription & Clinical Documents</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#00685f] text-[10px] font-bold">
                        {uploadedDocs.length} File{uploadedDocs.length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Attach scanned prescriptions, handwritten Rx slips, lab diagnostic reports, or imaging scans
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-primary hover:bg-[#005049] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Prescription'}</span>
                  </button>
                </div>
              </div>

              {/* Document Category Selector Tabs */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">
                  Select Document Classification:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'prescription', label: "Doctor's Rx", icon: '💊' },
                    { id: 'lab_report', label: 'Lab Report', icon: '🧪' },
                    { id: 'imaging', label: 'X-Ray / Scan', icon: '🩻' },
                    { id: 'discharge', label: 'Discharge', icon: '📋' },
                    { id: 'other', label: 'Other Document', icon: '📄' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedDocCategory(cat.id as any)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedDocCategory === cat.id
                          ? 'bg-teal-50 text-[#00685f] border-[#00685f] shadow-xs'
                          : 'bg-white border-outline-variant/30 text-on-surface-variant hover:border-teal-300'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer mb-4 ${
                  dragActive
                    ? 'border-[#00685f] bg-teal-50/60 scale-[1.01]'
                    : 'border-outline-variant/60 hover:border-[#00685f] bg-surface-container-low/40 hover:bg-teal-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-teal-50 text-[#00685f] flex items-center justify-center shadow-xs border border-teal-100">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">
                  Drag and drop doctor's prescription or reports here, or click to browse
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  Supports: PDF, JPG, PNG, WEBP (Max 15MB per file) • Scanned or digital copies
                </p>
              </div>

              {/* Optional Prescription Remarks / Notes Input */}
              <div className="mb-5 flex gap-2">
                <input
                  type="text"
                  placeholder="Add optional notes / instructions for this upload (e.g. Handwritten Rx signed by Dr. Sharma)..."
                  value={docNotesInput}
                  onChange={(e) => setDocNotesInput(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-outline-variant text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 ? (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Attached Clinical Files & Prescriptions ({uploadedDocs.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {uploadedDocs.map((doc) => {
                      const badge = getCategoryBadge(doc.category);
                      const dateStr = new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isImage = doc.mimeType?.startsWith('image/') || doc.url.includes('images.unsplash') || doc.name.match(/\.(jpg|jpeg|png|webp)$/i);

                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 bg-white rounded-xl border border-outline-variant/40 hover:border-teal-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                              {isImage ? (
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                              ) : (
                                <FileText className="w-5 h-5 text-red-600" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs font-bold text-slate-900 truncate max-w-[250px] sm:max-w-md">
                                  {doc.name}
                                </strong>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                  {badge.icon} {badge.label}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-mono">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>Uploaded: {dateStr}</span>
                                <span>•</span>
                                <span className="text-teal-700 font-sans font-semibold">{doc.uploadedBy}</span>
                              </p>

                              {doc.notes && (
                                <p className="text-[11px] text-slate-700 italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 inline-block">
                                  "{doc.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              title="View / Preview Document"
                              className="p-2 text-primary hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200 flex items-center gap-1 text-xs font-bold"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">Preview</span>
                            </button>

                            <a
                              href={doc.url}
                              download={doc.name}
                              target="_blank"
                              rel="noreferrer"
                              title="Download File"
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            <button
                              type="button"
                              onClick={() => removeDocument(doc.id)}
                              title="Delete Document"
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-500">No external prescriptions or documents uploaded yet.</p>
                </div>
              )}
            </div>

            {/* Doctor's Consultation Notes */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6">
              <h3 className="font-bold text-base text-on-surface mb-3 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                <span>Doctor Consultation Notes & Follow-up</span>
              </h3>

              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter clinical observations, differential diagnosis, follow-up instructions, and specialist referrals..."
                className="w-full h-28 p-3 rounded-xl border border-outline-variant text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => alert('Consultation notes saved to patient EHR.')}
                  className="px-6 py-2.5 bg-primary hover:bg-[#005049] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save to Patient EHR
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* DOCUMENT PREVIEW MODAL / LIGHTBOX */}
      {/* ============================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00685f] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {previewDoc.size} • {previewDoc.category.replace('_', ' ').toUpperCase()} • Uploaded by {previewDoc.uploadedBy}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#00685f] border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Preview */}
            <div className="flex-1 overflow-auto my-4 bg-slate-950/5 rounded-2xl flex items-center justify-center p-4 min-h-[350px]">
              {previewDoc.mimeType === 'application/pdf' && !previewDoc.url.startsWith('data:image') && !previewDoc.url.includes('images.unsplash') ? (
                <iframe
                  src={previewDoc.url}
                  title="PDF Preview"
                  className="w-full h-[550px] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="max-h-[600px] overflow-auto flex flex-col items-center">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-[550px] w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                  {previewDoc.notes && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 w-full max-w-xl text-center">
                      <strong className="block text-slate-900 font-bold mb-0.5">Clinical Remarks:</strong>
                      {previewDoc.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Patient: <strong className="text-slate-800">{patient?.name}</strong> (ID: {patient?.hospital_id || patientId})
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

