import React, { useState, useEffect } from 'react';
import EKGCanvas from './components/EKGCanvas';
import { CLINICAL_CASES, generateRandomCase } from './constants';
import { CaseScenario, CaseCategory } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<'training' | 'quiz'>('training');
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [themeMode, setThemeMode] = useState<'paper' | 'monitor'>('paper');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Controls
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [isCaliperMode, setIsCaliperMode] = useState(false);
  
  // Clinical Scales
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // Visual magnification
  const [paperSpeed, setPaperSpeed] = useState<25 | 50>(25); // mm/s
  const [voltageGain, setVoltageGain] = useState<10 | 20>(10); // mm/mV

  // Training State
  const [currentTrainingCase, setCurrentTrainingCase] = useState<CaseScenario>(CLINICAL_CASES[0]);
  const [showFindings, setShowFindings] = useState(true);

  // Quiz State
  const [currentQuizCase, setCurrentQuizCase] = useState<CaseScenario | null>(null);
  const [quizStatus, setQuizStatus] = useState<'waiting' | 'correct' | 'incorrect'>('waiting');
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Current active case depends on mode
  const activeCase = mode === 'training' ? currentTrainingCase : (currentQuizCase || currentTrainingCase);

  // Init quiz case
  useEffect(() => {
    if (mode === 'quiz' && !currentQuizCase) {
      handleNextQuiz();
    }
  }, [mode]);

  const handleNextQuiz = () => {
    const newCase = generateRandomCase();
    setCurrentQuizCase(newCase);
    setQuizStatus('waiting');
    setIsStaticMode(false); // Start running
    // Auto-hide measurements in quiz mode to prevent cheating
    if (mode === 'quiz') setShowMeasurements(false);
  };

  const handleDiagnosis = (selectedCategory: CaseCategory) => {
    if (quizStatus !== 'waiting' || !currentQuizCase) return;

    if (selectedCategory === currentQuizCase.category) {
      setQuizStatus('correct');
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
    } else {
      setQuizStatus('incorrect');
      setScore(s => ({ ...s, total: s.total + 1 }));
    }
  };

  const categories: CaseCategory[] = ['Normal', 'Arrhythmia', 'Electrolyte', 'Ischemic', 'Structural'];
  
  // Group cases by category/etiology for the sidebar
  const groupedCases: Record<string, CaseScenario[]> = {};
  CLINICAL_CASES.forEach(c => {
    if (!groupedCases[c.category]) groupedCases[c.category] = [];
    groupedCases[c.category].push(c);
  });
  
  // Helper for Monitor Theme Classes
  const isMonitor = themeMode === 'monitor';
  const sidebarBg = isMonitor ? 'bg-slate-900' : 'bg-white';
  const sidebarBorder = isMonitor ? 'border-slate-800' : 'border-slate-200';
  const textPrimary = isMonitor ? 'text-slate-200' : 'text-slate-700';
  const textSecondary = isMonitor ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isMonitor ? 'hover:bg-slate-800' : 'hover:bg-slate-50';
  const activeItemBg = isMonitor ? 'bg-slate-800 border-rose-900' : 'bg-rose-50 border-rose-200';
  const activeItemText = isMonitor ? 'text-rose-400' : 'text-rose-700';
  const headerBg = isMonitor ? 'bg-slate-950' : 'bg-slate-50';
  const panelBg = isMonitor ? 'bg-slate-950' : 'bg-slate-50';

  // Reusable Vitals Component for Sidebar
  const VitalsPanel = () => (
    <div className={`p-4 border-t ${sidebarBorder} ${panelBg}`}>
        <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Patient Vitals</span>
            <div className={`text-xl font-black font-mono ${isMonitor ? 'text-green-400' : 'text-slate-800'}`}>
                {activeCase.heartRate} <span className="text-xs font-sans font-medium text-slate-500">BPM</span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className={`flex justify-between items-center p-1.5 rounded border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={textSecondary}>SPEED</span>
                <span className={`font-mono font-bold ${textPrimary}`}>{paperSpeed}</span>
            </div>
            <div className={`flex justify-between items-center p-1.5 rounded border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={textSecondary}>GAIN</span>
                <span className={`font-mono font-bold ${textPrimary}`}>{voltageGain}</span>
            </div>
        </div>
        {/* Status Indicators */}
        <div className="flex gap-2 mt-2">
           {isCaliperMode && <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">CALIPERS ON</div>}
           {showMeasurements && <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500 border border-purple-500/30">AUTO MEASURE</div>}
        </div>
    </div>
  );

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${isMonitor ? 'bg-black' : 'bg-slate-100'}`}>
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} ${sidebarBg} border-r ${sidebarBorder} flex-shrink-0 transition-all duration-300 flex flex-col overflow-hidden relative z-20`}>
        
        {/* Mode Switcher */}
        <div className={`p-4 border-b ${sidebarBorder} ${headerBg} flex gap-1 flex-shrink-0`}>
           <button 
             onClick={() => setMode('training')}
             className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded shadow-sm border ${mode === 'training' 
               ? (isMonitor ? 'bg-slate-800 text-rose-400 border-slate-700' : 'bg-white text-rose-600 border-rose-200') 
               : (isMonitor ? 'bg-transparent text-slate-500 border-transparent' : 'bg-slate-100 text-slate-500 border-transparent')}`}
           >
             TRAINING
           </button>
           <button 
             onClick={() => setMode('quiz')}
             className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded shadow-sm border ${mode === 'quiz' 
               ? (isMonitor ? 'bg-slate-800 text-blue-400 border-slate-700' : 'bg-white text-blue-600 border-blue-200') 
               : (isMonitor ? 'bg-transparent text-slate-500 border-transparent' : 'bg-slate-100 text-slate-500 border-transparent')}`}
           >
             QUIZ
           </button>
        </div>
        
        {mode === 'training' && (
          <>
            <div className={`p-3 border-b text-xs font-medium flex-shrink-0 ${isMonitor ? 'bg-rose-900/20 border-rose-900/50 text-rose-300' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
               Select a reference case to study its morphology.
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {Object.entries(groupedCases).map(([category, cases]) => (
                <div key={category}>
                   <h4 className={`px-2 mb-1 text-[10px] uppercase tracking-wider font-bold ${textSecondary}`}>
                     {category}
                   </h4>
                   <div className="space-y-1">
                      {cases.map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => setCurrentTrainingCase(scenario)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            currentTrainingCase.id === scenario.id 
                            ? `${activeItemBg} shadow-sm` 
                            : `bg-transparent border-transparent ${hoverBg}`
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            {currentTrainingCase.id === scenario.id && (
                               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white mb-1 inline-block ${
                                 scenario.category === 'Normal' ? 'bg-emerald-500' :
                                 scenario.category === 'Ischemic' ? 'bg-rose-600' :
                                 scenario.category === 'Electrolyte' ? 'bg-amber-500' :
                                 scenario.category === 'Arrhythmia' ? 'bg-purple-500' :
                                 'bg-blue-500'
                               }`}>
                                 {scenario.category}
                               </span>
                            )}
                          </div>
                          <h3 className={`font-semibold text-sm ${currentTrainingCase.id === scenario.id ? activeItemText : textPrimary}`}>
                            {scenario.name}
                          </h3>
                        </button>
                      ))}
                   </div>
                </div>
              ))}
            </div>

            {/* Vitals Panel (Sidebar) */}
            <VitalsPanel />

            {/* Case Description Panel */}
            <div className={`p-4 ${panelBg} border-t ${sidebarBorder} text-sm flex-shrink-0`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className={`font-bold ${textPrimary}`}>Clinical Findings</h4>
                <button 
                  onClick={() => setShowFindings(!showFindings)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {showFindings ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showFindings ? (
                <div className="animate-fade-in">
                  <p className={`${textSecondary} mb-2 italic text-xs`}>{currentTrainingCase.description}</p>
                  <ul className="list-disc list-inside space-y-1">
                    {currentTrainingCase.keyFindings.map((f, i) => (
                      <li key={i} className={`${textPrimary} text-xs`}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className={`h-20 flex items-center justify-center border border-dashed rounded ${isMonitor ? 'border-slate-700 bg-slate-900 text-slate-600' : 'border-slate-300 bg-slate-100 text-slate-400'} text-xs`}>
                  Hidden
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'quiz' && (
          <>
            <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${isMonitor ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
               <div>
                 <div className="text-xs text-blue-500 font-bold uppercase tracking-wider">Score</div>
                 <div className={`text-2xl font-black leading-none ${isMonitor ? 'text-blue-400' : 'text-blue-900'}`}>
                    {score.correct}<span className="text-sm text-blue-400/60 font-medium">/{score.total}</span>
                 </div>
               </div>
               <button 
                 onClick={handleNextQuiz}
                 className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded shadow hover:bg-blue-700 active:transform active:scale-95 transition-all"
               >
                 NEXT EKG →
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <p className={`text-sm mb-2 ${textSecondary}`}>Analyze the live EKG and select the correct diagnosis:</p>
              
              {categories.map(cat => (
                <button
                  key={cat}
                  disabled={quizStatus !== 'waiting'}
                  onClick={() => handleDiagnosis(cat)}
                  className={`w-full p-4 rounded-xl border text-left font-bold transition-all ${
                    quizStatus === 'waiting' 
                      ? `${isMonitor ? 'bg-slate-800 border-slate-700 hover:border-blue-500 text-slate-200' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md text-slate-700'}`
                      : quizStatus === 'correct' && currentQuizCase?.category === cat
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500'
                        : quizStatus === 'incorrect' && currentQuizCase?.category === cat
                           ? 'bg-emerald-100 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500 opacity-50' /* Show right answer even if wrong */
                           : `${isMonitor ? 'bg-slate-900 border-transparent text-slate-600 opacity-50' : 'bg-slate-50 border-transparent text-slate-400 opacity-50'}`
                  }`}
                >
                  {cat}
                </button>
              ))}

              {quizStatus === 'correct' && (
                <div className="mt-4 p-3 bg-emerald-100 border border-emerald-200 rounded text-emerald-800 text-center font-bold animate-bounce">
                  ✅ Correct Diagnosis!
                </div>
              )}
               {quizStatus === 'incorrect' && (
                <div className="mt-4 p-3 bg-rose-100 border border-rose-200 rounded text-rose-800 text-center font-bold">
                  ❌ Incorrect.
                  <div className="text-xs font-normal mt-1 text-rose-700">Diagnosis was: {currentQuizCase?.category}</div>
                </div>
              )}
            </div>
            
            {/* Vitals Panel (Sidebar - Quiz Mode) */}
            <VitalsPanel />
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Toggle for Sidebar */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 border border-l-0 p-1 rounded-r shadow-md z-30 ${isMonitor ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>

        {/* Header */}
        <header className={`border-b px-2 md:px-4 py-2 flex flex-col xl:flex-row items-center justify-between shadow-sm z-10 gap-2 xl:gap-0 flex-shrink-0 transition-colors duration-300 ${isMonitor ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
          <div className="text-center md:text-left ml-6 md:ml-0 flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">EKG Simulator <span className="text-rose-500">Pro</span></h1>
            
            {/* MEDICAL SCALE CONTROLS */}
            <div className={`hidden md:flex items-center gap-0.5 ml-4 rounded-lg border p-0.5 ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setPaperSpeed(25)} 
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${paperSpeed === 25 ? (isMonitor ? 'bg-slate-600 text-white' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-400'}`}
                >
                  25mm/s
                </button>
                <button 
                  onClick={() => setPaperSpeed(50)} 
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${paperSpeed === 50 ? (isMonitor ? 'bg-slate-600 text-white' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-400'}`}
                >
                  50mm/s
                </button>
            </div>

            <div className={`hidden md:flex items-center gap-0.5 ml-1 rounded-lg border p-0.5 ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setVoltageGain(10)} 
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${voltageGain === 10 ? (isMonitor ? 'bg-slate-600 text-white' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-400'}`}
                >
                  10mm/mV
                </button>
                <button 
                  onClick={() => setVoltageGain(20)} 
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${voltageGain === 20 ? (isMonitor ? 'bg-slate-600 text-white' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-400'}`}
                >
                  20mm/mV
                </button>
            </div>

            {/* VISUAL ZOOM */}
            <div className={`hidden lg:flex items-center gap-2 ml-2 px-3 py-1 rounded-lg border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
               <span className="text-[10px] font-bold opacity-70">MAG</span>
               <input 
                 type="range" 
                 min="0.5" 
                 max="3.0" 
                 step="0.1" 
                 value={zoomLevel} 
                 onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                 className="w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-rose-500"
               />
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2">
            
            {/* Auto Measure Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setShowMeasurements(!showMeasurements)} 
                  className={`px-3 py-1 font-semibold rounded transition-colors flex items-center gap-1 ${showMeasurements ? (isMonitor ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-500 text-white shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}
                >
                  <span className="text-xs">⚡</span>
                  <span className="text-[10px] sm:text-xs">Auto</span>
                </button>
            </div>

            {/* Caliper Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setIsCaliperMode(!isCaliperMode)} 
                  className={`px-3 py-1 font-semibold rounded transition-colors flex items-center gap-1 ${isCaliperMode ? (isMonitor ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}
                >
                  <span className="text-xs">📐</span>
                  <span className="text-[10px] sm:text-xs">Calipers</span>
                </button>
            </div>

            {/* View & Theme Controls */}
            <div className="flex gap-2 text-[10px] sm:text-xs">
              <div className={`flex items-center p-0.5 rounded-lg border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={() => setThemeMode('paper')} className={`px-2 py-1 font-semibold rounded transition-colors ${themeMode === 'paper' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}>Paper</button>
                <button onClick={() => setThemeMode('monitor')} className={`px-2 py-1 font-semibold rounded transition-colors ${themeMode === 'monitor' ? 'bg-slate-700 text-green-400 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}>Monitor</button>
              </div>

              <div className={`flex items-center p-0.5 rounded-lg border ${isMonitor ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={() => setIsStaticMode(false)} className={`px-2 py-1 font-semibold rounded transition-colors ${!isStaticMode ? (isMonitor ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>Run</button>
                <button onClick={() => setIsStaticMode(true)} className={`px-2 py-1 font-semibold rounded transition-colors ${isStaticMode ? (isMonitor ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-rose-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>Pause</button>
              </div>
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <main className={`flex-1 relative overscroll-contain overflow-x-hidden overflow-y-hidden`}>
          <EKGCanvas 
            isStatic={isStaticMode} 
            themeMode={themeMode} 
            currentCase={activeCase} 
            showMeasurements={showMeasurements}
            zoomScale={zoomLevel}
            speed={paperSpeed}
            gain={voltageGain}
            isCaliperMode={isCaliperMode}
          />
        </main>
      </div>
    </div>
  );
};

export default App;