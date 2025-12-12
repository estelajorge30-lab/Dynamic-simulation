import React from 'react';
import { ChargeState, PacerState, NIBPState, LeadType } from '../types';

interface ControlPanelProps {
  energy: number;
  onEnergyChange: (delta: number) => void;
  onCharge: () => void;
  onShock: () => void;
  chargeState: ChargeState;
  
  // ALS Props
  isCPR: boolean;
  onToggleCPR: () => void;
  onVentilate: () => void;
  onAdministerDrug: (drug: 'EPI' | 'AMIO') => void;

  // Monitor Props
  lead: LeadType;
  onLeadChange: () => void;
  syncEnabled: boolean;
  onToggleSync: () => void;
  pacerState: PacerState;
  onTogglePacer: () => void;
  onPacerAdjust: (setting: 'rate' | 'current', delta: number) => void;
  nibpState: NIBPState;
  onMeasureNIBP: () => void;
}

// --- MEDICAL ICONS ---
const Icons = {
  Lightning: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  ShockBolt: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </svg>
  ),
  Pulse: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Sync: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Minus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Syringe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M18 6L6 18" />
      <path d="M21 3l-3 3" />
      <path d="M3 21l3-3" />
      <path d="M9 15l-4-4" />
      <path d="M17 7l-4 4" />
      <line x1="14" y1="4" x2="20" y2="10" />
    </svg>
  ),
  CPR: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
       <path d="M18 9v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v3" />
       <path d="M12 14v-5" />
       <path d="M8 14h8" />
       <path d="M6 18h12" />
       <path d="M5 22h14" />
       <path d="M7 18l-1 4" />
       <path d="M17 18l1 4" />
    </svg>
  ),
  Lungs: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M12 2v6" />
      <path d="M9 5h6" />
      <path d="M17 17c0 2 1.5 3 3 3s3-1 3-5c0-3-2.5-4-4-4c-1.5 0-3.5 1-4.5 3" />
      <path d="M7 17c0 2-1.5 3-3 3S1 19 1 15c0-3 2.5-4 4-4c1.5 0 3.5 1 4.5 3" />
    </svg>
  ),
  Cuff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 8h16v8h-16z" />
      <path d="M8 8v8" />
      <path d="M16 8v8" />
      <path d="M12 16v4" />
      <circle cx="12" cy="21" r="1" />
    </svg>
  )
};

// --- STYLES ---
// 3D Button Styles mimicking rubber keys
const styles = {
  btnBase: "relative flex flex-col items-center justify-center rounded-lg transition-all active:scale-[0.98] active:translate-y-[2px] select-none",
  
  // Grey Control Button
  btnGrey: "bg-slate-700 text-gray-200 border-b-4 border-slate-900 active:border-b-0 shadow-lg hover:bg-slate-600 hover:text-white",
  
  // Active Toggled Button
  btnActive: "bg-green-700 text-white border-b-4 border-green-900 active:border-b-0 shadow-lg shadow-green-900/50",
  
  // Danger/Shock Button
  btnRed: "bg-gradient-to-br from-red-600 to-red-700 text-white border-b-4 border-red-900 active:border-b-0 shadow-[0_0_15px_rgba(220,38,38,0.4)]",
  
  // Charge Button
  btnYellow: "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-bold border-b-4 border-yellow-800 active:border-b-0 shadow-[0_0_10px_rgba(234,179,8,0.4)]",
  
  // Soft Key (ALS)
  btnSoft: "bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white active:bg-slate-900 active:border-slate-800 transition-colors shadow-sm",
};

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  energy, 
  onEnergyChange, 
  onCharge, 
  onShock, 
  chargeState,
  isCPR,
  onToggleCPR,
  onVentilate,
  onAdministerDrug,
  lead,
  onLeadChange,
  syncEnabled,
  onToggleSync,
  pacerState,
  onTogglePacer,
  onPacerAdjust,
  nibpState,
  onMeasureNIBP
}) => {
  
  const isCharged = chargeState === ChargeState.CHARGED;
  const isCharging = chargeState === ChargeState.CHARGING;

  return (
    <div className="bg-[#262626] p-4 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.8)] border-t border-white/10 flex flex-col gap-4 select-none relative overflow-hidden h-full">
      
      {/* Texture Mesh */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
           style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
      </div>

      {/* --- THERAPY ZONE (Defib) --- */}
      <div className="flex flex-col gap-3 p-3 bg-black/30 rounded-xl border border-white/5 relative z-10 shadow-inner">
          <div className="absolute top-2 left-2 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Therapy</div>
          
          {/* Energy Select */}
          <div className="flex items-center justify-between mt-4">
             <button onClick={() => onEnergyChange(-10)} className={`${styles.btnGrey} w-10 h-10 rounded-full !border-b-2`}>
                <Icons.Minus />
             </button>
             
             <div className="flex flex-col items-center">
                 <div className="bg-[#0f172a] text-yellow-500 font-mono text-xl font-bold px-4 py-1 rounded border border-gray-700 shadow-inner min-w-[80px] text-center">
                    {energy}<span className="text-xs text-gray-600 ml-1">J</span>
                 </div>
                 <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Energy</span>
             </div>

             <button onClick={() => onEnergyChange(10)} className={`${styles.btnGrey} w-10 h-10 rounded-full !border-b-2`}>
                <Icons.Plus />
             </button>
          </div>

          <div className="h-px bg-gray-700/50 w-full my-1"></div>

          {/* Charge & Shock Row */}
          <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                 <button 
                    onClick={onCharge}
                    disabled={isCharging || isCharged}
                    className={`${styles.btnYellow} w-full py-3 text-sm tracking-wider flex items-center justify-center gap-2 ${isCharged ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${isCharging ? 'animate-pulse' : ''}`}
                 >
                    <Icons.Lightning />
                    {isCharging ? 'CHARGING' : 'CHARGE'}
                 </button>
              </div>

              <div className="w-20 flex justify-center">
                 <button 
                    onClick={onShock}
                    disabled={!isCharged}
                    className={`${styles.btnRed} w-16 h-16 rounded-lg flex items-center justify-center transition-all ${isCharged ? 'animate-bounce ring-4 ring-red-500/50 cursor-pointer scale-110' : 'opacity-40 grayscale cursor-not-allowed'}`}
                 >
                    <Icons.ShockBolt />
                 </button>
              </div>
          </div>
      </div>

      {/* --- MONITORING ZONE --- */}
      <div className="grid grid-cols-3 gap-2 z-10">
         <button onClick={onLeadChange} className={`${styles.btnGrey} py-2`}>
            <Icons.Pulse />
            <span className="text-[10px] font-bold mt-1">LEAD {lead}</span>
         </button>
         
         <button onClick={onToggleSync} className={`${syncEnabled ? styles.btnActive : styles.btnGrey} py-2`}>
            <Icons.Sync />
            <span className="text-[10px] font-bold mt-1">SYNC</span>
         </button>
         
         <button onClick={onMeasureNIBP} disabled={nibpState !== NIBPState.IDLE && nibpState !== NIBPState.COMPLETE} className={`${nibpState === NIBPState.INFLATING ? styles.btnActive : styles.btnGrey} py-2`}>
            <Icons.Cuff />
            <span className="text-[10px] font-bold mt-1">NIBP</span>
         </button>
      </div>

      {/* --- PACER ZONE --- */}
      <div className={`p-2 rounded-lg border flex flex-col gap-2 z-10 transition-colors ${pacerState.enabled ? 'bg-green-900/20 border-green-600/50' : 'bg-transparent border-white/5'}`}>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gray-400">
                <Icons.Heart />
                <span className="text-[10px] font-bold tracking-wider">PACER</span>
            </div>
            <button 
                onClick={onTogglePacer} 
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${pacerState.enabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
                {pacerState.enabled ? 'ON' : 'OFF'}
            </button>
         </div>

         {pacerState.enabled && (
             <div className="flex gap-2">
                <div className="flex-1 bg-black/20 rounded p-1 flex flex-col items-center border border-white/5">
                    <span className="text-[9px] text-gray-500">RATE</span>
                    <div className="flex items-center w-full justify-between px-1">
                        <button onClick={() => onPacerAdjust('rate', -5)} className="text-gray-400 hover:text-white">-</button>
                        <span className="text-green-400 font-mono text-xs">{pacerState.rate}</span>
                        <button onClick={() => onPacerAdjust('rate', 5)} className="text-gray-400 hover:text-white">+</button>
                    </div>
                </div>
                <div className="flex-1 bg-black/20 rounded p-1 flex flex-col items-center border border-white/5">
                    <span className="text-[9px] text-gray-500">mA</span>
                    <div className="flex items-center w-full justify-between px-1">
                        <button onClick={() => onPacerAdjust('current', -5)} className="text-gray-400 hover:text-white">-</button>
                        <span className="text-green-400 font-mono text-xs">{pacerState.current}</span>
                        <button onClick={() => onPacerAdjust('current', 5)} className="text-gray-400 hover:text-white">+</button>
                    </div>
                </div>
             </div>
         )}
      </div>

      {/* --- ALS ACTIONS (Soft Keys) --- */}
      <div className="mt-auto z-10">
         <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-700 pb-1">Interventions</div>
         
         <div className="grid grid-cols-4 gap-2 h-16">
            <button 
                onClick={onToggleCPR}
                className={`${isCPR ? 'bg-blue-600 border-blue-800 text-white' : 'bg-slate-700 border-slate-900 text-gray-400'} border-b-4 active:border-b-0 active:translate-y-1 rounded-lg flex flex-col items-center justify-center transition-all`}
            >
                <Icons.CPR />
                <span className="text-[9px] font-bold mt-1">CPR</span>
            </button>

            <button 
                onClick={onVentilate}
                className="bg-slate-700 border-b-4 border-slate-900 text-gray-400 hover:text-white active:border-b-0 active:translate-y-1 rounded-lg flex flex-col items-center justify-center transition-all"
            >
                <Icons.Lungs />
                <span className="text-[9px] font-bold mt-1">VENT</span>
            </button>

            <button 
                onClick={() => onAdministerDrug('EPI')}
                className="bg-amber-900/30 border-b-4 border-amber-900/60 text-amber-500 hover:text-amber-300 active:border-b-0 active:translate-y-1 rounded-lg flex flex-col items-center justify-center transition-all"
            >
                <Icons.Syringe />
                <span className="text-[9px] font-bold mt-1">EPI 1mg</span>
            </button>

            <button 
                onClick={() => onAdministerDrug('AMIO')}
                className="bg-purple-900/30 border-b-4 border-purple-900/60 text-purple-400 hover:text-purple-300 active:border-b-0 active:translate-y-1 rounded-lg flex flex-col items-center justify-center transition-all"
            >
                <Icons.Syringe />
                <span className="text-[9px] font-bold mt-1">AMIO</span>
            </button>
         </div>
      </div>
      
    </div>
  );
};

export default ControlPanel;