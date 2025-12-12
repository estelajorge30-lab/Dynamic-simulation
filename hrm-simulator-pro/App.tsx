
import React, { useState, useCallback, useEffect } from 'react';
import { ScenarioType, QuizState } from './types';
import ManometryCanvas from './components/ManometryCanvas';
import ScenarioControls from './components/ScenarioControls';
import PressureLegend from './components/PressureLegend';
import { getSimulationMetrics, getSwallowVariability } from './services/simulationPhysics';

const ALL_SCENARIOS = Object.values(ScenarioType);

const App: React.FC = () => {
  // State
  const [scenario, setScenario] = useState<ScenarioType>(ScenarioType.NORMAL);
  const [swallowTimestamp, setSwallowTimestamp] = useState<number | null>(null);
  const [isSwallowing, setIsSwallowing] = useState(false);
  const [metrics, setMetrics] = useState({ dci: 'Ready' as string | number, dl: 'Ready' as string | number, irp: 0 });
  
  // Quiz State
  const [quiz, setQuiz] = useState<QuizState>({
    isActive: false,
    currentScenario: null,
    score: 0,
    totalQuestions: 0,
    lastAnswerCorrect: null,
    showFeedback: false
  });

  // Pick a random scenario for quiz
  const startNewQuizRound = useCallback(() => {
    const randomScenario = ALL_SCENARIOS[Math.floor(Math.random() * ALL_SCENARIOS.length)];
    setScenario(randomScenario);
    setQuiz(prev => ({
      ...prev,
      currentScenario: randomScenario,
      lastAnswerCorrect: null,
      showFeedback: false
    }));
    // Reset visual
    setSwallowTimestamp(null);
    setMetrics({ dci: 'Ready', dl: 'Ready', irp: 0 });
  }, []);

  const toggleQuizMode = () => {
    if (quiz.isActive) {
      // Exit Quiz
      setQuiz(prev => ({ ...prev, isActive: false }));
      setScenario(ScenarioType.NORMAL);
    } else {
      // Start Quiz
      setQuiz({
        isActive: true,
        currentScenario: null,
        score: 0,
        totalQuestions: 0,
        lastAnswerCorrect: null,
        showFeedback: false
      });
      startNewQuizRound();
    }
  };

  const handleQuizAnswer = (guess: ScenarioType) => {
    if (!quiz.currentScenario) return;
    
    const isCorrect = guess === quiz.currentScenario;
    setQuiz(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      totalQuestions: prev.totalQuestions + 1,
      lastAnswerCorrect: isCorrect,
      showFeedback: true
    }));
  };

  const handleSwallow = useCallback(() => {
    if (isSwallowing) return;
    
    const now = Date.now();
    setSwallowTimestamp(now);
    setIsSwallowing(true);

    const variability = getSwallowVariability(now);
    // Important: In quiz mode, we simulate the HIDDEN scenario, otherwise the selected one
    const activeScenario = quiz.isActive && quiz.currentScenario ? quiz.currentScenario : scenario;
    const calculatedMetrics = getSimulationMetrics(activeScenario, variability);
    setMetrics(calculatedMetrics);

    setTimeout(() => {
      setIsSwallowing(false);
      setSwallowTimestamp(null);
    }, 12000);
  }, [isSwallowing, scenario, quiz]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-900 selection:text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shadow-lg transition-colors ${quiz.isActive ? 'bg-amber-600 shadow-amber-900/50' : 'bg-indigo-600 shadow-indigo-900/50'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                HRM Simulator <span className={quiz.isActive ? 'text-amber-400' : 'text-indigo-400'}>
                  {quiz.isActive ? 'Quiz' : 'Classic'}
                </span>
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide">
                Chicago Classification v4.0 • Achalasia Subtypes
              </p>
            </div>
          </div>
          
          {/* Quiz Scoreboard */}
          {quiz.isActive && (
            <div className="flex items-center gap-4 bg-gray-900 px-4 py-1.5 rounded-full border border-gray-700">
              <span className="text-xs text-gray-400 font-bold uppercase">Score</span>
              <span className="text-xl font-bold text-white font-mono">{quiz.score} / {quiz.totalQuestions}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Visualization Area */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-1 overflow-hidden shrink-0 relative">
              <div className="flex h-[450px]">
                <div className="flex-1 relative bg-black rounded-l-xl overflow-hidden">
                  <ManometryCanvas 
                    scenario={quiz.isActive && quiz.currentScenario ? quiz.currentScenario : scenario}
                    swallowTriggeredAt={swallowTimestamp}
                    isLive={true}
                    hideScenarioLabel={quiz.isActive}
                  />
                  <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono border border-gray-700 z-10">
                    {isSwallowing ? <span className="text-red-400 animate-pulse">● LIVE</span> : 'READY'}
                  </div>
                </div>
                <div className="w-16 bg-gray-900 border-l border-gray-700 rounded-r-xl">
                   <PressureLegend />
                </div>
              </div>

              {/* Quiz Feedback Overlay */}
              {quiz.isActive && quiz.showFeedback && (
                <div className="absolute inset-0 bg-gray-900/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
                  <div className={`p-4 rounded-full mb-4 ${quiz.lastAnswerCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {quiz.lastAnswerCorrect 
                      ? <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 
                      : <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    }
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {quiz.lastAnswerCorrect ? 'Correct Diagnosis!' : 'Incorrect'}
                  </h2>
                  <p className="text-gray-400 mb-6">
                    This was <span className="text-white font-bold">{quiz.currentScenario?.replace(/_/g, ' ')}</span>
                  </p>
                  <button 
                    onClick={startNewQuizRound}
                    className="bg-white text-gray-900 px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    Next Case →
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Panel: Quiz Answers OR Interpretation */}
            <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden flex flex-col">
              {quiz.isActive ? (
                /* QUIZ UI */
                <div className="flex-1 flex flex-col">
                   <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                     <span>🕵️‍♂️ Identify the Pathology</span>
                   </h3>
                   {quiz.showFeedback ? (
                     <div className="flex-1 flex items-center justify-center text-gray-500">
                       Waiting...
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {ALL_SCENARIOS.map(s => (
                         <button
                           key={s}
                           onClick={() => handleQuizAnswer(s)}
                           className="text-xs p-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 font-semibold text-left transition-all active:scale-95 flex flex-col gap-1"
                         >
                           <span className="text-white">{s.replace('ACHALASIA_', '').replace(/_/g, ' ')}</span>
                         </button>
                       ))}
                     </div>
                   )}
                </div>
              ) : (
                /* LEARNING UI */
                <>
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <h3 className="text-lg font-semibold text-indigo-300 mb-3">Diagnostic Criteria (CC v4.0)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                        <strong className="text-green-400 block mb-1">Normal</strong>
                        <ul className="text-gray-400 text-xs space-y-1">
                           <li>• IRP &lt; 15 mmHg</li>
                           <li>• Intact Peristalsis</li>
                        </ul>
                     </div>
                     <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                        <strong className="text-blue-400 block mb-1">Type I (Classic)</strong>
                        <ul className="text-gray-400 text-xs space-y-1">
                           <li>• IRP &gt; 15 mmHg</li>
                           <li>• 100% Failed Peristalsis</li>
                           <li>• NO pressurization</li>
                        </ul>
                     </div>
                     <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                        <strong className="text-yellow-400 block mb-1">Type II (Compression)</strong>
                        <ul className="text-gray-400 text-xs space-y-1">
                           <li>• IRP &gt; 15 mmHg</li>
                           <li>• Pan-esophageal pressurization</li>
                           <li>• Often &gt;30mmHg vertical bands</li>
                        </ul>
                     </div>
                     <div className="bg-gray-700/30 p-3 rounded border border-gray-600/20">
                        <strong className="text-red-400 block mb-1">Type III (Spastic)</strong>
                        <ul className="text-gray-400 text-xs space-y-1">
                           <li>• IRP &gt; 15 mmHg</li>
                           <li>• Premature / Spastic Waves</li>
                           <li>• Distal Latency &lt; 4.5s</li>
                        </ul>
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
            <ScenarioControls 
              currentScenario={scenario}
              onScenarioChange={setScenario}
              onSwallow={handleSwallow}
              isSwallowing={isSwallowing}
              isQuizMode={quiz.isActive}
              onToggleQuiz={toggleQuizMode}
            />

            <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 shrink-0">
              <h4 className="font-semibold text-gray-400 mb-3 text-sm uppercase tracking-wide flex justify-between">
                <span>Real-time Metrics</span>
                <span className="text-[10px] normal-case bg-gray-700 px-1.5 rounded text-gray-500">eSleeve</span>
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30 flex justify-between items-center group">
                  <div className="text-xs text-gray-400">IRP (4s)</div>
                  <div className={`font-mono font-bold text-lg ${metrics.irp > 15 ? 'text-red-500' : 'text-green-500'}`}>
                    {metrics.irp} <span className="text-[10px] text-gray-500 font-sans">mmHg</span>
                  </div>
                </div>
                <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30 flex justify-between items-center">
                  <div className="text-xs text-gray-400">Distal Latency</div>
                  <div className="font-mono font-bold text-indigo-300">{metrics.dl}</div>
                </div>
                <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30 flex justify-between items-center">
                  <div className="text-xs text-gray-400">DCI</div>
                  <div className="font-mono font-bold text-gray-200">
                    {metrics.dci}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
