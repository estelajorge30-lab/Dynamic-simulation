import React, { useState, useEffect } from 'react';
import { BrainState, ClinicalCategory, Electrode } from '../types';
import { CLINICAL_DATA } from '../constants';
import { CheckCircle, XCircle, Brain, RefreshCw } from 'lucide-react';

interface TrainingPanelProps {
  currentBrainState: BrainState;
  onNextCase: () => void;
  selectedElectrode: Electrode | undefined;
}

const TrainingPanel: React.FC<TrainingPanelProps> = ({ currentBrainState, onNextCase, selectedElectrode }) => {
  const [selectedCategory, setSelectedCategory] = useState<ClinicalCategory | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Reset state when the brain state changes (new case)
  useEffect(() => {
    setSelectedCategory(null);
    setSelectedDiagnosis(null);
    setIsRevealed(false);
  }, [currentBrainState]);

  const correctData = CLINICAL_DATA[currentBrainState];
  const isCategoryCorrect = selectedCategory === correctData.category;
  const isDiagnosisCorrect = selectedDiagnosis === correctData.diagnosisName;

  const handleCategorySelect = (cat: ClinicalCategory) => {
    setSelectedCategory(cat);
  };

  const handleDiagnosisSelect = (name: string) => {
    setSelectedDiagnosis(name);
    setIsRevealed(true);
  };

  const possibleDiagnoses = Object.values(CLINICAL_DATA).map(d => d.diagnosisName);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 h-full flex flex-col gap-4 shadow-xl overflow-y-auto">
      <div className="border-b border-slate-700 pb-4 mb-2">
        <div className="flex items-center justify-between mb-2">
           <h2 className="text-xl font-bold text-violet-400 flex items-center gap-2">
             <Brain size={24} />
             Training Mode
           </h2>
           <button 
             onClick={onNextCase}
             className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded flex items-center gap-1 transition-colors"
           >
             <RefreshCw size={12} /> Next Case
           </button>
        </div>
        <p className="text-slate-400 text-sm">
          Analyze the EEG trace on the left. Is it normal or abnormal? Identify the pattern.
        </p>
      </div>

      {/* Step 1: Broad Category */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          1. Determine Category
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.values(ClinicalCategory).map((cat) => (
            <button
              key={cat}
              disabled={isRevealed}
              onClick={() => handleCategorySelect(cat)}
              className={`p-2 rounded text-xs font-bold transition-all border
                ${selectedCategory === cat 
                  ? (isRevealed 
                      ? (cat === correctData.category ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400')
                      : 'bg-violet-600 text-white border-violet-500')
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                }
                ${isRevealed && cat !== selectedCategory && cat === correctData.category ? 'border-green-500 text-green-500 opacity-50' : ''}
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Specific Diagnosis (Only show if category is selected) */}
      {selectedCategory && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            2. Identify Pattern
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {possibleDiagnoses.map((name) => (
              <button
                key={name}
                disabled={isRevealed}
                onClick={() => handleDiagnosisSelect(name)}
                className={`p-2 rounded text-left text-xs font-medium transition-all border
                  ${selectedDiagnosis === name
                    ? (isRevealed
                        ? (name === correctData.diagnosisName ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400')
                        : 'bg-cyan-600 border-cyan-500 text-white')
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }
                `}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Result & Explanation */}
      {isRevealed && (
        <div className={`mt-4 p-4 rounded-lg border animate-fade-in ${isDiagnosisCorrect ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
          <div className="flex items-start gap-3">
            {isDiagnosisCorrect ? <CheckCircle className="text-green-500 shrink-0" /> : <XCircle className="text-red-500 shrink-0" />}
            <div>
              <h4 className={`font-bold ${isDiagnosisCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isDiagnosisCorrect ? 'Correct Diagnosis!' : 'Incorrect'}
              </h4>
              <p className="text-white text-sm mt-1 font-semibold">{correctData.diagnosisName} ({correctData.category})</p>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                {correctData.explanation}
              </p>
              <div className="mt-3">
                 <span className="text-xs font-bold text-slate-500 uppercase">Clues:</span>
                 <ul className="list-disc list-inside text-xs text-slate-400 mt-1">
                   {correctData.clues.map((clue, i) => <li key={i}>{clue}</li>)}
                 </ul>
              </div>
            </div>
          </div>
          
          {!isDiagnosisCorrect && (
            <button 
              onClick={onNextCase}
              className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-semibold transition-colors"
            >
              Try Next Case
            </button>
          )}
        </div>
      )}

      {/* Electrode Hint */}
      {selectedElectrode && (
        <div className="mt-auto pt-4 border-t border-slate-800">
           <div className="flex items-center gap-2 text-xs text-cyan-500">
              <span className="font-bold">{selectedElectrode.id}</span>
              <span className="text-slate-500">Selected ({selectedElectrode.region})</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPanel;