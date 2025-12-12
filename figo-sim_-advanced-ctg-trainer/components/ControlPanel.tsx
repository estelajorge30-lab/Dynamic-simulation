import React from 'react';
import { Play, RotateCcw, Activity, Heart, Waves, Settings2, Snowflake, FastForward } from 'lucide-react';
import { SimulatorParams, VariabilityType, DecelerationType, ContractionPattern } from '../types';

interface ControlPanelProps {
  params: SimulatorParams;
  setParams: (p: SimulatorParams) => void;
  isPlaying: boolean;
  setIsPlaying: (b: boolean) => void;
  simSpeed: number;
  setSimSpeed: (s: number) => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  setParams,
  isPlaying,
  setIsPlaying,
  simSpeed,
  setSimSpeed,
  onReset
}) => {
  const updateParam = <K extends keyof SimulatorParams>(key: K, value: SimulatorParams[K]) => {
    setParams({ ...params, [key]: value });
  };

  return (
    <div className="bg-slate-800 border-l border-slate-700 w-80 flex flex-col h-full shadow-2xl overflow-y-auto">
      <div className="p-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-20">
        <h2 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
          <Settings2 size={20} />
          Simulation Controls
        </h2>
      </div>

      {/* Transport Controls */}
      <div className="p-4 space-y-2 border-b border-slate-700">
        <div className="grid grid-cols-2 gap-2">
            <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center justify-center gap-2 font-bold py-3 rounded transition-all shadow-md active:translate-y-0.5 ${
                isPlaying 
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            >
            {isPlaying ? (
                <>
                <Snowflake size={18} /> FREEZE
                </>
            ) : (
                <>
                <Play size={18} /> RESUME
                </>
            )}
            </button>

            <button
            onClick={() => setSimSpeed(simSpeed === 1 ? 10 : 1)}
            disabled={!isPlaying}
            className={`flex items-center justify-center gap-2 font-bold py-3 rounded transition-all border ${
                simSpeed > 1 && isPlaying
                ? 'bg-amber-600 border-amber-500 text-white animate-pulse' 
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
            }`}
            title="Fast Forward (10x Speed)"
            >
            <FastForward size={18} />
            {simSpeed > 1 ? '10x' : '1x'}
            </button>
        </div>
        
        <button
          onClick={onReset}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-600 rounded py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
          title="Reset Trace"
        >
          <RotateCcw size={14} /> Reset Trace
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Baseline Control */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <Heart size={14} /> Fetal Heart Baseline
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="60"
              max="200"
              step="5"
              value={params.baseline}
              onChange={(e) => updateParam('baseline', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="bg-slate-900 text-emerald-400 font-mono px-2 py-1 rounded min-w-[3.5rem] text-center border border-slate-700">
              {params.baseline}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>60</span>
            <span>110</span>
            <span>160</span>
            <span>200</span>
          </div>
        </div>

        {/* Variability Control */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <Waves size={14} /> Variability
          </label>
          <select
            value={params.variability}
            onChange={(e) => updateParam('variability', e.target.value as VariabilityType)}
            className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="absent">Absent (&lt; 5 bpm)</option>
            <option value="minimal">Reduced/Minimal (&lt; 5 bpm)</option>
            <option value="normal">Normal (5-25 bpm)</option>
            <option value="saltatory">Increased/Saltatory (&gt; 25)</option>
            <option value="sinusoidal">Sinusoidal</option>
          </select>
        </div>

        {/* Decelerations Control */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <Activity size={14} /> Decelerations
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(['none', 'early', 'variable', 'late', 'prolonged'] as DecelerationType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateParam('decelerations', type)}
                className={`px-3 py-2 rounded text-sm text-left transition-all ${
                  params.decelerations === type
                    ? 'bg-emerald-600 text-white font-medium border-l-4 border-emerald-300'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Contractions Control */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
             Uterine Activity
          </label>
          <select
            value={params.contractions}
            onChange={(e) => updateParam('contractions', e.target.value as ContractionPattern)}
            className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
          >
            <option value="none">Resting</option>
            <option value="normal">Normal Labour (3-4/10min)</option>
            <option value="tachysystole">Tachysystole (&gt;5/10min)</option>
            <option value="hypertonus">Hypertonus (High Tone)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;