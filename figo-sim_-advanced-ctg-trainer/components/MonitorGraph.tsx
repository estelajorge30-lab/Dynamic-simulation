import React, { useMemo, useRef, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea } from 'recharts';
import { DataPoint, PaperSpeed } from '../types';

interface MonitorGraphProps {
  data: DataPoint[];
  paperSpeed: PaperSpeed;
  showRuler: boolean;
}

const MonitorGraph: React.FC<MonitorGraphProps> = ({ data, paperSpeed, showRuler }) => {
  // FIGO standard: Vertical scale 20 or 30 bpm/cm.
  // Horizontal: 1, 2, or 3 cm/min.
  // To simulate "Paper Speed" in a fixed viewport width, we change the time domain (window size).
  // Standard viewport: 10 minutes (widely used for baseline estimation).
  
  // If 1cm/min = 10 mins visible is standard.
  // If 3cm/min = We see less time in the same physical space (zoomed in), e.g., ~3.3 mins.
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  
  const windowSeconds = useMemo(() => {
    switch(paperSpeed) {
      case 1: return 600; // 10 minutes
      case 2: return 300; // 5 minutes
      case 3: return 200; // 3.33 minutes (approx)
      default: return 600;
    }
  }, [paperSpeed]);

  const latestTime = data.length > 0 ? data[data.length - 1].time : 0;
  const minTime = Math.max(0, latestTime - windowSeconds);

  // Filter data for performance to only render visible range + buffer
  const visibleData = data.filter(d => d.time >= minTime);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!showRuler || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x >= 0 && x <= rect.width) {
      setMouseX(x);
    } else {
      setMouseX(null);
    }
  };

  const handleMouseLeave = () => {
    setMouseX(null);
  };

  useEffect(() => {
    if (!showRuler) setMouseX(null);
  }, [showRuler]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`flex flex-col h-full bg-white relative rounded-sm overflow-hidden border-4 border-slate-300 shadow-inner ${showRuler ? 'cursor-crosshair' : ''}`}
    >
      {/* Background Grid Pattern CSS is handled in index.html for finer control, 
          but Recharts Grid helps align the axis ticks */}
      
      {/* Ruler Overlay */}
      {showRuler && mouseX !== null && (
        <div 
          className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-50 pointer-events-none shadow-[0_0_4px_rgba(239,68,68,0.4)]"
          style={{ left: mouseX }}
        >
          <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono shadow-sm">
            ▼
          </div>
        </div>
      )}
      
      {/* FHR Graph (Top) */}
      <div className="flex-1 relative border-b border-slate-300 pointer-events-none">
        <div className="absolute top-2 left-2 z-10 bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-600 rounded border border-slate-300">
          FHR (bpm) - US
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={[minTime, minTime + windowSeconds]} 
              hide={true} 
              allowDataOverflow={true}
            />
            <YAxis 
              domain={[50, 210]} 
              ticks={[60, 80, 100, 120, 140, 160, 180, 200]} 
              orientation="left"
              tick={{fontSize: 10, fill: '#64748b'}}
              width={30}
            />
            {/* Green band for Normal Baseline 110-160 */}
            <ReferenceArea y1={110} y2={160} fill="green" fillOpacity={0.05} />
            
            <Line 
              type="monotone" 
              dataKey="fhr" 
              stroke="#059669" // Emerald 600
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TOCO Graph (Bottom) */}
      <div className="h-1/3 relative bg-slate-50 pointer-events-none">
        <div className="absolute top-2 left-2 z-10 bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-600 rounded border border-slate-300">
          TOCO (mmHg)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={[minTime, minTime + windowSeconds]} 
              hide={true} 
              allowDataOverflow={true}
            />
            <YAxis 
              domain={[0, 100]} 
              ticks={[0, 20, 40, 60, 80, 100]} 
              orientation="left"
              tick={{fontSize: 10, fill: '#64748b'}}
              width={30}
            />
            <Line 
              type="monotone" 
              dataKey="toco" 
              stroke="#0891b2" // Cyan 600
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorGraph;