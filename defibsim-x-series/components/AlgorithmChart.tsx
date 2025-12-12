import React from 'react';

interface AlgorithmChartProps {
  activeStage: string;
  onClose?: () => void;
  isReferenceMode?: boolean;
}

const AlgorithmChart: React.FC<AlgorithmChartProps> = ({ activeStage, onClose, isReferenceMode = false }) => {
  
  const getStyle = (stageKey: string) => {
    // Simple contains check for stage matching
    const isActive = activeStage.includes(stageKey);
    return `p-2 text-[10px] md:text-xs border rounded transition-all duration-500 text-center select-none ${
      isActive 
      ? 'bg-yellow-500 text-black font-bold border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.8)] scale-105 z-10' 
      : 'bg-gray-800 text-gray-400 border-gray-700 opacity-80'
    }`;
  };

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-gray-900 border-2 border-gray-500 w-[95%] max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-gray-800 p-3 border-b border-gray-600 flex justify-between items-center">
                <h2 className="text-white font-bold tracking-widest text-sm md:text-base flex items-center gap-2">
                    <span className="text-red-500">ALS</span> CARDIAC ARREST ALGORITHM
                </h2>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white font-bold px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-xs"
                    >
                        CLOSE ✕
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col items-center gap-3 overflow-y-auto max-h-[80vh]">
                
                {/* Step 1 */}
                <div className={getStyle('INTRO') + " w-full max-w-[300px]"}>
                  1. START CPR (30:2)<br/>Give Oxygen <br/> Attach Monitor/Defib
                </div>

                <div className="h-4 w-0.5 bg-gray-600"></div>

                {/* Rhythm Check */}
                <div className={getStyle('VFIB') + ' ' + getStyle('ASYSTOLE') + " w-full max-w-[300px]"}>
                  2. ANALYZE RHYTHM
                </div>

                {/* Branching Lines */}
                <div className="flex w-full justify-between px-6 relative mt-1 h-6">
                   <div className="absolute top-0 left-1/2 w-px h-full bg-gray-600 -translate-x-1/2"></div>
                   <div className="absolute top-1/2 left-[25%] right-[25%] h-px bg-gray-600"></div>
                   <div className="absolute top-1/2 left-[25%] h-3 w-px bg-gray-600"></div>
                   <div className="absolute top-1/2 right-[25%] h-3 w-px bg-gray-600"></div>
                </div>

                <div className="flex w-full gap-2">
                    
                    {/* SHOCKABLE SIDE */}
                    <div className={`flex flex-col items-center gap-2 flex-1 border-2 border-dashed p-2 rounded transition-colors ${activeStage.includes('VFIB') || activeStage.includes('SHOCK') ? 'border-red-500 bg-red-900/10' : 'border-red-900/30 bg-red-950/10'}`}>
                        <div className="text-red-400 font-bold text-[10px] uppercase tracking-wider mb-1">Shockable (VF/pVT)</div>
                        
                        <div className={getStyle('SHOCK') + " w-full"}>
                            3. SHOCK 1<br/>(120-200J)
                        </div>
                        <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('CPR') + " w-full"}>
                            4. CPR 2 min (30:2)<br/>IV/IO Access
                        </div>
                         <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('SHOCK') + " w-full opacity-70"}>
                            SHOCK 2<br/>(150-360J)
                        </div>
                        <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('MEDS') + " w-full"}>
                            CPR 2 min<br/><strong>Epinephrine 1mg</strong>
                        </div>
                        <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('SHOCK') + " w-full opacity-70"}>
                            SHOCK 3<br/>(150-360J)
                        </div>
                         <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('MEDS') + " w-full"}>
                            CPR 2 min<br/><strong>Amiodarone 300mg</strong>
                        </div>
                    </div>

                    {/* NON-SHOCKABLE SIDE */}
                    <div className={`flex flex-col items-center gap-2 flex-1 border-2 border-dashed p-2 rounded transition-colors ${activeStage.includes('ASYSTOLE') || activeStage.includes('PEA') ? 'border-blue-500 bg-blue-900/10' : 'border-blue-900/30 bg-blue-950/10'}`}>
                        <div className="text-blue-400 font-bold text-[10px] uppercase tracking-wider mb-1">Non-Shockable</div>
                        
                        <div className="bg-red-900/80 text-white font-bold text-[10px] px-2 py-1 rounded border border-red-500 animate-pulse">
                            NO SHOCK
                        </div>

                        <div className="h-3 w-0.5 bg-gray-600"></div>

                        <div className={getStyle('ASYSTOLE') + " w-full"}>
                            10. CPR 2 min (30:2)<br/>IV/IO Access
                        </div>
                        <div className="h-3 w-0.5 bg-gray-600"></div>
                         <div className={getStyle('MEDS') + " w-full"}>
                            <strong>Epinephrine 1mg</strong><br/>every 3-5 min
                        </div>
                        <div className="h-3 w-0.5 bg-gray-600"></div>
                        <div className={getStyle('MEDS') + " w-full opacity-70"}>
                            Treat Causes<br/>(H's & T's)
                        </div>
                    </div>
                </div>

            </div>
            
            {/* Footer Legend */}
            <div className="bg-gray-950 p-2 text-[9px] text-gray-500 text-center border-t border-gray-800">
                Minimise interruptions in compressions. Shock pause &lt; 5s.
            </div>
        </div>
    </div>
  );
};

export default AlgorithmChart;