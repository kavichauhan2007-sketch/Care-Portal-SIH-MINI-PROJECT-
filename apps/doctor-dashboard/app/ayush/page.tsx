'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DoctorHeader, DoctorSidebar } from '@/components/DoctorNavigation';
import { 
  Sparkles, 
  Search, 
  Activity, 
  Heart, 
  Leaf, 
  Plus, 
  CheckCircle2, 
  HelpCircle,
  Stethoscope,
  Info
} from 'lucide-react';

export default function AyushPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>({
    name: 'Priya Sharma',
    age: 35,
    gender: 'Female',
    id: 'HOSP002',
    prakriti: { vata: 45, pitta: 35, kapha: 20 },
    dominantDosha: 'Vata-Pitta',
    agni: 'Tikshnagni (Intense / Variable)',
    koshtha: 'Krura (Tendency to Constipation)',
    recommendedDiet: ['Warm soups & ghee', 'Moong dal khichdi', 'Sweet & sour fruits', 'Avoid cold / dry foods'],
    herbalRegimen: [
      { herb: 'Ashwagandha Churna', dosage: '3g with warm milk at bedtime', purpose: 'Nervine tonic & Vata pacification' },
      { herb: 'Triphala Churna', dosage: '5g with lukewarm water', purpose: 'Digestive balance & detox' },
      { herb: 'Brahmi Vati', dosage: '1 tab BD after meals', purpose: 'Mental clarity & stress reduction' },
    ]
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('careportal_doctor_auth') : null;
    if (stored) {
      setUser(JSON.parse(stored));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUser(user);
    else router.replace('/login');
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen">
      
      {/* Top Header */}
      <DoctorHeader 
        doctorName={user?.name ? `${user.name.toUpperCase()} (OPD)` : 'DR. SHARMA (OPD)'}
        initials={user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AS'}
      />

      {/* Sidebar */}
      <DoctorSidebar activePath="/ayush" />

      {/* Main Content */}
      <main className="pt-16 pl-64 min-h-screen flex flex-col bg-background">
        <div className="p-xl max-w-container-max mx-auto w-full flex flex-col gap-lg">
          
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Integrated Holistic Medicine</span>
            <h1 className="text-3xl font-extrabold text-on-background mt-1">AYUSH & Prakriti Assessment</h1>
          </div>

          {/* Patient Header Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-2xl border border-amber-200">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-on-surface">{selectedPatient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00685f] text-xs font-bold border border-teal-200">
                    Primary: {selectedPatient.dominantDosha}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {selectedPatient.age} Yrs / {selectedPatient.gender} • ID: {selectedPatient.id} • Agni: {selectedPatient.agni}
                </p>
              </div>
            </div>

            <button
              onClick={() => alert('Exporting AYUSH Integrated Treatment Plan')}
              className="px-5 py-2.5 bg-primary hover:bg-[#005049] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Export AYUSH Prescription
            </button>
          </div>

          {/* 3-Column Bento Breakdown (Dosha, Diet, Formulations) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Dosha Balance Bar Meter */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Tridosha Analysis</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-blue-700">Vata (Air & Space)</span>
                      <span>{selectedPatient.prakriti.vata}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedPatient.prakriti.vata}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-orange-700">Pitta (Fire & Water)</span>
                      <span>{selectedPatient.prakriti.pitta}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${selectedPatient.prakriti.pitta}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-700">Kapha (Earth & Water)</span>
                      <span>{selectedPatient.prakriti.kapha}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedPatient.prakriti.kapha}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant mt-4 p-3 bg-surface-container-low rounded-xl">
                💡 <em>Vata dominance requires grounding warm foods, steady sleep routines, and oil massage (Abhyanga).</em>
              </p>
            </div>

            {/* Column 2: Ahara (Dietary Directives) */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30">
              <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <span>Ahara & Vihara Guidelines</span>
              </h3>

              <ul className="space-y-2.5 text-xs text-on-surface">
                {selectedPatient.recommendedDiet.map((diet: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 bg-surface-container-low rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{diet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Recommended Herbal Formulations */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30">
              <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Herbal Formulations (Aushadhi)</span>
              </h3>

              <div className="space-y-3">
                {selectedPatient.herbalRegimen.map((herb: any, idx: number) => (
                  <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                    <h4 className="font-bold text-xs text-amber-900">{herb.herb}</h4>
                    <p className="text-[11px] text-amber-800 font-medium">{herb.dosage}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{herb.purpose}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
