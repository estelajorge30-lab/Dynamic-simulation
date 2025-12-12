import React, { useState, useEffect } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { RhythmType, ChargeState, PacerState, NIBPState, LeadType } from '../types';
import { getNextECGValue, getNextPlethValue, getNextCapnoValue, getNextPawValue } from '../utils/waveformGenerators';
import AlgorithmChart from './AlgorithmChart';

interface VitalSigns {
  hr: number | string;
  spo2: number;
  etco2: number;
  sys: number;
  dia: number;
  rr: number;
}

interface MonitorScreenProps {
  rhythm: RhythmType;
  chargeState: ChargeState;
  energySelected: number;
  instructorMessage?: string | null;
  messageType?: 'info' | 'success' | 'warning';
  
  // ALS Props
  isCPR: boolean;
  tutorialStage?: string; 
  showAlgorithm?: boolean;
  onToggleAlgorithm?: () => void;

  // Monitor Props
  lead: LeadType;
  syncEnabled: boolean;
  pacerState: PacerState;
  nibpState: NIBPState;
  nibpValue: string; 

  // PHYSIOLOGY
  vitalSigns: VitalSigns;
  isVentilating: boolean; // True if VENT button pressed recently
}

const MonitorScreen: React.FC<MonitorScreenProps> = ({ 
  rhythm, 
  chargeState, 
  energySelected,
  instructorMessage,
  messageType = 'info',
  isCPR,
  tutorialStage,
  showAlgorithm,
  onToggleAlgorithm,
  lead,
  syncEnabled,
  pacerState,
  nibpState,
  nibpValue,
  vitalSigns,
  isVentilating
}) => {
  
  // Waveform logic helpers
  const hasMechanicalPulse = (rhythm === RhythmType.SINUS || rhythm === RhythmType.BRADYCARDIA) && !isCPR;
  
  // We show SpO2 wave if not ventilating. If ventilating, we show Paw (Pressure).
  const showPaw = isVentilating;

  // Display value formatting
  const displayHR = isCPR ? '---' : (rhythm === RhythmType.VFIB || rhythm === RhythmType.ASYSTOLE ? '---' : vitalSigns.hr);
  
  // SpO2 logic: if value is too low, monitor might show ? or ---
  const displaySpO2 = vitalSigns.spo2 < 50 ? '?' : Math.round(vitalSigns.spo2).toString();
  
  // EtCO2 logic
  const displayEtCO2 = Math.round(vitalSigns.etco2).toString();

  // Calculate Hypoxia Stress for ECG Artifacts (0.0 to 1.0)
  // Stress starts at SpO2 90% and maxes at 40%
  const hypoxiaStress = Math.max(0, Math.min(1, (90 - vitalSigns.spo2) / 50));

  const getMessageColor = () => {
    switch(messageType) {
      case 'success': return 'bg-green-600/90 text-white';
      case 'warning': return 'bg-red-600/90 text-white';
      default: return 'bg-blue-600/90 text-white';
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col font-sans select-none overflow-hidden rounded-lg">
      
      {/* --- ALGORITHM OVERLAY --- */}
      {showAlgorithm && tutorialStage && (
          <AlgorithmChart activeStage={tutorialStage} onClose={onToggleAlgorithm} isReferenceMode={true} />
      )}

      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0" 
           style={{ backgroundImage: `linear-gradient(rgba(50,50,50,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50,50,50,0.5) 1px, transparent 1px)`, backgroundSize: '20px 20px' }}>
      </div>
      <div className="absolute inset-0 pointer-events-none z-40 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      <div className="absolute inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]"></div>

      {/* --- INSTRUCTOR MESSAGE --- */}
      {instructorMessage && (
        <div className={`absolute top-0 left-0 right-0 z-50 px-4 py-2 text-center backdrop-blur-md transition-all duration-300 font-bold text-xs md:text-sm tracking-wide shadow-lg border-b border-white/10 ${getMessageColor()}`}>
           {instructorMessage}
        </div>
      )}

      {/* --- TOP STATUS BAR --- */}
      <div className="relative h-6 md:h-8 mt-8 bg-[#0a0a0a] border-b border-[#222] flex justify-between items-center px-2 md:px-4 text-sm font-semibold text-gray-300 z-10 shrink-0">
        <div className="flex gap-2 md:gap-4 items-center">
          <div className="bg-[#222] px-1.5 py-0.5 rounded text-[#888] text-[8px] md:text-[10px] font-bold tracking-widest border border-[#333]">ADULT</div>
          {isCPR && (
             <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">CPR IN PROGRESS</div>
          )}
          {pacerState.enabled && (
             <div className="bg-green-700 text-white px-2 py-0.5 rounded text-[10px] font-bold flex gap-2 items-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                <span>PACER {pacerState.rate} / {pacerState.current}mA</span>
             </div>
          )}
        </div>

        <button 
            onClick={onToggleAlgorithm}
            className="absolute left-1/2 -translate-x-1/2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600 text-[10px] font-bold transition-colors z-50"
        >
            ALS PROTOCOL
        </button>

        <div className="flex gap-2 md:gap-4 text-[10px] md:text-xs font-mono text-gray-500">
            <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className={chargeState !== ChargeState.IDLE ? 'text-red-500 animate-pulse font-bold' : ''}>
                {chargeState === ChargeState.IDLE ? 'READY' : 'CHARGED'}
            </span>
        </div>
      </div>

      {/* --- CENTER OVERLAY: ENERGY --- */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center z-30 w-64 pointer-events-none">
         <div className="inline-block bg-black/80 px-4 py-0.5 rounded border border-gray-700 backdrop-blur-sm shadow-xl mt-2">
             <span className="text-yellow-400 font-bold text-2xl md:text-3xl font-mono tracking-widest drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                 {energySelected} J
             </span>
         </div>
         <div className="mt-2 h-14 flex items-center justify-center">
            {chargeState === ChargeState.CHARGING && (
                <div className="w-full bg-red-900/90 text-white border border-red-500 px-4 py-2 rounded animate-pulse font-bold tracking-wider text-sm md:text-base">CHARGING...</div>
            )}
            {chargeState === ChargeState.CHARGED && (
                <div className="w-full bg-red-600 text-white px-4 py-2 font-extrabold border-2 border-white animate-[bounce_1s_infinite] rounded tracking-widest text-sm md:text-lg uppercase flex items-center justify-center gap-2">
                    ⚡ SHOCK ADVISED
                </div>
            )}
         </div>
      </div>

      {/* --- WAVEFORM CHANNELS --- */}
      <div className="flex flex-col flex-grow w-full z-0 pb-1 relative h-0"> 
        
        {/* ROW 1: ECG (Green) */}
        <div className="flex-[4] flex border-b border-[#222] relative overflow-hidden">
            <div className="w-10 md:w-14 flex flex-col pt-4 items-end pr-1 md:pr-2 text-green-500 font-mono text-xs gap-1 shrink-0 opacity-90">
                <span className="font-bold text-sm md:text-base">{lead}</span>
                <span className="opacity-60 text-[9px]">x1.0</span>
                {syncEnabled && <span className="text-green-300 font-bold animate-pulse text-[9px] border border-green-500 px-0.5">SYNC</span>}
            </div>
            <div className="flex-1 relative h-full">
                <WaveformCanvas 
                    color="#22c55e" 
                    getValue={() => getNextECGValue(rhythm, isCPR, pacerState, hypoxiaStress)} 
                    speed={1} 
                    lineWidth={2}
                />
            </div>
            <div className="w-20 md:w-24 flex flex-col pt-2 items-end pr-2 md:pr-4 shrink-0 bg-gradient-to-l from-black/50 to-transparent">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-500 text-[10px] font-bold tracking-widest">HR</span>
                 </div>
                 <span className={`text-green-400 text-4xl md:text-5xl font-mono font-bold tracking-tighter leading-none ${isCPR ? 'opacity-50' : ''}`}>
                    {displayHR}
                 </span>
                 <div className="mt-2 text-right">
                    <span className="text-gray-400 text-[9px] block">NIBP (mmHg)</span>
                    <span className={`font-mono font-bold text-xl ${nibpState === NIBPState.MEASURING ? 'text-gray-500 animate-pulse' : 'text-white'}`}>
                        {nibpState === NIBPState.MEASURING || nibpState === NIBPState.INFLATING ? '---/---' : nibpValue}
                    </span>
                    {nibpState === NIBPState.INFLATING && <span className="text-[9px] text-blue-400">Cuff Inflating...</span>}
                 </div>
            </div>
        </div>

        {/* ROW 2: SpO2 OR Paw (Blue/White) */}
        <div className="flex-[3] flex border-b border-[#222] relative overflow-hidden transition-all duration-500">
             
             {/* SpO2 Mode */}
             <div className={`absolute inset-0 flex transition-opacity duration-300 ${showPaw ? 'opacity-0' : 'opacity-100'}`}>
                <div className="w-10 md:w-14 flex flex-col pt-4 items-end pr-1 md:pr-2 text-cyan-400 font-mono text-xs gap-1 shrink-0 opacity-90">
                    <span className="font-bold text-sm md:text-base">SpO2</span>
                </div>
                <div className="flex-1 relative h-full">
                    <WaveformCanvas 
                        color="#06b6d4" 
                        getValue={() => {
                            // Scale waveform amplitude based on SpO2 value (simulating low perfusion)
                            const scale = vitalSigns.spo2 < 70 ? 0.3 : 1.0;
                            return getNextPlethValue(hasMechanicalPulse, 1.0) * scale;
                        }} 
                        speed={1.5}
                        lineWidth={2}
                    />
                </div>
                <div className="w-20 md:w-24 flex flex-col pt-2 items-end pr-2 md:pr-4 shrink-0 bg-gradient-to-l from-black/50 to-transparent">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-cyan-500 text-[10px] font-bold tracking-widest">%</span>
                    </div>
                    <span className="text-cyan-400 text-3xl md:text-4xl font-mono font-bold tracking-tighter leading-none">
                        {displaySpO2}
                    </span>
                </div>
             </div>

             {/* Airway Pressure Mode (Paw) */}
             <div className={`absolute inset-0 flex transition-opacity duration-300 ${showPaw ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-10 md:w-14 flex flex-col pt-4 items-end pr-1 md:pr-2 text-white font-mono text-xs gap-1 shrink-0 opacity-90">
                    <span className="font-bold text-sm md:text-base">Paw</span>
                    <span className="text-[9px] text-gray-400">cmH2O</span>
                </div>
                <div className="flex-1 relative h-full">
                    <WaveformCanvas 
                        color="#ffffff" 
                        getValue={getNextPawValue}
                        speed={2} // Faster sweep for pressure
                        lineWidth={2}
                    />
                </div>
                <div className="w-20 md:w-24 flex flex-col pt-2 items-end pr-2 md:pr-4 shrink-0 bg-gradient-to-l from-black/50 to-transparent">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-[10px] font-bold tracking-widest">RR</span>
                    </div>
                    <span className="text-white text-3xl md:text-4xl font-mono font-bold tracking-tighter leading-none">
                        {vitalSigns.rr > 0 ? vitalSigns.rr : '--'}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-1">PIP 22</span>
                </div>
             </div>
        </div>

        {/* ROW 3: EtCO2 (Yellow) */}
        <div className="flex-[3] flex relative overflow-hidden">
             <div className="w-10 md:w-14 flex flex-col pt-4 items-end pr-1 md:pr-2 text-yellow-400 font-mono text-xs gap-1 shrink-0 opacity-90">
                <span className="font-bold text-sm md:text-base">CO2</span>
            </div>
            <div className="flex-1 relative h-full">
                <WaveformCanvas 
                    color="#facc15" 
                    getValue={() => {
                        // Amplitude dependent on actual CO2 value. If 0, line is flat.
                        const scale = Math.min(1.0, vitalSigns.etco2 / 35);
                        return getNextCapnoValue(hasMechanicalPulse || isCPR, 1.0, isVentilating) * scale;
                    }} 
                    speed={1}
                    lineWidth={2}
                />
            </div>
            <div className="w-20 md:w-24 flex flex-col pt-2 items-end pr-2 md:pr-4 shrink-0 bg-gradient-to-l from-black/50 to-transparent">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-500 text-[10px] font-bold tracking-widest">EtCO2</span>
                 </div>
                 <span className="text-yellow-400 text-3xl md:text-4xl font-mono font-bold tracking-tighter leading-none">
                     {displayEtCO2}
                 </span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default MonitorScreen;