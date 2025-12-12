
import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Stethoscope, GraduationCap, 
  Activity, RotateCcw, Eye, EyeOff, LayoutTemplate,
  CheckCircle2, XCircle
} from 'lucide-react';

import SpirometryGraph from './components/SpirometryGraph';
import InfoPanel from './components/InfoPanel';
import { generateCase } from './utils/spirometryMath';
import { analyzeSpirometry } from './services/geminiService';
import { DiagnosisType, AnalysisState, CaseData, Severity, QuizState } from './types';

function App() {
  // Modes: 'practice' = Playground, 'quiz' = Blinded Test
  const [mode, setMode] = useState<'practice' | 'quiz'>('practice');
  
  // State
  const [currentCase, setCurrentCase] = useState<CaseData>(generateCase(DiagnosisType.NORMAL));
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'flow-volume' | 'volume-time'>('flow-volume');
  const [showPredicted, setShowPredicted] = useState(true);

  // Quiz State
  const [quizState, setQuizState] = useState<QuizState>({
    active: false,
    currentCase: null,
    selectedDiagnosis: null,
    selectedSeverity: null,
    isCorrect: null,
    feedback: null,
    streak: 0
  });

  // Analysis State
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false, content: null, error: null
  });

  // Handlers
  const handleGeneratePractice = (type: DiagnosisType) => {
    const newCase = generateCase(type);
    setCurrentCase(newCase);
    setAnalysis({ loading: false, content: null, error: null });
    setIsPlaying(true);
  };

  const startNewQuizQuestion = () => {
    const newCase = generateCase(); // Random diagnosis
    setQuizState({
        active: true,
        currentCase: newCase,
        selectedDiagnosis: null,
        selectedSeverity: null,
        isCorrect: null,
        feedback: null,
        streak: quizState.streak
    });
    // For quiz, we display the generated case, but HIDE the diagnosis details initially
    setCurrentCase(newCase);
    setIsPlaying(false);
    setAnalysis({ loading: false, content: null, error: null });
  };

  const submitQuizAnswer = (diagnosis: DiagnosisType) => {
    if (!quizState.currentCase) return;
    
    const isCorrect = diagnosis === quizState.currentCase.diagnosis;
    
    // Simple feedback logic based on PDF
    let feedback = "";
    if (isCorrect) {
        feedback = "Correct! The loop shape and values match the criteria.";
    } else {
        feedback = `Incorrect. Look at the FEV1/FVC ratio (${quizState.currentCase.actual.ratio.toFixed(2)}). `;
        if (quizState.currentCase.diagnosis === DiagnosisType.OBSTRUCTIVE) {
            feedback += "The scooped expiratory limb and low ratio indicate Obstruction.";
        } else if (quizState.currentCase.diagnosis === DiagnosisType.RESTRICTIVE) {
            feedback += "The preserved ratio but low volumes indicate Restriction.";
        } else if (quizState.currentCase.diagnosis === DiagnosisType.NORMAL) {
             feedback += "Values are within normal limits (above LLN).";
        }
    }

    setQuizState(prev => ({
        ...prev,
        selectedDiagnosis: diagnosis,
        isCorrect,
        feedback,
        streak: isCorrect ? prev.streak + 1 : 0
    }));
  };

  const handleAnalyze = async () => {
    setAnalysis(prev => ({ ...prev, loading: true }));
    const result = await analyzeSpirometry(currentCase);
    setAnalysis({ loading: false, content: result, error: null });
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center shadow-sm">
        <div className="w-full max-w-[1600px] mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
              <Stethoscope size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
                SpiroFlow Pro
              </h1>
              <span className="text-xs text-slate-400 font-medium tracking-wider">CLINICAL TRAINING SUITE</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
             <button 
                onClick={() => { setMode('practice'); setQuizState(prev => ({...prev, active: false})); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'practice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <div className="flex items-center gap-2"><Activity size={14} /> Practice</div>
             </button>
             <button 
                onClick={() => { setMode('quiz'); startNewQuizQuestion(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'quiz' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <div className="flex items-center gap-2"><GraduationCap size={14} /> Quiz Mode</div>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6 flex gap-6 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* LEFT COLUMN: Controls & Quiz Interface */}
        <aside className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pb-6">
          
          {/* Practice Controls */}
          {mode === 'practice' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Load Scenario</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[DiagnosisType.NORMAL, DiagnosisType.OBSTRUCTIVE, DiagnosisType.RESTRICTIVE, DiagnosisType.MIXED].map(type => (
                    <button
                      key={type}
                      onClick={() => handleGeneratePractice(type)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                         currentCase.diagnosis === type
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Options</h3>
                 <button 
                    onClick={() => setViewMode(prev => prev === 'flow-volume' ? 'volume-time' : 'flow-volume')}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                 >
                    <span>Graph Type</span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{viewMode}</span>
                 </button>
                 <button 
                    onClick={() => setShowPredicted(!showPredicted)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                 >
                    <span>Predicted Values</span>
                    {showPredicted ? <Eye size={14} className="text-indigo-600"/> : <EyeOff size={14} className="text-slate-400"/>}
                 </button>
              </div>
            </div>
          )}

          {/* Quiz Interface */}
          {mode === 'quiz' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6 flex-1 flex flex-col">
               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-800">Diagnostic Challenge</h3>
                  <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                     Streak: {quizState.streak} 🔥
                  </div>
               </div>
               
               <div className="space-y-4 flex-1">
                  <p className="text-sm text-slate-600">
                    Analyze the curve and values. What is the most likely diagnosis?
                  </p>
                  
                  <div className="space-y-2">
                    {[DiagnosisType.NORMAL, DiagnosisType.OBSTRUCTIVE, DiagnosisType.RESTRICTIVE, DiagnosisType.MIXED].map(type => {
                        const isSelected = quizState.selectedDiagnosis === type;
                        const isCorrect = quizState.isCorrect;
                        const isAnswer = quizState.currentCase?.diagnosis === type;
                        
                        let baseClass = "w-full p-3 text-left text-sm font-medium rounded-lg border flex items-center justify-between transition-all";
                        if (!quizState.selectedDiagnosis) {
                            baseClass += " hover:bg-slate-50 border-slate-200 text-slate-700";
                        } else {
                            if (isAnswer) baseClass += " bg-emerald-50 border-emerald-500 text-emerald-700";
                            else if (isSelected && !isCorrect) baseClass += " bg-red-50 border-red-300 text-red-700";
                            else baseClass += " opacity-50 border-slate-200";
                        }

                        return (
                            <button 
                                key={type}
                                disabled={!!quizState.selectedDiagnosis}
                                onClick={() => submitQuizAnswer(type)}
                                className={baseClass}
                            >
                                {type}
                                {quizState.selectedDiagnosis && isAnswer && <CheckCircle2 size={16}/>}
                                {quizState.selectedDiagnosis && isSelected && !isCorrect && <XCircle size={16}/>}
                            </button>
                        );
                    })}
                  </div>
                  
                  {quizState.feedback && (
                      <div className={`p-3 rounded-lg text-sm ${quizState.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'} animate-in fade-in slide-in-from-top-2`}>
                          {quizState.feedback}
                      </div>
                  )}
               </div>
               
               {quizState.selectedDiagnosis && (
                  <button 
                     onClick={startNewQuizQuestion}
                     className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                     <RotateCcw size={16} /> Next Case
                  </button>
               )}
            </div>
          )}

        </aside>

        {/* CENTER: Graph Area */}
        <section className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col relative">
           
           {/* Graph Toolbar */}
           <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                 onClick={() => setIsPlaying(!isPlaying)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur shadow border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                 {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                 {isPlaying ? 'Pause' : 'Animate'}
              </button>
           </div>

           <div className="flex-1 p-6">
              <SpirometryGraph 
                data={currentCase} 
                isPlaying={isPlaying} 
                showPredicted={showPredicted}
                viewMode={viewMode}
              />
           </div>
           
           {/* Graph Footer Legend */}
           <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex gap-6 text-xs text-slate-500">
               <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Actual Effort
               </div>
               {showPredicted && (
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 border border-slate-400 border-dashed rounded-sm"></div> Predicted (GLI)
                   </div>
               )}
               {viewMode === 'volume-time' && (
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-pink-500"></div> FEV1 Marker
                    </div>
               )}
           </div>
        </section>

        {/* RIGHT COLUMN: Report Panel */}
        <aside className="w-96 shrink-0 h-full">
            <InfoPanel 
              data={currentCase} 
              analysis={analysis} 
              onAnalyze={handleAnalyze} 
              isQuizMode={mode === 'quiz'}
              showDiagnosis={mode === 'practice' || !!quizState.selectedDiagnosis}
            />
        </aside>

      </main>
    </div>
  );
}

export default App;
