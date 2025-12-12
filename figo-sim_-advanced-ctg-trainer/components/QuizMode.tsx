import React, { useState, useEffect } from 'react';
import { QuizScenario, Classification, SimulatorParams, DetailedDiagnosis, VariabilityType, DecelerationType } from '../types';
import { CheckCircle, XCircle, BookOpen, Shuffle, Activity, Heart, Waves, FileQuestion, GraduationCap, ChevronRight, RefreshCw, ArrowLeft } from 'lucide-react';

interface QuizModeProps {
  onLoadScenario: (params: SimulatorParams) => void;
  onExit: () => void;
}

// --- CURATED CASE BANK ---
// A finite list of clinically relevant scenarios for training.
const CASE_BANK: Omit<QuizScenario, 'id'>[] = [
  // --- NORMAL CASES (Low Risk) ---
  {
    name: 'Uncomplicated Primigravida',
    description: 'Primigravida, 39 weeks. 5cm dilated. Clear liquor. Epidural functioning well.',
    params: { baseline: 135, variability: 'normal', decelerations: 'none', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'none', classification: 'Normal' },
    explanation: 'A textbook normal trace. Baseline 110-160, Normal Variability (5-25), no decelerations.',
    management: 'Continue routine monitoring.'
  },
  {
    name: 'Active Second Stage',
    description: 'Full dilatation, pushing for 30 mins. Vertex visible.',
    params: { baseline: 125, variability: 'normal', decelerations: 'early', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'early', classification: 'Normal' },
    explanation: 'Early decelerations are benign and mirror contractions (head compression). The trace remains Normal.',
    management: 'Continue pushing. Monitor progress.'
  },
  {
    name: 'Sleep Cycle',
    description: 'Low risk multipara, 38 weeks. 4cm dilated. Fetus has been quiet for 20 mins.',
    params: { baseline: 140, variability: 'normal', decelerations: 'none', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'none', classification: 'Normal' },
    explanation: 'Normal trace. Parameters meet normal criteria. Sleep cycles usually last <40 mins.',
    management: 'Routine care.'
  },

  // --- SUSPICIOUS CASES (Medium Risk) ---
  {
    name: 'Uncomplicated Tachycardia',
    description: 'G2P1, 40 weeks. Maternal pulse 110. Maternal Temp 37.8°C.',
    params: { baseline: 170, variability: 'normal', decelerations: 'none', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'tachycardia', variabilityState: 'normal', decelerationState: 'none', classification: 'Suspicious' },
    explanation: 'Baseline > 160 bpm makes this Suspicious. Likely secondary to maternal pyrexia/infection.',
    management: 'Treat maternal pyrexia (Paracetamol, fluids), check infection markers. Monitor closely.'
  },
  {
    name: 'Variable Decelerations',
    description: 'Spontaneous labour, 6cm dilated. Membranes ruptured spontaneously 1 hour ago.',
    params: { baseline: 145, variability: 'normal', decelerations: 'variable', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'variable', classification: 'Suspicious' },
    explanation: 'Repetitive variable decelerations (cord compression) make the trace Suspicious.',
    management: 'Change maternal position to relieve cord compression. Consider vaginal exam to exclude cord prolapse.'
  },
  {
    name: 'Rapid Descent / Tachysystole',
    description: 'Multiparous, 9cm dilated. Progressing rapidly. Uterus contracting frequently.',
    params: { baseline: 140, variability: 'normal', decelerations: 'variable', contractions: 'tachysystole', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'variable', classification: 'Suspicious' },
    explanation: 'Variable decelerations with tachysystole. The frequent contractions may be causing transient cord compression.',
    management: 'Lateral position. Consider tocolysis if fetal heart rate worsens.'
  },
  {
    name: 'Overshoot / Saltatory',
    description: 'Active labour. Fetus appears very active.',
    params: { baseline: 150, variability: 'saltatory', decelerations: 'none', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'saltatory', decelerationState: 'none', classification: 'Suspicious' },
    explanation: 'Excessive variability (>25 bpm) is classified as Saltatory. If prolonged >30 mins, it is suspicious/abnormal.',
    management: 'Conservative measures. Ensure not recording maternal pulse.'
  },

  // --- PATHOLOGICAL CASES (High Risk) ---
  {
    name: 'Epidural Hypotension',
    description: '15 mins post-epidural insertion. Maternal BP 90/50. Feeling nauseous.',
    params: { baseline: 100, variability: 'minimal', decelerations: 'late', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'bradycardia', variabilityState: 'minimal', decelerationState: 'late', classification: 'Pathological' },
    explanation: 'Bradycardia and Late Decelerations following epidural suggest hypotension causing placental hypoperfusion.',
    management: 'IV Fluids, Ephedrine, Left Lateral Tilt immediately.'
  },
  {
    name: 'Uteroplacental Insufficiency',
    description: '41+3 weeks. Induction for post-dates. Meconium stained liquor grade 2.',
    params: { baseline: 150, variability: 'minimal', decelerations: 'late', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'minimal', decelerationState: 'late', classification: 'Pathological' },
    explanation: 'Late decelerations + Reduced variability = High probability of hypoxia (Pathological).',
    management: 'Stop oxytocin. Acute tocolysis. Fetal Blood Sampling (if feasible) or expedited delivery.'
  },
  {
    name: 'Cord Prolapse / Compression',
    description: 'Artificial rupture of membranes performed 5 mins ago. Large gush of fluid.',
    params: { baseline: 110, variability: 'normal', decelerations: 'prolonged', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'prolonged', classification: 'Pathological' },
    explanation: 'Prolonged deceleration (>3 mins). Context suggests acute cord compression or prolapse.',
    management: 'Vaginal exam immediately to rule out cord prolapse. Change position. Emergency delivery if not resolved.'
  },
  {
    name: 'Chorioamnionitis Pattern',
    description: 'Maternal temp 38.9°C. Foul smelling liquor. Tender uterus.',
    params: { baseline: 180, variability: 'minimal', decelerations: 'none', contractions: 'tachysystole', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'tachycardia', variabilityState: 'minimal', decelerationState: 'none', classification: 'Pathological' },
    explanation: 'Tachycardia + Reduced Variability is a Pathological combination, often seen in sepsis.',
    management: 'Antibiotics, IV fluids, antipyretics. Expedite delivery.'
  },
  {
    name: 'Severe Anemia',
    description: '34 weeks. Reduced fetal movements. History of Fetomaternal Hemorrhage.',
    params: { baseline: 140, variability: 'sinusoidal', decelerations: 'none', contractions: 'none', noiseLevel: 0 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'sinusoidal', decelerationState: 'none', classification: 'Pathological' },
    explanation: 'Sinusoidal pattern indicates severe anemia or acute hypoxia.',
    management: 'Immediate delivery (Category 1 Section).'
  },
  {
    name: 'Terminal Bradycardia',
    description: 'Post-Epidural top-up. BP 80/40.',
    params: { baseline: 90, variability: 'minimal', decelerations: 'late', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'bradycardia', variabilityState: 'minimal', decelerationState: 'late', classification: 'Pathological' },
    explanation: 'Baseline < 100 bpm is abnormal. Combined with minimal variability, this is pre-terminal.',
    management: 'Correct hypotension (Ephedrine/Fluids). Turn patient. If no recovery, immediate delivery.'
  },
  {
    name: 'Hyperstimulation',
    description: 'Induction with Prostaglandins. Uterus feels "tight" constantly.',
    params: { baseline: 160, variability: 'normal', decelerations: 'late', contractions: 'tachysystole', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'late', classification: 'Pathological' },
    explanation: 'Tachysystole (>5 contractions/10min) causing Late Decelerations.',
    management: 'Remove prostaglandins / Stop Oxytocin. Tocolysis (Terbutaline).'
  }
];

// PRESET SCENARIOS (Left sidebar visible buttons)
const PRESET_SCENARIOS: QuizScenario[] = [
  {
    id: '1',
    name: 'Tutorial: Normal',
    description: 'A standard low-risk trace to practice identifying normal baselines.',
    params: { baseline: 140, variability: 'normal', decelerations: 'none', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'normal', decelerationState: 'none', classification: 'Normal' },
    explanation: 'Baseline 110-160, Normal Variability, No Decels.',
    management: 'Routine Care.'
  },
  {
    id: '2',
    name: 'Tutorial: Pathological',
    description: 'A classic example of hypoxic stress.',
    params: { baseline: 155, variability: 'minimal', decelerations: 'late', contractions: 'normal', noiseLevel: 1 },
    correctDiagnosis: { baselineState: 'normal', variabilityState: 'minimal', decelerationState: 'late', classification: 'Pathological' },
    explanation: 'Late decels + reduced variability.',
    management: 'Expedite Delivery.'
  }
];

// RANDOM CASE GENERATOR
const generateRandomCase = (): QuizScenario => {
  // Select a random index from the finite CASE_BANK
  const randomIndex = Math.floor(Math.random() * CASE_BANK.length);
  const selectedCase = CASE_BANK[randomIndex];

  // Return formatted QuizScenario with a unique ID to force re-render/reset
  return {
    ...selectedCase,
    id: `case-${Date.now()}-${randomIndex}`, // Unique ID for React keys
    // We keep the internal name for debugging but in the UI we display context
  };
};

const QuizMode: React.FC<QuizModeProps> = ({ onLoadScenario, onExit }) => {
  const [currentStep, setCurrentStep] = useState<'selection' | 'observation' | 'answering' | 'result'>('selection');
  const [activeScenario, setActiveScenario] = useState<QuizScenario | null>(null);
  const [timer, setTimer] = useState(0);

  // Form State
  const [userDiagnosis, setUserDiagnosis] = useState<DetailedDiagnosis>({
    baselineState: 'normal',
    variabilityState: 'normal',
    decelerationState: 'none',
    classification: 'Normal'
  });

  const startScenario = (scenario: QuizScenario) => {
    setActiveScenario(scenario);
    onLoadScenario(scenario.params);
    setCurrentStep('observation');
    setTimer(0);
    // Reset Form
    setUserDiagnosis({
       baselineState: 'normal',
       variabilityState: 'normal',
       decelerationState: 'none',
       classification: 'Normal'
    });
  };

  const startRandom = () => {
    startScenario(generateRandomCase());
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentStep === 'observation') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep]);

  // --- RENDERING HELPERS ---

  const renderSelection = () => (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-8">
      <div className="bg-slate-800 max-w-5xl w-full rounded-xl shadow-2xl border border-slate-700 p-8 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="text-indigo-400" /> Diagnostic Training
            </h2>
            <button onClick={onExit} className="text-slate-400 hover:text-white flex items-center gap-2">
              <ArrowLeft size={16} /> Exit Quiz
            </button>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Random Generator */}
          <div className="w-1/3 shrink-0">
             <button 
               onClick={startRandom}
               className="w-full h-full bg-indigo-600 hover:bg-indigo-500 rounded-lg p-6 flex flex-col items-center justify-center gap-4 transition-all shadow-lg hover:shadow-indigo-500/25 border border-indigo-400"
             >
               <Shuffle size={48} className="text-white" />
               <div className="text-center">
                 <h3 className="text-2xl font-bold text-white">Random Clinical Case</h3>
                 <p className="text-indigo-200 mt-2 text-sm">Test yourself against a bank of real-world scenarios.</p>
               </div>
             </button>
          </div>

          {/* Presets */}
          <div className="w-2/3 flex flex-col gap-4">
             <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Tutorials</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => startScenario(scenario)}
                  className="bg-slate-700 hover:bg-slate-600 p-6 rounded-lg text-left transition-all border border-transparent hover:border-slate-500 group h-fit"
                >
                  <h3 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-white">{scenario.name}</h3>
                  <p className="text-slate-400 text-xs">{scenario.description}</p>
                </button>
              ))}
             </div>
             
             <div className="mt-auto bg-slate-900/50 p-4 rounded border border-slate-700">
               <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-2"><Activity size={16}/> How to use</h4>
               <p className="text-sm text-slate-400">
                 Click "Random Clinical Case" to simulate a specific patient. The trace will generate on the right. 
                 Observe the baseline, variability, and decelerations, then enter your diagnosis in the sidebar.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderObservation = () => (
    <div className="p-4 space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
            <Activity size={12} /> Observation
          </span>
          <span className="text-xs font-mono text-white bg-slate-700 px-2 py-1 rounded">{timer}s</span>
        </div>
        
        <h3 className="font-bold text-white mb-2">Clinical Context</h3>
        <p className="text-sm text-slate-300 border-l-2 border-indigo-500 pl-3">
          {activeScenario?.description}
        </p>
      </div>

      <div className="text-xs text-slate-500 italic px-1">
        Observe the trace on the right. Identify Baseline, Variability, and Decelerations.
      </div>

      <button 
        onClick={() => setCurrentStep('answering')}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded shadow-lg transition-colors flex items-center justify-center gap-2 mt-4"
      >
        <FileQuestion size={18} /> Make Diagnosis
      </button>
    </div>
  );

  const renderAnswering = () => (
    <div className="p-4 space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 pb-20">
      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
        <h3 className="font-bold text-slate-200">Diagnostic Form</h3>
        <span className="text-xs text-slate-500">Required</span>
      </div>
      
      {/* Baseline Section */}
      <div className="space-y-2">
          <h4 className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-2"><Heart size={12}/> Baseline</h4>
          <div className="flex flex-col gap-1">
            {['bradycardia', 'normal', 'tachycardia'].map((opt) => (
              <label key={opt} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-all ${userDiagnosis.baselineState === opt ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                <input 
                  type="radio" 
                  name="baseline"
                  className="accent-emerald-500"
                  checked={userDiagnosis.baselineState === opt}
                  onChange={() => setUserDiagnosis({...userDiagnosis, baselineState: opt as any})}
                />
                <span className="capitalize text-slate-200 text-xs">{opt}</span>
              </label>
            ))}
          </div>
      </div>

      {/* Variability Section */}
      <div className="space-y-2">
          <h4 className="text-blue-400 text-xs font-bold uppercase flex items-center gap-2"><Waves size={12}/> Variability</h4>
          <div className="flex flex-col gap-1">
            {(['absent', 'minimal', 'normal', 'saltatory', 'sinusoidal'] as VariabilityType[]).map((opt) => (
              <label key={opt} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-all ${userDiagnosis.variabilityState === opt ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                <input 
                  type="radio" 
                  name="variability"
                  className="accent-blue-500"
                  checked={userDiagnosis.variabilityState === opt}
                  onChange={() => setUserDiagnosis({...userDiagnosis, variabilityState: opt})}
                />
                <span className="capitalize text-slate-200 text-xs">{opt}</span>
              </label>
            ))}
          </div>
      </div>

      {/* Decelerations Section */}
      <div className="space-y-2">
          <h4 className="text-amber-400 text-xs font-bold uppercase flex items-center gap-2"><Activity size={12}/> Decelerations</h4>
          <div className="flex flex-col gap-1">
            {(['none', 'early', 'variable', 'late', 'prolonged'] as DecelerationType[]).map((opt) => (
              <label key={opt} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-all ${userDiagnosis.decelerationState === opt ? 'bg-amber-900/30 border-amber-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                <input 
                  type="radio" 
                  name="decelerations"
                  className="accent-amber-500"
                  checked={userDiagnosis.decelerationState === opt}
                  onChange={() => setUserDiagnosis({...userDiagnosis, decelerationState: opt})}
                />
                <span className="capitalize text-slate-200 text-xs">{opt}</span>
              </label>
            ))}
          </div>
      </div>

      {/* Classification Section */}
      <div className="space-y-2 pt-2 border-t border-slate-700">
          <h4 className="text-white text-xs font-bold text-center mb-1">FIGO Classification</h4>
          <div className="flex flex-col gap-2">
            {(['Normal', 'Suspicious', 'Pathological'] as Classification[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setUserDiagnosis({...userDiagnosis, classification: opt})}
                className={`w-full py-2 rounded font-bold text-xs border transition-all ${
                  userDiagnosis.classification === opt 
                    ? (opt === 'Normal' ? 'bg-emerald-600 border-emerald-400 text-white' : opt === 'Suspicious' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-red-600 border-red-400 text-white')
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
      </div>

      <button 
        onClick={() => setCurrentStep('result')}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded shadow-xl transition-transform active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
      >
        Submit
        <ChevronRight size={16} />
      </button>
    </div>
  );

  const renderResult = () => {
    if (!activeScenario) return null;
    const isCorrect = userDiagnosis.classification === activeScenario.correctDiagnosis.classification;
    
    // Helper to render row comparison
    const ComparisonRow = ({ label, user, actual }: { label: string, user: string, actual: string }) => {
      const match = user === actual;
      return (
        <div className="py-2 border-b border-slate-700 last:border-0">
          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{label}</div>
          <div className="flex justify-between items-center text-xs">
             <span className={`font-mono ${match ? 'text-emerald-400' : 'text-red-400 line-through'}`}>{user}</span>
             {!match && <span className="font-mono text-indigo-300">→ {actual}</span>}
             {match && <span className="font-mono text-emerald-600">✓</span>}
          </div>
        </div>
      );
    };

    return (
      <div className="p-4 space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-300">
          
          <div className={`p-4 rounded-lg border flex flex-col items-center text-center ${isCorrect ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
             {isCorrect ? <CheckCircle className="text-emerald-500 mb-2" size={32} /> : <XCircle className="text-red-500 mb-2" size={32} />}
             <h2 className={`text-xl font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
               {isCorrect ? 'Correct!' : 'Incorrect'}
             </h2>
             <p className="text-slate-400 text-sm mt-1">
               Trace was <span className="text-white font-bold">{activeScenario.correctDiagnosis.classification}</span>.
             </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <ComparisonRow label="Baseline" user={userDiagnosis.baselineState} actual={activeScenario.correctDiagnosis.baselineState} />
            <ComparisonRow label="Variability" user={userDiagnosis.variabilityState} actual={activeScenario.correctDiagnosis.variabilityState} />
            <ComparisonRow label="Decelerations" user={userDiagnosis.decelerationState} actual={activeScenario.correctDiagnosis.decelerationState} />
            <ComparisonRow label="Classification" user={userDiagnosis.classification} actual={activeScenario.correctDiagnosis.classification} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
               <h4 className="text-xs font-bold text-indigo-400 uppercase">Explanation</h4>
               <p className="text-xs text-slate-300 bg-slate-800 p-2 rounded">{activeScenario.explanation}</p>
            </div>
            <div className="space-y-1">
               <h4 className="text-xs font-bold text-emerald-400 uppercase">Management</h4>
               <p className="text-xs text-slate-300 bg-slate-800 p-2 rounded">{activeScenario.management}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
             <button onClick={startRandom} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded font-bold shadow-lg flex items-center justify-center gap-2">
               <RefreshCw size={16} /> Next Random Case
             </button>
             <button onClick={() => setCurrentStep('selection')} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded font-bold text-sm">
               Back to Menu
             </button>
          </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 border-r border-slate-700 w-80 flex flex-col h-full shadow-2xl overflow-y-auto relative shrink-0 z-20">
      <div className="p-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-20">
        <h2 className="text-indigo-400 font-bold text-lg flex items-center gap-2">
          <GraduationCap size={20} /> Quiz Mode
        </h2>
      </div>

      {currentStep === 'selection' && renderSelection()}
      {currentStep === 'observation' && renderObservation()}
      {currentStep === 'answering' && renderAnswering()}
      {currentStep === 'result' && renderResult()}
    </div>
  );
};

export default QuizMode;