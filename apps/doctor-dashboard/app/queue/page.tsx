'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  PhoneCall, 
  ChevronRight, 
  UserCheck, 
  Plus, 
  ArrowLeft,
  Volume2
} from 'lucide-react';

import { DoctorHeader, DoctorSidebar } from '@/components/DoctorNavigation';

export default function QueuePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'waiting' | 'in-consultation' | 'completed'>('waiting');

  const [queue, setQueue] = useState<any[]>([
    {
      id: 'q-101',
      token: 'TK-101',
      name: 'Rajeev Kumar',
      age: 52,
      gender: 'M',
      chiefComplaint: 'Chest Pain - Radiating (Onset: 2 hrs ago)',
      priority: 'EMERGENCY',
      status: 'waiting',
      waitTime: '4 Mins',
      assignedRoom: 'OPD Room 104',
      vitals: { bp: '150/95', hr: '104 bpm', spo2: '96%' },
    },
    {
      id: 'q-102',
      token: 'TK-102',
      name: 'Sunita Mishra',
      age: 45,
      gender: 'F',
      chiefComplaint: 'Severe Migraine Headache with Nausea',
      priority: 'HIGH',
      status: 'in-consultation',
      waitTime: '12 Mins',
      assignedRoom: 'OPD Room 102',
      vitals: { bp: '130/84', hr: '78 bpm', spo2: '99%' },
    },
    {
      id: 'q-103',
      token: 'TK-103',
      name: 'Anil Desai',
      age: 68,
      gender: 'M',
      chiefComplaint: 'Chronic Lumbar Spine Pain (Follow-up)',
      priority: 'LOW',
      status: 'waiting',
      waitTime: '18 Mins',
      assignedRoom: 'OPD Room 204',
      vitals: { bp: '124/80', hr: '72 bpm', spo2: '98%' },
    },
    {
      id: 'q-104',
      token: 'TK-104',
      name: 'Pooja Verma',
      age: 29,
      gender: 'F',
      chiefComplaint: 'Acute Abdominal Cramps & Bloating',
      priority: 'HIGH',
      status: 'waiting',
      waitTime: '22 Mins',
      assignedRoom: 'OPD Room 102',
      vitals: { bp: '118/76', hr: '82 bpm', spo2: '99%' },
    },
    {
      id: 'q-105',
      token: 'TK-105',
      name: 'Vikram Singh',
      age: 38,
      gender: 'M',
      chiefComplaint: 'High Grade Fever & Rigors (2 Days)',
      priority: 'STANDARD',
      status: 'completed',
      waitTime: 'Completed',
      assignedRoom: 'OPD Room 102',
      vitals: { bp: '120/80', hr: '98 bpm', spo2: '97%' },
    }
  ]);

  useEffect(() => {
    checkAuth();
    loadLiveQueue();

    // Auto-polling fallback every 4s to ensure real-time queue sync
    const pollInterval = setInterval(() => {
      loadLiveQueue();
    }, 4000);

    const channel = supabase
      .channel('queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items' },
        () => loadLiveQueue()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinical_summaries' },
        () => loadLiveQueue()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => loadLiveQueue()
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLiveQueue = async () => {
    try {
      // 1. Fetch queue items
      const { data: queueData } = await supabase
        .from('queue_items')
        .select('*')
        .order('added_at', { ascending: false });

      // 2. Fetch clinical summaries
      const { data: summaryData } = await supabase
        .from('clinical_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Collect all patient IDs
      const ptIdSet = new Set<string>();
      (queueData || []).forEach((q: any) => { if (q.patient_id) ptIdSet.add(q.patient_id); });
      (summaryData || []).forEach((s: any) => { if (s.patient_id) ptIdSet.add(s.patient_id); });

      let patientMap: Record<string, any> = {};
      if (ptIdSet.size > 0) {
        const { data: pts } = await supabase
          .from('patients')
          .select('*')
          .in('id', Array.from(ptIdSet));
        (pts || []).forEach((p: any) => {
          patientMap[p.id] = p;
        });
      }

      let liveQueueItems: any[] = [];

      if (queueData && queueData.length > 0) {
        queueData.forEach((q: any) => {
          const pat = patientMap[q.patient_id] || {};
          const isCritical = q.priority === 'critical';
          const isUrgent = q.priority === 'urgent';
          liveQueueItems.push({
            id: q.id,
            token: q.token_number || `TK-${q.id.slice(0, 3)}`,
            name: pat.name || 'Patient',
            age: pat.age || 40,
            gender: pat.gender ? pat.gender[0].toUpperCase() : 'M',
            chiefComplaint: `${q.department || 'General Medicine'} Consultation`,
            priority: isCritical ? 'EMERGENCY' : (isUrgent ? 'HIGH' : 'STANDARD'),
            status: 'waiting',
            waitTime: '5-10 Mins',
            assignedRoom: 'OPD Room 102',
            vitals: { bp: '120/80', hr: '76 bpm', spo2: '98%' },
            patientId: pat.id || q.patient_id,
          });
        });
      }

      // Also merge clinical summaries into queue if queue_items was not populated
      if (summaryData && summaryData.length > 0) {
        summaryData.forEach((s: any, idx: number) => {
          const pat = patientMap[s.patient_id] || {};
          const patId = pat.id || s.patient_id;
          if (!liveQueueItems.some(item => item.patientId === patId)) {
            const complaint = s.chief_complaint || 'General Intake';
            const isEmergency = complaint.toLowerCase().includes('chest') || (s.red_flags && s.red_flags.length > 0);
            liveQueueItems.push({
              id: s.id,
              token: `TK-${200 + idx}`,
              name: pat.name || `Patient #${s.id.slice(0, 5)}`,
              age: pat.age || 42,
              gender: pat.gender ? pat.gender[0].toUpperCase() : 'M',
              chiefComplaint: complaint,
              priority: isEmergency ? 'EMERGENCY' : 'STANDARD',
              status: 'waiting',
              waitTime: '5-10 Mins',
              assignedRoom: 'OPD Room 102',
              vitals: { bp: '120/80', hr: '78 bpm', spo2: '98%' },
              patientId: patId,
            });
          }
        });
      }

      if (liveQueueItems.length > 0) {
        setQueue((prev) => {
          const combined = [...liveQueueItems, ...prev.filter(p => !liveQueueItems.some(l => l.token === p.token || (l.patientId && l.patientId === p.patientId)))];
          return combined;
        });
      }
    } catch (err) {
      console.warn('Queue fetch warning:', err);
    }
  };

  const checkAuth = async () => {
    const storedDoctorAuth = typeof window !== 'undefined' ? localStorage.getItem('careportal_doctor_auth') : null;
    if (storedDoctorAuth) {
      setUser(JSON.parse(storedDoctorAuth));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    } else {
      router.replace('/login');
    }
  };

  const handleCallPatient = (token: string, name: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = `Token number ${token}, ${name}, please proceed to OPD Room 102.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
    alert(`Calling Patient ${name} (${token}) to consultation chamber.`);
  };

  const filteredQueue = queue.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.token.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || item.priority.toLowerCase() === filterPriority.toLowerCase();
    const matchesTab = item.status === activeTab;
    return matchesSearch && matchesPriority && matchesTab;
  });

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen">
      
      {/* Top Header Bar */}
      <DoctorHeader 
        doctorName={user?.name ? `${user.name.toUpperCase()} (OPD)` : 'DR. SHARMA (OPD)'}
        initials={user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AS'}
      />

      {/* Navigation Sidebar */}
      <DoctorSidebar activePath="/queue" />

      {/* Main Content */}
      <main className="pt-16 pl-64 min-h-screen flex flex-col bg-background">
        <div className="p-xl max-w-container-max mx-auto w-full flex flex-col gap-lg">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Live Operations</span>
              <h1 className="text-3xl font-extrabold text-on-background mt-1">Live Patient Queue & Triage</h1>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex p-1 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <button
                onClick={() => setActiveTab('waiting')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'waiting' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Waiting ({queue.filter(q => q.status === 'waiting').length})
              </button>
              <button
                onClick={() => setActiveTab('in-consultation')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'in-consultation' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                In Consultation ({queue.filter(q => q.status === 'in-consultation').length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'completed' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Completed ({queue.filter(q => q.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-surface-container-lowest p-md rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by token, patient name, symptom..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline-variant/60 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-on-surface-variant uppercase">Priority:</span>
              {['all', 'emergency', 'high', 'standard', 'low'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                    filterPriority === p
                      ? 'bg-[#151c27] text-white'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List Cards */}
          <div className="flex flex-col gap-4">
            {filteredQueue.map((item) => {
              const isEmergency = item.priority === 'EMERGENCY';
              const isHigh = item.priority === 'HIGH';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl shadow-xs border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isEmergency
                      ? 'bg-error-container/20 border-error/30 hover:border-error'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/40'
                  }`}
                >
                  {/* Token & Patient Info */}
                  <div className="flex items-start gap-4">
                    <div className={`px-3 py-2 rounded-xl font-mono font-black text-base flex flex-col items-center justify-center shrink-0 ${
                      isEmergency
                        ? 'bg-error text-on-error'
                        : isHigh
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : 'bg-primary-container text-on-primary-container'
                    }`}>
                      <span className="text-[10px] opacity-80 uppercase">Token</span>
                      <span>{item.token}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-on-surface">{item.name}</h3>
                        <span className="text-xs text-on-surface-variant font-medium">
                          ({item.age} Yrs / {item.gender})
                        </span>
                        {isEmergency ? (
                          <span className="px-2 py-0.5 rounded-md bg-error text-on-error text-[10px] font-extrabold animate-pulse">
                            EMERGENCY
                          </span>
                        ) : isHigh ? (
                          <span className="px-2 py-0.5 rounded-md bg-tertiary-container text-on-tertiary-container text-[10px] font-bold">
                            HIGH PRIORITY
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm font-medium text-on-surface mb-2">
                        {item.chiefComplaint}
                      </p>

                      {/* Vitals Pill Row */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-0.5 bg-surface-container-low rounded-md text-on-surface-variant font-medium">
                          BP: <strong>{item.vitals.bp}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 bg-surface-container-low rounded-md text-on-surface-variant font-medium">
                          Heart Rate: <strong>{item.vitals.hr}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 bg-surface-container-low rounded-md text-on-surface-variant font-medium">
                          SpO2: <strong>{item.vitals.spo2}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/20">
                    <button
                      onClick={() => handleCallPatient(item.token, item.name)}
                      className="px-4 py-2 rounded-xl bg-surface border border-outline-variant text-on-surface text-xs font-bold hover:bg-surface-variant transition-colors flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span>Announce</span>
                    </button>

                    <button
                      onClick={() => router.push(`/patient/${item.id}`)}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-[#005049] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>Open Clinical Record</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredQueue.length === 0 && (
              <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-on-surface-variant">
                No patients currently found in this queue category.
              </div>
            )}
          </div>

        </div>
      </main>

    </div>
  );
}
