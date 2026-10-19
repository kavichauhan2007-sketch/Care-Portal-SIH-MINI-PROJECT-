'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutGrid, 
  ListPlus, 
  Contact, 
  FileText, 
  Leaf, 
  LogOut,
  Plus,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface DoctorHeaderProps {
  doctorName?: string;
  department?: string;
  initials?: string;
}

export function DoctorHeader({
  doctorName = 'DR. SHARMA (OPD)',
  department = 'CarePortal Clinical',
  initials = 'AS',
}: DoctorHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('careportal_doctor_auth');
      await supabase.auth.signOut();
    } catch (e) {}
    router.replace('/login');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant h-16 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-full w-full px-6 md:px-8 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-[#00685f]/20 flex items-center justify-center text-[#00685f] shadow-xs">
            <Plus className="w-5 h-5 stroke-[2.75]" />
          </div>
          <span className="font-title-lg text-primary uppercase tracking-tight font-bold text-lg">
            CarePortal Clinical
          </span>
        </div>

        {/* Right Doctor Pill & Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold text-on-surface-variant tracking-wide uppercase">
              {doctorName}
            </span>
          </div>

          <div 
            onClick={handleLogout}
            title="Click to Sign Out"
            className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-sm cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
          >
            {initials}
          </div>
        </div>

      </div>
    </header>
  );
}

interface DoctorSidebarProps {
  activePath?: string;
}

export function DoctorSidebar({ activePath }: DoctorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = activePath || pathname;

  const handleLogout = async () => {
    try {
      localStorage.removeItem('careportal_doctor_auth');
      await supabase.auth.signOut();
    } catch (e) {}
    router.replace('/login');
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="14" rx="1.5" />
          <rect width="7" height="7" x="3" y="14" rx="1.5" />
        </svg>
      ),
      isActive: currentPath === '/dashboard' || currentPath === '/',
    },
    {
      label: 'Patient Queue',
      href: '/queue',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h16" />
          <path d="M4 16h16" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 7v10" />
        </svg>
      ),
      isActive: currentPath === '/queue' || currentPath === '/patient-queue',
    },
    {
      label: 'Clinical Records',
      href: '/records',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h4" />
          <circle cx="16" cy="15" r="1.5" />
        </svg>
      ),
      isActive: currentPath === '/records' || currentPath === '/clinical-records' || currentPath === '/patient-clinical-summary',
    },
    {
      label: 'Medical Reports',
      href: '/reports',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      ),
      isActive: currentPath === '/reports' || currentPath === '/medical-reports',
    },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-low border-r border-outline-variant overflow-y-auto z-40">
      <nav className="p-4 flex flex-col gap-1.5 h-full">
        
        {/* Main Navigation Links */}
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-3.5 h-12 px-4 rounded-xl transition-all font-semibold text-sm w-full text-left ${
              item.isActive
                ? 'bg-[#008378] text-white shadow-sm'
                : 'text-[#3d4947] hover:bg-[#dce2f3] hover:text-[#151c27]'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="tracking-tight">{item.label}</span>
          </button>
        ))}

        {/* Divider */}
        <div className="my-2 border-t border-[#bcc9c6]/60 mx-2" />

        {/* AYUSH Assessment */}
        <button
          onClick={() => router.push('/ayush')}
          className={`flex items-center gap-3.5 h-12 px-4 rounded-xl transition-all font-semibold text-sm w-full text-left ${
            currentPath === '/ayush' || currentPath === '/ayush-assessment'
              ? 'bg-[#008378] text-white shadow-sm'
              : 'text-[#3d4947] hover:bg-[#dce2f3] hover:text-[#151c27]'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          <span className="tracking-tight">AYUSH Assessment</span>
        </button>

        {/* Sign Out Button (Styled in Red as in reference) */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 h-12 px-4 rounded-xl text-[#ba1a1a] hover:bg-[#ffdad6]/60 transition-colors font-bold text-sm w-full text-left mt-auto mb-2"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span className="tracking-tight">Sign Out</span>
        </button>

      </nav>
    </aside>
  );
}
