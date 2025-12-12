
import React from 'react';
import { ScenarioType } from '../types';

interface ScenarioControlsProps {
  currentScenario: ScenarioType;
  onScenarioChange: (s: ScenarioType) => void;
  onSwallow: () => void;
  isSwallowing: boolean;
  isQuizMode: boolean;
  onToggleQuiz: () => void;
}

const ScenarioControls: React.FC<ScenarioControlsProps> = ({ 
  currentScenario, 
  onScenarioChange, 
  onSwallow, 
  isSwallowing,
  isQuizMode,
  onToggleQuiz
}) => {
  
  const scenarios = [
    { type: 'group', label: 'Physiological' },
    {
      id: ScenarioType.NORMAL,
      label: 'Normal Motility',
      desc: 'Normal IRP (<15), Intact Wave.',
      color: 'border-green-500'
    },
    { type: 'group', label: 'Achalasia Spectrum (Chicago v4.0)' },
    {
      id: ScenarioType.ACHALASIA_TYPE_I,
      label: 'Type I (Classic)',
      desc: '100% Failed peristalsis. No pressurization.',
      color: 'border-blue-500'
    },
    {
      id: ScenarioType.ACHALASIA_TYPE_II,
      label: 'Type II (Compression)',
      desc: '100% Failed. Pan-esophageal pressurization.',
      color: 'border-yellow-500'
    },
    {
      id: ScenarioType.ACHALASIA_TYPE_III,
      label: 'Type III (Spastic)',
      desc: 'Premature contractions (DL < 4.5s).',
      color: 'border-red-500'
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-5 bg-gray-800 rounded-xl shadow-lg border border-gray-700 h-full overflow-hidden flex-1">
      
      {/* Quiz Toggle Header */}
      <div className="flex flex-col bg-gray-900/50 p-3 rounded-lg border border-gray-700">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
               {isQuizMode ? '🎓 Quiz Mode' : '🎛 Controls'}
            </h2>
            <button 
              onClick={onToggleQuiz}
              className={`text-xs px-3 py-1 rounded-full font-bold transition-all
                ${isQuizMode 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/30'}`}
            >
              {isQuizMode ? 'Exit' : 'Start Quiz'}
            </button>
         </div>
         <p className="text-[10px] text-gray-500">
           {isQuizMode 
             ? 'Identify the Achalasia subtype.' 
             : 'Select a pattern to simulate.'}
         </p>
      </div>
      
      {/* Scenario List (Hidden in Quiz Mode) */}
      {!isQuizMode ? (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {scenarios.map((item, idx) => {
            if (item.type === 'group') {
              return (
                <div key={`g-${idx}`} className="text-[10px] uppercase font-bold text-gray-500 mt-4 mb-2 px-1 border-b border-gray-700 pb-1">
                  {item.label}
                </div>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => onScenarioChange(item.id as ScenarioType)}
                className={`w-full text-left p-3 rounded-lg border-l-4 transition-all duration-200 
                  ${currentScenario === item.id 
                    ? `${item.color} bg-gray-700 shadow-lg ring-1 ring-white/10` 
                    : 'border-transparent hover:bg-gray-700/50'}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-sm ${currentScenario === item.id ? 'text-white' : 'text-gray-300'}`}>
                    {item.label}
                  </span>
                </div>
                {currentScenario === item.id && (
                  <p className="text-[11px] text-gray-400 mt-1 leading-tight">{item.desc}</p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/30">
           <div className="bg-gray-800 p-4 rounded-full mb-4 animate-bounce">
             <span className="text-4xl">🔎</span>
           </div>
           <h3 className="text-gray-300 font-bold mb-2">Pattern Hidden</h3>
           <p className="text-sm text-gray-500">
             Observe the tracing and select the correct Achalasia type.
           </p>
        </div>
      )}

      <hr className="border-gray-700 my-2" />

      {/* Simulator Button */}
      <button
        onClick={onSwallow}
        disabled={isSwallowing}
        className={`w-full py-4 px-6 rounded-lg font-bold text-lg shadow-lg transform transition-all flex items-center justify-center gap-2
          ${isSwallowing 
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none border border-gray-600' 
            : isQuizMode
              ? 'bg-amber-600 text-white hover:bg-amber-500 active:scale-[0.98]'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'}`}
      >
        {isSwallowing ? (
           <>
             <span className="animate-spin mr-2">⟳</span>
             <span>Recording...</span>
           </>
        ) : (
           <>
            <span>{isQuizMode ? 'Swallow' : 'Simulate Swallow'}</span>
           </>
        )}
      </button>
    </div>
  );
};

export default ScenarioControls;
