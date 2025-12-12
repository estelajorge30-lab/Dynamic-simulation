import React, { useState, useEffect } from 'react';
import { BrainState, Electrode } from './types';
import { ELECTRODES } from './constants';
import ElectrodeMap from './components/ElectrodeMap';
import SignalCanvas from './components/SignalCanvas';
import InfoPanel from './components/InfoPanel';
import TrainingPanel from './components/TrainingPanel';
import { Activity, Pause, Play, GraduationCap, RefreshCw, Layout, Smartphone } from 'lucide-react';

// Select a subset of channels to display to keep performance high and UI clean
const DISPLAY_CHANNELS = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2', 'T3', 'T4'];

enum MobileTab {
  MONITOR = 'Monitor',
  CONTROLS = 'Controls',
  INFO = 'Info'
}

function App() {
  const [brainState, setBrainState] = useState<BrainState>(BrainState.AWAKE_EYES_OPEN);
  const [selectedElectrodeId, setSelectedElectrodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [gain, setGain] = useState(0.5); // Amplitude scaling
  const [speed, setSpeed] = useState(1); // Simulation speed
  
  // Training Mode State
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  
  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(MobileTab.MONITOR);

  const selectedElectrode = ELECTRODES.find(e => e.id === selectedElectrodeId);

  const randomizeState = () => {
    const states = Object.values(BrainState);
    const randomState = states[Math.floor(Math.random() * states.length)];
    setBrainState(randomState);
  };

  // When entering training mode, pick a random state immediately
  useEffect(() => {
    if (isTrainingMode) {
      randomizeState();
      if (window.innerWidth < 1024) setActiveMobileTab(MobileTab.INFO); // Switch to info tab on mobile to see quiz
    }
  }, [isTrainingMode]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center px-4 md:px-6 justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center">
            <Activity className="text-slate-900 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">NeuroSim EEG</h1>
            <p className="text-[10px] text-slate-500">10-20 Simulator</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
           {/* Training Mode Toggle */}
           <button
             onClick={() => setIsTrainingMode(!isTrainingMode)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs md:text-sm font-semibold
               ${isTrainingMode 
                 ? 'bg-violet-500/20 border-violet-500 text-violet-400' 
                 : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
             `}
           >
             <GraduationCap size={16} />
             <span className="hidden md:inline">{isTrainingMode ? 'Training Active' : 'Training Mode'}</span>
             <span className="md:hidden">{isTrainingMode ? 'ON' : 'OFF'}</span>
           </button>

           <div className="w-px h-6 bg-slate-700 mx-1 md:mx-2" />

           {/* Freeze/Resume Button */}
           <button 
             onClick={() => setIsRunning(!isRunning)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs md:text-sm font-bold
                ${!isRunning 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}
             `}
           >
             {isRunning ? <Pause size={16} /> : <Play size={16} />}
             <span className="hidden md:inline">{isRunning ? 'Freeze' : 'Resume'}</span>
             <span className="md:hidden">{isRunning ? 'Pause' : 'Play'}</span>
           </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px-50px)] lg:h-[calc(100vh-64px)]">
        
        {/* Left Sidebar: Controls & Map (Hidden on mobile unless selected tab) */}
        <aside className={`
          w-full lg:w-80 bg-slate-925 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar
          ${activeMobileTab === MobileTab.CONTROLS ? 'block' : 'hidden lg:flex'}
        `}>
          
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              {isTrainingMode ? 'Scenario Control' : 'Simulation State'}
            </h2>
            
            {isTrainingMode ? (
              <div className="p-4 bg-slate-900/50 rounded border border-dashed border-slate-700 text-center">
                 <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">?</span>
                 </div>
                 <p className="text-slate-300 text-sm mb-3">Hidden State</p>
                 <button 
                   onClick={randomizeState}
                   className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                 >
                   <RefreshCw size={14} /> New Case
                 </button>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.values(BrainState).map((state) => (
                  <button
                    key={state}
                    onClick={() => setBrainState(state)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors
                      ${brainState === state 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }
                    `}
                  >
                    {state.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-b border-slate-800">
             <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Signal Settings</h2>
             <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Amplitude (Gain)</span>
                    <span>{gain.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="2.0" step="0.1" 
                    value={gain} 
                    onChange={(e) => setGain(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Sweep Speed</span>
                    <span>{speed}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="3.0" step="0.5" 
                    value={speed} 
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none"
                  />
                </div>
             </div>
          </div>

          <div className="p-6 flex-grow flex flex-col items-center">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 w-full">10-20 Map</h2>
            <ElectrodeMap 
              selectedElectrode={selectedElectrodeId} 
              onSelectElectrode={setSelectedElectrodeId} 
            />
            <p className="text-xs text-center text-slate-500 mt-2">
              Click electrode to see region.
            </p>
          </div>
        </aside>

        {/* Center: Charts (Monitor) */}
        <section className={`
           flex-grow bg-slate-950 flex flex-col overflow-hidden relative
           ${activeMobileTab === MobileTab.MONITOR ? 'block' : 'hidden lg:flex'}
        `}>
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex-grow overflow-y-auto custom-scrollbar p-1 pb-20">
             {DISPLAY_CHANNELS.map(channel => (
               <SignalCanvas 
                  key={channel}
                  channelId={channel}
                  brainState={brainState}
                  isRunning={isRunning}
                  gain={gain}
                  speed={speed}
                  isTrainingMode={isTrainingMode}
               />
             ))}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none"></div>
        </section>

        {/* Right Sidebar: Educational Info OR Training Panel */}
        <aside className={`
          w-full lg:w-80 p-4 bg-slate-925 border-l border-slate-800 overflow-y-auto shrink-0
          ${activeMobileTab === MobileTab.INFO ? 'block' : 'hidden lg:block'}
        `}>
          {isTrainingMode ? (
            <TrainingPanel 
              currentBrainState={brainState}
              onNextCase={randomizeState}
              selectedElectrode={selectedElectrode}
            />
          ) : (
            <InfoPanel 
              brainState={brainState} 
              selectedElectrode={selectedElectrode} 
            />
          )}
        </aside>

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden h-[50px] bg-slate-900 border-t border-slate-800 flex items-center justify-around text-xs shrink-0 z-20">
        <button 
          onClick={() => setActiveMobileTab(MobileTab.MONITOR)}
          className={`flex flex-col items-center gap-1 ${activeMobileTab === MobileTab.MONITOR ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          <Activity size={20} />
          <span>Monitor</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab(MobileTab.CONTROLS)}
          className={`flex flex-col items-center gap-1 ${activeMobileTab === MobileTab.CONTROLS ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          <Layout size={20} />
          <span>Controls</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab(MobileTab.INFO)}
          className={`flex flex-col items-center gap-1 ${activeMobileTab === MobileTab.INFO ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          {isTrainingMode ? <GraduationCap size={20} /> : <Smartphone size={20} />}
          <span>{isTrainingMode ? 'Quiz' : 'Info'}</span>
        </button>
      </nav>

      {/* Mobile Disclaimer / Hidden CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

export default App;