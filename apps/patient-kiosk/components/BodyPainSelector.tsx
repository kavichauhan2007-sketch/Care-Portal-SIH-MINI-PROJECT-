'use client';

import { useState, Suspense, lazy } from 'react';
import { Card } from '@/components/ui/card';

// Lazy load Three.js components to reduce bundle size
const Body3DCanvas = lazy(() => import('./Body3DCanvas'));

interface PainPoint {
  id: string;
  region: string;
  severity: number;
}

interface BodyPainSelectorProps {
  onPainPointsChange: (points: PainPoint[]) => void;
}


export default function BodyPainSelector({ onPainPointsChange }: BodyPainSelectorProps) {
  const [use3D, setUse3D] = useState(true);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [view, setView] = useState<'front' | 'back'>('front');

  // 2D body regions for fallback
  const bodyRegions = {
    front: [
      { id: 'head', label: 'Head', top: '2%', left: '42%', width: '16%', height: '10%' },
      { id: 'neck', label: 'Neck', top: '12%', left: '44%', width: '12%', height: '5%' },
      { id: 'chest', label: 'Chest', top: '17%', left: '36%', width: '28%', height: '14%' },
      { id: 'abdomen', label: 'Abdomen', top: '31%', left: '37%', width: '26%', height: '12%' },
      { id: 'left_arm', label: 'L. Arm', top: '18%', left: '20%', width: '12%', height: '22%' },
      { id: 'right_arm', label: 'R. Arm', top: '18%', left: '68%', width: '12%', height: '22%' },
      { id: 'left_thigh', label: 'L. Thigh', top: '44%', left: '36%', width: '13%', height: '18%' },
      { id: 'right_thigh', label: 'R. Thigh', top: '44%', left: '51%', width: '13%', height: '18%' },
      { id: 'left_calf', label: 'L. Calf', top: '62%', left: '36%', width: '11%', height: '16%' },
      { id: 'right_calf', label: 'R. Calf', top: '62%', left: '53%', width: '11%', height: '16%' },
    ],
    back: [
      { id: 'head_back', label: 'Head', top: '2%', left: '42%', width: '16%', height: '10%' },
      { id: 'upper_back', label: 'Upper Back', top: '17%', left: '36%', width: '28%', height: '16%' },
      { id: 'lower_back', label: 'Lower Back', top: '33%', left: '37%', width: '26%', height: '14%' },
      { id: 'left_shoulder', label: 'L. Shoulder', top: '15%', left: '24%', width: '12%', height: '10%' },
      { id: 'right_shoulder', label: 'R. Shoulder', top: '15%', left: '64%', width: '12%', height: '10%' },
    ],
  };

  const handleRegionSelect = (regionId: string) => {
    const existing = painPoints.find(p => p.id === regionId);
    if (existing) {
      // Remove if already selected
      const updated = painPoints.filter(p => p.id !== regionId);
      setPainPoints(updated);
      onPainPointsChange(updated);
    } else {
      // Add new point with default severity
      const newPoint: PainPoint = {
        id: regionId,
        region: regionId.replace(/_/g, ' '),
        severity: 5,
      };
      const updated = [...painPoints, newPoint];
      setPainPoints(updated);
      onPainPointsChange(updated);
    }
  };

  const updateSeverity = (id: string, severity: number) => {
    const updated = painPoints.map(p => 
      p.id === id ? { ...p, severity } : p
    );
    setPainPoints(updated);
    onPainPointsChange(updated);
  };

  const removePoint = (id: string) => {
    const updated = painPoints.filter(p => p.id !== id);
    setPainPoints(updated);
    onPainPointsChange(updated);
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return 'text-green-700 bg-green-50 border-green-200';
    if (severity <= 6) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <Card className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-[#151c27]">Where does it hurt?</h3>
        <p className="text-sm text-[#5C5C5C] mt-1">
          {use3D ? 'Rotate and click on the 3D model to mark pain areas' : 'Tap body regions to mark pain areas'}
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setUse3D(!use3D)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-[#bcc9c6] bg-white text-[#5C5C5C] hover:bg-[#f0f3ff] transition-colors"
        >
          {use3D ? '2D View' : '3D View'}
        </button>
        {!use3D && (
          <>
            <button
              onClick={() => setView('front')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === 'front'
                  ? 'bg-[#00685f] text-white'
                  : 'bg-[#f0f3ff] text-[#5C5C5C] hover:bg-[#e7eefe]'
              }`}
            >
              Front View
            </button>
            <button
              onClick={() => setView('back')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === 'back'
                  ? 'bg-[#00685f] text-white'
                  : 'bg-[#f0f3ff] text-[#5C5C5C] hover:bg-[#e7eefe]'
              }`}
            >
              Back View
            </button>
          </>
        )}
      </div>

      {/* Body Visualization */}
      <div className="relative min-h-[400px] md:min-h-[500px] mb-4">
        {use3D ? (
          <Suspense fallback={
            <div className="w-full h-[400px] md:h-[500px] bg-gradient-to-b from-[#f0f7f4] to-[#e8f5ef] rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#00685f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-[#5C5C5C]">Loading 3D Model...</p>
              </div>
            </div>
          }>
            <div className="w-full h-[400px] md:h-[500px]">
              <Body3DCanvas
                selectedRegions={painPoints}
                onRegionSelect={(regions) => {
                  setPainPoints(regions);
                  onPainPointsChange(regions);
                }}
              />
            </div>
          </Suspense>
        ) : (
          <div className="relative w-full h-[400px] md:h-[500px] bg-gradient-to-b from-[#f0f7f4] to-[#e8f5ef] rounded-xl border border-[#bcc9c6] overflow-hidden">
            {/* 2D Body SVG Background */}
            <svg
              viewBox="0 0 100 300"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
              preserveAspectRatio="xMidYMid meet"
            >
              <ellipse cx="50" cy="10" rx="9" ry="10" fill="none" stroke="#B8D4C8" strokeWidth="1.5" />
              <line x1="50" y1="20" x2="50" y2="35" stroke="#B8D4C8" strokeWidth="2" />
              <ellipse cx="50" cy="55" rx="14" ry="19" fill="none" stroke="#B8D4C8" strokeWidth="1.5" />
              <ellipse cx="50" cy="83" rx="13" ry="13" fill="none" stroke="#B8D4C8" strokeWidth="1.5" />
              <line x1="36" y1="36" x2="22" y2="65" stroke="#B8D4C8" strokeWidth="2" />
              <line x1="64" y1="36" x2="78" y2="65" stroke="#B8D4C8" strokeWidth="2" />
              <line x1="44" y1="96" x2="40" y2="145" stroke="#B8D4C8" strokeWidth="2" />
              <line x1="56" y1="96" x2="60" y2="145" stroke="#B8D4C8" strokeWidth="2" />
              <line x1="40" y1="145" x2="38" y2="195" stroke="#B8D4C8" strokeWidth="2" />
              <line x1="60" y1="145" x2="62" y2="195" stroke="#B8D4C8" strokeWidth="2" />
            </svg>

            {/* Interactive Regions */}
            {bodyRegions[view].map((region) => {
              const isSelected = painPoints.some(p => p.id === region.id);
              return (
                <button
                  key={region.id}
                  onClick={() => handleRegionSelect(region.id)}
                  className={`absolute transition-all duration-200 rounded-lg border-2 ${
                    isSelected
                      ? 'bg-[#00685f]/30 border-[#00685f] scale-105'
                      : 'bg-[#B8D4C8]/20 border-[#B8D4C8]/40 hover:bg-[#B8D4C8]/40 hover:scale-105'
                  }`}
                  style={{
                    top: region.top,
                    left: region.left,
                    width: region.width,
                    height: region.height,
                  }}
                  title={region.label}
                >
                  <span className="sr-only">{region.label}</span>
                </button>
              );
            })}

            {/* Instruction Text */}
            {painPoints.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center bg-white/90 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium text-[#151c27]">Tap body areas to mark pain</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pain Points List */}
      {painPoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-[#151c27] text-sm uppercase tracking-wide">
            Selected Pain Areas ({painPoints.length})
          </h4>
          {painPoints.map((point) => (
            <div
              key={point.id}
              className={`p-4 rounded-lg border-2 transition-all ${getSeverityColor(point.severity)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-semibold capitalize">{point.region}</span>
                  <p className="text-xs mt-1 opacity-75">Pain Level: {point.severity}/10</p>
                </div>
                <button
                  onClick={() => removePoint(point.id)}
                  className="text-sm font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span>Mild</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={point.severity}
                    onChange={(e) => updateSeverity(point.id, parseInt(e.target.value))}
                    className="flex-1 h-2 accent-[#00685f]"
                  />
                  <span>Severe</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 p-3 bg-[#f0f7f4] border border-[#bcc9c6] rounded-lg">
        <p className="text-xs text-[#5C5C5C]">
          <strong className="text-[#00685f]">Tip:</strong> Mark all painful areas and adjust severity using the slider (1=mild discomfort, 10=unbearable pain).
        </p>
      </div>
    </Card>
  );
}
