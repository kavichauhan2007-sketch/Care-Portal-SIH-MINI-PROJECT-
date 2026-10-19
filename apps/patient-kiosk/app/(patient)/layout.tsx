'use client';

import { Progress } from '@/components/ui/progress';
import { usePathname } from 'next/navigation';
import MediBot from '@/components/MediBot';

const steps = [
  { path: '/identity', label: 'Identity', labelHi: 'पहचान' },
  { path: '/consent', label: 'Consent', labelHi: 'सहमति' },
  { path: '/symptoms', label: 'Symptoms', labelHi: 'लक्षण' },
  { path: '/pain-location', label: 'Pain', labelHi: 'दर्द' },
  { path: '/history', label: 'History', labelHi: 'इतिहास' },
  { path: '/documents', label: 'Documents', labelHi: 'दस्तावेज़' },
  { path: '/family', label: 'Family', labelHi: 'परिवार' },
  { path: '/review', label: 'Review', labelHi: 'समीक्षा' },
  { path: '/complete', label: 'Complete', labelHi: 'पूर्ण' },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const currentStepIndex = steps.findIndex(step => pathname?.includes(step.path));
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  const isStandalonePage = 
    pathname === '/identity' || 
    pathname === '/consent' || 
    pathname === '/symptoms' || 
    pathname === '/complaint' ||
    pathname === '/documents' ||
    pathname === '/history' ||
    pathname === '/family' ||
    pathname === '/review' ||
    pathname === '/complete' ||
    pathname === '/pain-location';

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f5ef]">
      {/* Progress Bar */}
      <div className="w-full bg-white/90 backdrop-blur-md border-b border-[#bcc9c6] sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs md:text-sm font-medium text-[#5C5C5C]">
              Step {currentStepIndex + 1} of {steps.length}
            </h2>
            <span className="text-xs md:text-sm text-[#5C5C5C]">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Pills - Hidden on mobile, visible on md+ */}
          <div className="hidden md:flex items-center gap-2 mt-3 overflow-x-auto">
            {steps.map((step, idx) => (
              <div
                key={step.path}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  idx <= currentStepIndex
                    ? 'bg-[#00685f] text-white'
                    : 'bg-[#f0f3ff] text-[#5C5C5C]'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-sm border-t border-[#bcc9c6] py-2 md:py-3 px-4 md:px-6 text-center text-xs text-[#5C5C5C] z-30">
        🔒 Your information is confidential and secure
      </footer>
    </div>
  );
}
