'use client';

// Placeholder for 3D body model
// In production, this would use @react-three/fiber for WebGL rendering
// For now, returning a simplified version

interface PainPoint {
  id: string;
  region: string;
  severity: number;
}

interface Body3DCanvasProps {
  selectedRegions: PainPoint[];
  onRegionSelect: (regions: PainPoint[]) => void;
}

export default function Body3DCanvas({ selectedRegions, onRegionSelect }: Body3DCanvasProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f0f7f4] to-[#e8f5ef] rounded-xl border border-[#bcc9c6] flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🧍</div>
        <p className="text-sm text-[#5C5C5C] mb-2">3D Model Preview</p>
        <p className="text-xs text-[#5C5C5C] opacity-75">
          Switch to 2D view to mark pain areas
        </p>
        <p className="text-xs text-[#5C5C5C] opacity-50 mt-4">
          Full 3D model requires Three.js libraries
        </p>
      </div>
    </div>
  );
}
