import React from 'react';
import { ELECTRODES } from '../constants';
import { Electrode } from '../types';

interface ElectrodeMapProps {
  selectedElectrode: string | null;
  onSelectElectrode: (id: string) => void;
}

const ElectrodeMap: React.FC<ElectrodeMapProps> = ({ selectedElectrode, onSelectElectrode }) => {
  return (
    <div className="relative w-full max-w-[280px] aspect-square mx-auto my-4 select-none">
      {/* Head Outline */}
      <svg viewBox="0 0 100 110" className="w-full h-full drop-shadow-lg">
        {/* Skull */}
        <ellipse cx="50" cy="55" rx="45" ry="50" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        {/* Nose */}
        <path d="M 45 5 L 50 0 L 55 5" fill="none" stroke="#475569" strokeWidth="2" />
        {/* Ears */}
        <path d="M 5 50 Q 0 55 5 60" fill="none" stroke="#475569" strokeWidth="2" />
        <path d="M 95 50 Q 100 55 95 60" fill="none" stroke="#475569" strokeWidth="2" />
      </svg>

      {/* Electrodes */}
      {ELECTRODES.map((e) => {
        const isSelected = selectedElectrode === e.id;
        return (
          <div
            key={e.id}
            onClick={() => onSelectElectrode(e.id)}
            className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all duration-200 border-2
              ${isSelected 
                ? 'bg-cyan-500 border-white text-white scale-110 shadow-[0_0_10px_rgba(6,182,212,0.8)]' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-400'
              }
            `}
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
          >
            {e.label}
          </div>
        );
      })}
    </div>
  );
};

export default ElectrodeMap;