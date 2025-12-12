import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, HelpCircle, GraduationCap, Ruler } from 'lucide-react';
import MonitorGraph from './components/MonitorGraph';
import ControlPanel from './components/ControlPanel';
import QuizMode from './components/QuizMode';
import InfoModal from './components/InfoModal';
import { generateNextPoint } from './utils/simulationEngine';
import { SimulatorParams, DataPoint, SimulationMode, PaperSpeed } from './types';

const INITIAL_PARAMS: SimulatorParams = {
  baseline: 140,
  variability: 'normal',
  decelerations: 'none',
  contractions: 'none',
  noiseLevel: 1
};

const App: React.FC = () => {
  const [mode, setMode] = useState<SimulationMode>('training');
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x or 10x
  const [params, setParams] = useState<SimulatorParams>(INITIAL_PARAMS);
  const [data, setData] = useState<DataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [paperSpeed, setPaperSpeed] = useState<PaperSpeed>(1);
  const [showRuler, setShowRuler] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // References for interval management
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // Simulation Loop
  const animate = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    
    // Throttle updates to ~10 times per second for UI performance (100ms)
    const deltaTime = time - lastUpdateRef.current;
    
    if (deltaTime > 100) { 
      lastUpdateRef.current = time;
      
      setCurrentTime(prevTime => {
        // Calculate how many points to generate based on speed
        // Normal (1x): 1 point (0.5s sim time) per 100ms real time
        // Fast (10x): 10 points (5.0s sim time) per 100ms real time
        const pointsToGenerate = simSpeed; 
        
        let newTime = prevTime;
        
        setData(prevData => {
           let currentLastPoint = prevData[prevData.length - 1] || null;
           const newPoints: DataPoint[] = [];

           // Generate batch of points
           for (let i = 0; i < pointsToGenerate; i++) {
             newTime += 0.5; // Advance 0.5 simulation seconds per tick
             const point = generateNextPoint(newTime, params, currentLastPoint);
             newPoints.push(point);
             currentLastPoint = point;
           }

           // Keep mostly last 20 minutes of data (2400 points at 0.5s interval)
           const combinedData = [...prevData, ...newPoints];
           if (combinedData.length > 2400) {
             return combinedData.slice(combinedData.length - 2400);
           }
           return combinedData;
        });

        // Return the updated time from the closure calculation
        return newTime;
      });
    }

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, params, simSpeed]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const handleReset = () => {
    setData([]);
    setCurrentTime(0);
    setParams(INITIAL_PARAMS);
    setIsPlaying(false);
    setSimSpeed(1);
  };

  const loadScenario = (newParams: SimulatorParams) => {
    setParams(newParams);
    setData([]);
    setCurrentTime(0);
    setIsPlaying(true);
    setSimSpeed(1);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg text-slate-900 shadow-lg shadow-emerald-900/50">
            <Activity size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">FIGO-Sim</h1>
            <p className="text-xs text-slate-400 font-mono">INTRA-PARTUM FETAL MONITORING</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setMode('training')}
              className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
                mode === 'training' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Training Mode
            </button>
            <button
              onClick={() => {
                setMode('quiz');
                setIsPlaying(false); // Stop simulation when entering quiz setup
              }}
              className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2 ${
                mode === 'quiz' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap size={16} /> Quiz Mode
            </button>
          </div>

          <button 
            onClick={() => setIsInfoOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors" 
            title="Guidelines Reference"
          >
            <HelpCircle size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Slot: Switches between ControlPanel (Training) and QuizMode (Quiz) */}
        {mode === 'training' ? (
          <ControlPanel 
            params={params} 
            setParams={setParams} 
            isPlaying={isPlaying} 
            setIsPlaying={setIsPlaying}
            simSpeed={simSpeed}
            setSimSpeed={setSimSpeed}
            onReset={handleReset}
          />
        ) : (
          <QuizMode 
            onLoadScenario={loadScenario} 
            onExit={() => {
              setMode('training');
              handleReset();
            }} 
          />
        )}

        {/* Monitor Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 relative">
          
          {/* Top Bar for Monitor Settings */}
          <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700">
            <div className="flex items-center gap-4 text-sm font-mono text-slate-400">
               <span className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
               {isPlaying ? 'RECORDING ACTIVE' : 'MONITOR FROZEN'}
               {simSpeed > 1 && isPlaying && <span className="text-amber-400 font-bold ml-2">>> {simSpeed}x SPEED</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRuler(!showRuler)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded border flex items-center gap-2 transition-all ${
                  showRuler
                    ? 'bg-red-900/50 text-red-400 border-red-500/50'
                    : 'border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <Ruler size={14} />
                RULER
              </button>
              
              <div className="w-px h-5 bg-slate-700 mx-1"></div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase">Paper Speed:</span>
                {[1, 2, 3].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPaperSpeed(speed as PaperSpeed)}
                    className={`px-3 py-1 text-xs font-mono font-bold rounded border ${
                      paperSpeed === speed 
                        ? 'bg-slate-700 text-emerald-400 border-emerald-500/50' 
                        : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {speed} cm/min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="flex-1 min-h-0">
             <MonitorGraph data={data} paperSpeed={paperSpeed} showRuler={showRuler} />
          </div>

        </div>
      </div>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
};

export default App;