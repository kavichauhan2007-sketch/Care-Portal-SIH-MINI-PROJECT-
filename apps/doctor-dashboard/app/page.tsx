'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check local doctor auth session first
      const storedDoctorAuth = typeof window !== 'undefined' ? localStorage.getItem('careportal_doctor_auth') : null;
      if (storedDoctorAuth) {
        const parsed = JSON.parse(storedDoctorAuth);
        if (parsed.role === 'admin') {
          router.replace('/admin');
          return;
        }
        router.replace('/dashboard');
        return;
      }

      // Check Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/dashboard');
      } else {
        // Enforce login first!
        router.replace('/login');
      }
    } catch (e) {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center p-6 text-[#151c27]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-[#00685f]/30 flex items-center justify-center text-[#00685f] shadow-sm animate-pulse">
          <span className="material-symbols-outlined text-[28px]">local_hospital</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#00685f]">CarePortal Clinical</h2>
          <p className="text-xs text-[#64748b] mt-1">Verifying medical session authorization...</p>
        </div>
      </div>
    </div>
  );
}
