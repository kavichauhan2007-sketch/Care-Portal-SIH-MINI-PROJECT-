'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Monitor, 
  Users, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  RotateCw, 
  Settings, 
  Power, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Server,
  Network,
  Clock,
  Sparkles
} from 'lucide-react';

export default function AdminPortalPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);

  // Kiosk Fleet State
  const [kiosks, setKiosks] = useState([
    { id: 'KSK-0921', name: 'Main Lobby Kiosk #1', location: 'Ground Floor OPD Entrance', status: 'Online', battery: '100% (AC)', activeSessions: 142, lastPing: 'Just now' },
    { id: 'KSK-0922', name: 'Emergency Wing Kiosk #2', location: 'Trauma & Emergency Bay', status: 'Online', battery: '100% (AC)', activeSessions: 98, lastPing: 'Just now' },
    { id: 'KSK-0923', name: 'Cardiology Bay Kiosk #3', location: '1st Floor Heart Wing', status: 'Online', battery: '100% (AC)', activeSessions: 76, lastPing: '1 min ago' },
    { id: 'KSK-0924', name: 'Pediatrics & Ayush Kiosk #4', location: '2nd Floor AYUSH Block', status: 'Maintenance', battery: 'Offline', activeSessions: 0, lastPing: '18 mins ago' },
  ]);

  // Doctor Allocations State
  const [doctors, setDoctors] = useState([
    { name: 'Dr. Amit Sharma', email: 'dr.sharma@careportal.health', specialty: 'General Medicine & Triage', room: 'OPD Room 102', activeQueue: 8, status: 'Active' },
    { name: 'Dr. Sarah Chen', email: 'dr.chen@careportal.health', specialty: 'Cardiology & Critical Care', room: 'OPD Room 104', activeQueue: 4, status: 'Active' },
    { name: 'Dr. Rajesh Verma', email: 'dr.verma@careportal.health', specialty: 'Orthopedics & Spine', room: 'OPD Room 204', activeQueue: 6, status: 'Active' },
    { name: 'Dr. Anita Nair', email: 'dr.nair@careportal.health', specialty: 'Internal Medicine & Pulmonology', room: 'OPD Room 106', activeQueue: 3, status: 'Active' },
    { name: 'Dr. Vikram Malhotra', email: 'dr.malhotra@careportal.health', specialty: 'Gastroenterology', room: 'OPD Room 305', activeQueue: 5, status: 'Active' },
  ]);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('careportal_doctor_auth') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      setAdminUser(parsed);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAdminUser(user);
    } else {
      router.replace('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('careportal_doctor_auth');
    router.replace('/login');
  };

  const handleRebootKiosk = (kioskId: string) => {
    alert(`Sending remote restart & self-calibration command to ${kioskId}...`);
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen">
      
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant h-16 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-full w-full px-lg flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-title-lg text-[#0058be] uppercase tracking-tight font-bold text-lg">
                CarePortal Administration Station
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono block -mt-1">
                Central Kiosk Fleet & Hospital Triage Controller
              </span>
            </div>
          </div>

          <div className="flex items-center gap-md">
            <div className="flex items-center gap-sm bg-blue-50 px-md py-xs rounded-full border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-label-md text-blue-900 font-bold tracking-wide">
                HOSPITAL OPS (CENTRAL)
              </span>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-variant transition-colors"
            >
              Doctor View
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-8 max-w-container-max mx-auto w-full pb-16 flex flex-col gap-8">
        
        {/* System Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/30 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active Kiosks</span>
              <h3 className="text-3xl font-extrabold text-on-surface mt-1">3 / 4</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">99.8% Fleet Uptime</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/30 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Today's Total Intake</span>
              <h3 className="text-3xl font-extrabold text-on-surface mt-1">316</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Avg 3.2 mins per registration</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/30 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Gemini AI Latency</span>
              <h3 className="text-3xl font-extrabold text-on-surface mt-1">420ms</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">SOCRATES Prompts Healthy</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/30 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">ABDM / M1 Network</span>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">SYNCED</h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-1">FHIR Bundles Validated</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Section 1: Kiosk Fleet Management */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-xs border border-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <span>Physical Kiosk Stations Deployment</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Real-time hardware heartbeat, optical OCR scanners, and peripheral status.
              </p>
            </div>

            <button
              onClick={() => alert('Scanning network for new CarePortal Kiosk nodes...')}
              className="px-4 py-2 bg-primary hover:bg-[#005049] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy New Kiosk</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kiosks.map((kiosk) => (
              <div key={kiosk.id} className="p-4 rounded-2xl border border-outline-variant/40 bg-surface flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-primary">{kiosk.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      kiosk.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {kiosk.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-on-surface">{kiosk.name}</h3>
                  <p className="text-[11px] text-on-surface-variant mb-3">{kiosk.location}</p>

                  <div className="text-[11px] space-y-1 bg-surface-container-low p-2.5 rounded-xl text-on-surface-variant font-medium">
                    <div className="flex justify-between">
                      <span>Power:</span> <strong>{kiosk.battery}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessions Today:</span> <strong>{kiosk.activeSessions}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Heartbeat:</span> <strong>{kiosk.lastPing}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/30">
                  <button
                    onClick={() => handleRebootKiosk(kiosk.id)}
                    className="flex-1 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Recalibrate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Doctor Rostering & Room Allocation */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-xs border border-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Doctor Scheduling & OPD Room Allocation</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Active physician roster, current patient load balancing, and consultation bays.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant/30 text-xs font-bold uppercase text-on-surface-variant">
                <tr>
                  <th className="p-md">Doctor Name</th>
                  <th className="p-md">Specialty</th>
                  <th className="p-md">Assigned OPD Room</th>
                  <th className="p-md">Active Queue</th>
                  <th className="p-md">Status</th>
                  <th className="p-md text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {doctors.map((doc, i) => (
                  <tr key={i} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                    <td className="p-md">
                      <strong className="text-on-surface block">{doc.name}</strong>
                      <span className="text-xs text-on-surface-variant font-mono">{doc.email}</span>
                    </td>
                    <td className="p-md font-medium text-xs text-on-surface">
                      {doc.specialty}
                    </td>
                    <td className="p-md font-bold text-xs text-primary">
                      {doc.room}
                    </td>
                    <td className="p-md">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {doc.activeQueue} Patients
                      </span>
                    </td>
                    <td className="p-md">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-md text-right">
                      <button
                        onClick={() => alert(`Reallocating room or shift for ${doc.name}`)}
                        className="px-3 py-1.5 bg-surface border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-variant transition-colors"
                      >
                        Reallocate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

    </div>
  );
}
