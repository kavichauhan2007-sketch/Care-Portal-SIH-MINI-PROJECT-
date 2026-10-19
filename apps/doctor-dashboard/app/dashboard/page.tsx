'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DoctorHeader, DoctorSidebar } from '@/components/DoctorNavigation';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  LogOut, 
  Search, 
  Plus, 
  Calendar as CalendarIcon,
  Activity,
  Layers,
  FileText,
  HelpCircle,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Bell,
  Sparkles
} from 'lucide-react';

interface PatientQueueItem {
  id: string;
  name: string;
  age: number;
  gender: string;
  initials: string;
  chiefComplaint: string;
  subComplaint?: string;
  priority: 'EMERGENCY' | 'HIGH' | 'LOW' | 'STANDARD';
  status: 'Intake Complete' | 'In-Progress' | 'Waiting Room' | 'Completed';
  avatarColor?: string;
  imageUrl?: string;
  sessionId?: string;
  patientId?: string;
  isReturning?: boolean;
  priorVisitCount?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'emergency' | 'waiting'>('all');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('Just now');

  // Live Stats
  const [stats, setStats] = useState({
    todayOpd: 24,
    waiting: 8,
    redFlags: 2,
    completed: 14,
  });

  // Default Mock + Live Patients
  const [patientQueue, setPatientQueue] = useState<PatientQueueItem[]>([
    {
      id: 'p1',
      name: 'Rajeev Kumar',
      age: 52,
      gender: 'M',
      initials: 'RK',
      chiefComplaint: 'Chest Pain radiating to Left Arm',
      subComplaint: 'Onset: 45 mins ago • Severe',
      priority: 'EMERGENCY',
      status: 'Intake Complete',
      avatarColor: 'bg-error-container text-on-error-container',
    },
    {
      id: 'p2',
      name: 'Sunita Mishra',
      age: 45,
      gender: 'F',
      initials: 'SM',
      chiefComplaint: 'Throbbing Headache with Nausea',
      subComplaint: 'Pain: 8/10 • Light Sensitive',
      priority: 'HIGH',
      status: 'In-Progress',
      avatarColor: 'bg-tertiary-container text-on-tertiary-container',
      isReturning: true,
      priorVisitCount: 2,
    },
    {
      id: 'p3',
      name: 'Mohd. Tariq',
      age: 61,
      gender: 'M',
      initials: 'MT',
      chiefComplaint: 'Chronic Joint Pain & Swelling',
      subComplaint: 'Both Knees • Stiffness in AM',
      priority: 'STANDARD',
      status: 'Waiting Room',
      avatarColor: 'bg-surface-variant text-on-surface-variant',
    },
    {
      id: 'p4',
      name: 'Pooja Verma',
      age: 29,
      gender: 'F',
      initials: 'PV',
      chiefComplaint: 'Acute Abdominal Cramps',
      subComplaint: 'Post-meal onset',
      priority: 'HIGH',
      status: 'Intake Complete',
      avatarColor: 'bg-tertiary-container text-on-tertiary-container',
    },
    {
      id: 'p5',
      name: 'Vikram Singh',
      age: 38,
      gender: 'M',
      initials: 'VS',
      chiefComplaint: 'High Fever & Chills',
      subComplaint: 'Temp: 102.4°F for 2 days',
      priority: 'STANDARD',
      status: 'Waiting Room',
      avatarColor: 'bg-surface-variant text-on-surface-variant',
    }
  ]);

  const [newArrivalAlert, setNewArrivalAlert] = useState<{ name: string; complaint: string; id: string } | null>(null);

  useEffect(() => {
    // Set formatted date
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    setCurrentDateStr(new Date().toLocaleDateString('en-US', options));

    checkAuth();
    loadLiveSessions();

    // Set polling interval for live real-time sync backup (every 4 seconds)
    const pollInterval = setInterval(() => {
      loadLiveSessions(true);
    }, 4000);

    // -------------------------------------------------------------
    // SUPABASE REALTIME SUBSCRIPTION FOR INTAKE & CLINICAL SUMMARIES
    // -------------------------------------------------------------
    const realtimeChannel = supabase
      .channel('doctor-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinical_summaries' },
        (payload) => {
          loadLiveSessions();
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const summary = payload.new;
            // Play notification sound / voice alert if supported
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance('New patient intake and clinical summary received.');
              utterance.volume = 0.6;
              window.speechSynthesis.speak(utterance);
            }

            setNewArrivalAlert({
              name: 'New Registered Patient',
              complaint: summary.chief_complaint || 'Intake summary generated',
              id: summary.patient_id || summary.id,
            });

            setTimeout(() => {
              setNewArrivalAlert(null);
            }, 8000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items' },
        () => loadLiveSessions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => loadLiveSessions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_sessions' },
        () => loadLiveSessions()
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const storedDoctorAuth = typeof window !== 'undefined' ? localStorage.getItem('careportal_doctor_auth') : null;
      if (storedDoctorAuth) {
        const parsed = JSON.parse(storedDoctorAuth);
        setUser(parsed);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        // Enforce login redirect
        router.replace('/login');
      }
    } catch (e) {
      router.replace('/login');
    }
  };

  const loadLiveSessions = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // 1. Fetch live clinical summaries directly from Supabase
      const { data: summaries } = await supabase
        .from('clinical_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // 2. Fetch live queue items
      const { data: queueItems } = await supabase
        .from('queue_items')
        .select('*')
        .order('added_at', { ascending: false })
        .limit(30);

      // 3. Fetch patients to map details
      const ptIdSet = new Set<string>();
      (summaries || []).forEach((s: any) => { if (s.patient_id) ptIdSet.add(s.patient_id); });
      (queueItems || []).forEach((q: any) => { if (q.patient_id) ptIdSet.add(q.patient_id); });

      // Also calculate prior summaries count per patient
      const summaryCountMap: Record<string, number> = {};
      (summaries || []).forEach((s: any) => {
        if (s.patient_id) {
          summaryCountMap[s.patient_id] = (summaryCountMap[s.patient_id] || 0) + 1;
        }
      });

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

      let liveItems: PatientQueueItem[] = [];

      if (summaries && summaries.length > 0) {
        // Group by patient_id to take latest summary for queue row
        const seenPatients = new Set<string>();

        summaries.forEach((s: any) => {
          const patId = s.patient_id || s.id;
          if (seenPatients.has(patId)) return;
          seenPatients.add(patId);

          const pat = patientMap[s.patient_id] || {};
          const name = pat.name || `Patient #${s.patient_id ? s.patient_id.slice(0, 5) : s.id.slice(0, 5)}`;
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'PT';
          const complaint = s.chief_complaint || 'AI Clinical Intake Summary';
          const isEmergency = complaint.toLowerCase().includes('chest') || complaint.toLowerCase().includes('emergency') || (s.red_flags && s.red_flags.length > 0);
          const isHigh = complaint.toLowerCase().includes('severe') || complaint.toLowerCase().includes('fever') || complaint.toLowerCase().includes('pain');
          const priorCount = summaryCountMap[s.patient_id] || 1;

          liveItems.push({
            id: s.patient_id || s.id,
            name: name,
            age: pat.age || 42,
            gender: pat.gender ? pat.gender[0].toUpperCase() : 'M',
            initials: initials,
            chiefComplaint: complaint,
            subComplaint: `AI Intake Complete • Live Conf: ${Math.round((s.ai_confidence || 0.94) * 100)}%`,
            priority: isEmergency ? 'EMERGENCY' : (isHigh ? 'HIGH' : 'STANDARD'),
            status: 'Intake Complete',
            avatarColor: isEmergency ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container',
            sessionId: s.session_id,
            patientId: pat.id || s.patient_id,
            isReturning: priorCount > 1,
            priorVisitCount: priorCount - 1,
          });
        });
      }

      // Merge queue items that might not have a clinical summary yet
      if (queueItems && queueItems.length > 0) {
        queueItems.forEach((q: any) => {
          const patId = q.patient_id || q.id;
          if (!liveItems.some(l => l.patientId === patId || l.id === patId)) {
            const pat = patientMap[q.patient_id] || {};
            const name = pat.name || 'Waiting Patient';
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'WP';
            const isCritical = q.priority === 'critical';
            const isUrgent = q.priority === 'urgent';

            liveItems.push({
              id: q.id,
              name: name,
              age: pat.age || 36,
              gender: pat.gender ? pat.gender[0].toUpperCase() : 'M',
              initials: initials,
              chiefComplaint: `${q.department || 'General Medicine'} Intake (${q.token_number || 'Token'})`,
              subComplaint: `Status: In Queue • Token ${q.token_number || 'TK-NEW'}`,
              priority: isCritical ? 'EMERGENCY' : (isUrgent ? 'HIGH' : 'STANDARD'),
              status: 'Waiting Room',
              avatarColor: isCritical ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant',
              sessionId: q.session_id,
              patientId: pat.id || q.patient_id,
            });
          }
        });
      }

      if (liveItems.length > 0) {
        setPatientQueue((prev) => {
          const combined = [...liveItems, ...prev.filter(p => !liveItems.some(l => l.id === p.id || (l.patientId && l.patientId === p.patientId)))];
          return combined;
        });

        setStats({
          todayOpd: 24 + liveItems.length,
          waiting: 8 + liveItems.filter((s: any) => s.status !== 'Completed').length,
          redFlags: 2 + liveItems.filter((s: any) => s.priority === 'EMERGENCY').length,
          completed: 14 + liveItems.filter((s: any) => s.status === 'Completed').length,
        });
      }

      setLastRefreshedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Realtime live sessions load notice:', e);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('careportal_doctor_auth');
      await supabase.auth.signOut();
    } catch (e) {}
    router.replace('/login');
  };

  const handleReviewPatient = (patient: PatientQueueItem) => {
    if (patient.patientId) {
      router.push(`/patient/${patient.patientId}`);
    } else {
      router.push(`/patient/${patient.id}`);
    }
  };

  const filteredQueue = patientQueue.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'emergency') return item.priority === 'EMERGENCY';
    if (activeTab === 'waiting') return item.status === 'Waiting Room' || item.status === 'In-Progress';
    return true;
  });

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen">
      
      {/* Top Header Bar */}
      <DoctorHeader 
        doctorName={user?.name ? `${user.name.toUpperCase()} (OPD)` : 'DR. SHARMA (OPD)'}
        initials={user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AS'}
      />

      {/* Fixed Left Navigation Sidebar */}
      <DoctorSidebar activePath="/dashboard" />

      {/* Main Content View */}
      <main className="pt-16 pl-64 min-h-screen flex flex-col">
        <div className="flex flex-col w-full h-full relative overflow-hidden bg-background">
          
          {/* Ambient Decorative Background Glows */}
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute -top-64 -right-64 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px]"></div>
            <div className="absolute top-1/2 -left-32 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[80px]"></div>
          </div>

          <div className="relative z-10 p-xl flex flex-col gap-lg w-full max-w-container-max mx-auto h-full">
            
            {/* Top Greeting & Action Header Row */}
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-xs">
                <span className="font-label-md text-label-md text-primary tracking-widest uppercase font-bold text-xs">
                  Overview
                </span>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-background">
                  Good Morning, Dr. Sharma
                </h1>
              </div>

              <div className="flex items-center gap-md">
                <button
                  onClick={() => loadLiveSessions(false)}
                  disabled={isRefreshing}
                  className="bg-white border border-outline-variant/50 hover:bg-slate-50 text-on-surface font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Click to fetch newest patient entries from Kiosk"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Live Queue'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                </button>

                <span className="font-body-sm text-sm text-on-surface-variant flex items-center gap-xs bg-white px-3 py-1.5 rounded-lg border border-outline-variant/40 shadow-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                  {currentDateStr || 'October 26, 2023'}
                </span>

                <button 
                  onClick={() => router.push('/dashboard')}
                  className="bg-primary hover:bg-[#005049] text-on-primary font-medium text-sm px-md py-2 rounded-lg flex items-center gap-xs hover:scale-[0.98] transition-transform duration-100 ease-in-out shadow-sm hover:shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>New Entry</span>
                </button>
              </div>
            </div>

            {/* Realtime Alert Banner for Incoming Intakes */}
            {newArrivalAlert && (
              <div className="bg-primary-container border-2 border-primary/40 rounded-xl p-4 flex items-center justify-between shadow-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider bg-primary text-on-primary px-2 py-0.5 rounded-full">LIVE INTAKE RECEIVED</span>
                      <span className="text-sm font-bold text-on-primary-container">{newArrivalAlert.name}</span>
                    </div>
                    <p className="text-xs text-on-primary-container/80 mt-0.5">
                      Clinical Summary Ready: <span className="font-semibold">{newArrivalAlert.complaint}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/patient/${newArrivalAlert.id}`)}
                  className="bg-primary hover:bg-[#005049] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Clinical Summary</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 4 Stat Summary Metric Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
              
              {/* Card 1: Today's OPD */}
              <div className="bg-surface-container-lowest p-md rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 group flex items-start justify-between border border-outline-variant/30">
                <div className="flex flex-col gap-xs">
                  <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Today's OPD
                  </span>
                  <span className="text-3xl font-extrabold text-on-surface group-hover:text-primary transition-colors">
                    {stats.todayOpd}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                  <span className="material-symbols-outlined text-[22px]">group</span>
                </div>
              </div>

              {/* Card 2: Waiting */}
              <div className="bg-surface-container-lowest p-md rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 group flex items-start justify-between border border-outline-variant/30">
                <div className="flex flex-col gap-xs">
                  <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Waiting
                  </span>
                  <span className="text-3xl font-extrabold text-on-surface group-hover:text-tertiary transition-colors">
                    {stats.waiting}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform duration-200">
                  <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                </div>
              </div>

              {/* Card 3: Red Flags */}
              <div className="bg-error-container p-md rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 group flex items-start justify-between relative overflow-hidden border border-error/20">
                <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent pointer-events-none"></div>
                <div className="flex flex-col gap-xs relative z-10">
                  <span className="font-label-md text-xs font-bold text-on-error-container uppercase tracking-wider">
                    Red Flags
                  </span>
                  <span className="text-3xl font-extrabold text-on-error-container">
                    {stats.redFlags}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center text-error relative z-10 group-hover:scale-110 transition-transform duration-200">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    warning
                  </span>
                </div>
              </div>

              {/* Card 4: Completed */}
              <div className="bg-surface-container-lowest p-md rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 group flex items-start justify-between border border-outline-variant/30">
                <div className="flex flex-col gap-xs">
                  <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Completed
                  </span>
                  <span className="text-3xl font-extrabold text-on-surface group-hover:text-secondary transition-colors">
                    {stats.completed}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform duration-200">
                  <span className="material-symbols-outlined text-[22px]">task_alt</span>
                </div>
              </div>

            </div>

            {/* Main 2-Column Split Layout */}
            <div className="flex flex-col lg:flex-row gap-lg flex-1 min-h-0">
              
              {/* Left Column (Patient Queue Table Card) */}
              <div className="flex-[3] flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30">
                
                {/* Table Header Controls */}
                <div className="p-md flex flex-col sm:flex-row items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/50 gap-3">
                  <h2 className="font-bold text-lg text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary text-[22px]">queue</span>
                    <span>Patient Queue</span>
                  </h2>

                  <div className="flex items-center gap-sm relative w-full sm:w-auto">
                    <span className="material-symbols-outlined absolute left-sm text-outline top-1/2 -translate-y-1/2 text-[18px]">
                      search
                    </span>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-xl pr-md py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all w-full sm:w-64"
                      placeholder="Search patient..."
                      type="text"
                    />
                  </div>
                </div>

                {/* Queue Table */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead className="sticky top-0 bg-surface-container-lowest z-10 shadow-xs border-b border-outline-variant/30">
                      <tr>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          Patient Name
                        </th>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          Age/Sex
                        </th>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider w-1/3">
                          Chief Complaint
                        </th>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          Status
                        </th>
                        <th className="p-md text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="text-sm">
                      {filteredQueue.map((patient) => {
                        const isEmergency = patient.priority === 'EMERGENCY';
                        const isHigh = patient.priority === 'HIGH';

                        return (
                          <tr
                            key={patient.id}
                            className={`transition-colors border-b border-outline-variant/20 group cursor-pointer ${
                              isEmergency
                                ? 'bg-error/5 hover:bg-error/10'
                                : 'hover:bg-surface-container-low'
                            }`}
                            onClick={() => handleReviewPatient(patient)}
                          >
                            {/* Patient Name */}
                            <td className="p-md">
                              <div className="flex items-center gap-sm">
                                {patient.imageUrl ? (
                                  <img
                                    src={patient.imageUrl}
                                    alt={patient.name}
                                    className="w-8 h-8 rounded-full object-cover shadow-2xs"
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${patient.avatarColor || 'bg-primary-container text-on-primary-container'}`}>
                                    {patient.initials}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-semibold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
                                    {patient.name}
                                    {patient.isReturning && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                        Returning ({patient.priorVisitCount || 1} Prior)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Age/Sex */}
                            <td className="p-md text-on-surface-variant font-medium">
                              {patient.age} / {patient.gender}
                            </td>

                            {/* Chief Complaint */}
                            <td className="p-md">
                              <div className="flex flex-col">
                                <span className="text-on-surface font-medium">
                                  {patient.chiefComplaint}
                                </span>
                                {patient.subComplaint && (
                                  <span className={`text-xs flex items-center gap-1 mt-0.5 ${
                                    isEmergency ? 'text-error font-semibold' : 'text-on-surface-variant'
                                  }`}>
                                    {isEmergency && (
                                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    )}
                                    {patient.subComplaint}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Priority Badge */}
                            <td className="p-md">
                              {isEmergency ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-error text-on-error rounded-md text-[11px] font-bold tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-on-error animate-pulse"></span>
                                  EMERGENCY
                                </span>
                              ) : isHigh ? (
                                <span className="inline-flex px-2.5 py-1 bg-tertiary-container text-on-tertiary-container rounded-md text-[11px] font-bold tracking-wider">
                                  HIGH
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-1 bg-surface-variant text-on-surface-variant rounded-md text-[11px] font-bold tracking-wider">
                                  LOW
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-md">
                              {patient.status === 'In-Progress' ? (
                                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                  In-Progress
                                </span>
                              ) : (
                                <span className="text-xs text-on-surface-variant font-medium">
                                  {patient.status}
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="p-md text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReviewPatient(patient);
                                }}
                                className={`px-3 py-1.5 bg-surface border border-outline-variant text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-variant transition-colors ${
                                  isEmergency
                                    ? 'group-hover:border-error group-hover:text-error'
                                    : 'group-hover:border-primary group-hover:text-primary'
                                }`}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredQueue.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-on-surface-variant">
                            No matching patients found in queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Right Column (Alerts & OPD Flow) */}
              <div className="flex-1 flex flex-col gap-md">
                
                {/* Alerts Card */}
                <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant/30">
                  <h3 className="font-bold text-base text-on-surface mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">notifications_active</span>
                    <span>Alerts</span>
                  </h3>

                  <div className="flex flex-col gap-sm">
                    {/* Alert 1 */}
                    <div className="p-sm bg-tertiary-container/10 border border-tertiary/20 rounded-lg flex items-start gap-sm">
                      <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">biotech</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">Lab Results Ready</span>
                        <span className="text-[11px] text-on-surface-variant">P. Singh - Lipid Profile</span>
                      </div>
                    </div>

                    {/* Alert 2 */}
                    <div className="p-sm bg-surface-container-low border border-outline-variant/30 rounded-lg flex items-start gap-sm hover:bg-surface-variant transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">campaign</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">Department Meeting</span>
                        <span className="text-[11px] text-on-surface-variant">14:00 PM - Conf Room B</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OPD Flow Bar Chart Card */}
                <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant/30 flex-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <h3 className="font-bold text-base text-on-surface mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">analytics</span>
                    <span>OPD Flow</span>
                  </h3>

                  <div className="flex-1 flex flex-col justify-end items-center h-48 relative">
                    {/* SVG Background Curve */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <svg className="w-full h-full text-secondary" fill="currentColor" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="M0,100 L0,80 Q25,60 50,70 T100,40 L100,100 Z"></path>
                      </svg>
                    </div>

                    {/* Bar Columns */}
                    <div className="flex items-end justify-between w-full h-32 px-md relative z-10 gap-xs">
                      <div className="w-full bg-primary/20 rounded-t-sm h-[30%] hover:bg-primary transition-colors cursor-pointer" title="9AM: 8 Patients"></div>
                      <div className="w-full bg-primary/40 rounded-t-sm h-[50%] hover:bg-primary transition-colors cursor-pointer" title="10AM: 14 Patients"></div>
                      <div className="w-full bg-primary/60 rounded-t-sm h-[80%] hover:bg-primary transition-colors cursor-pointer" title="11AM: 20 Patients"></div>
                      <div className="w-full bg-primary rounded-t-sm h-[100%] hover:bg-primary-fixed-dim transition-colors relative group/bar cursor-pointer" title="12PM: 26 Patients (Peak)">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold py-[2px] px-[6px] rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-xs">
                          Peak
                        </div>
                      </div>
                      <div className="w-full bg-primary/30 rounded-t-sm h-[40%] hover:bg-primary transition-colors cursor-pointer" title="1PM: 10 Patients"></div>
                    </div>

                    {/* Timeline X-Axis Labels */}
                    <div className="flex justify-between w-full px-md mt-xs">
                      <span className="font-bold text-[10px] text-outline">9AM</span>
                      <span className="font-bold text-[10px] text-outline">1PM</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      </main>

    </div>
  );
}
