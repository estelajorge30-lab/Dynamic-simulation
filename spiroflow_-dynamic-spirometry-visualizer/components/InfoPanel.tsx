
import React from 'react';
import { Sparkles, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CaseData, AnalysisState, DiagnosisType } from '../types';

interface InfoPanelProps {
  data: CaseData;
  analysis: AnalysisState;
  onAnalyze: () => void;
  isQuizMode: boolean;
  showDiagnosis: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ data, analysis, onAnalyze, isQuizMode, showDiagnosis }) => {
  
  const getPercent = (actual: number, pred: number) => ((actual / pred) * 100).toFixed(0);
  
  const getRowColor = (val: number, pred: number, type: 'vol' | 'ratio') => {
    // Simple visual cue: < 80% or < LLN is flagged
    if (type === 'ratio') return val < data.predicted.ratioLLN ? 'text-red-600 font-bold' : 'text-slate-700';
    return (val / pred) < 0.8 ? 'text-red-600 font-bold' : 'text-slate-700';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Patient Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex justify-between items-start">
          <div>
             <h2 className="text-lg font-bold text-slate-800">Report # {data.id.toUpperCase()}</h2>
             <div className="text-sm text-slate-500 mt-1 flex gap-3">
               <span>{data.demographics.age}y {data.demographics.sex}</span>
               <span>•</span>
               <span>{data.demographics.height}cm</span>
               <span>•</span>
               <span>{data.demographics.ethnicity}</span>
             </div>
          </div>
          {showDiagnosis && (
             <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                data.diagnosis === DiagnosisType.NORMAL 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
             }`}>
                {data.severity !== 'Normal' ? data.severity : ''} {data.diagnosis}
             </div>
          )}
        </div>
      </div>

      {/* Clinical Data Table */}
      <div className="p-6 overflow-y-auto flex-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Spirometry Results</h3>
        
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 text-slate-500 font-medium w-1/4">Param</th>
              <th className="pb-2 text-slate-500 font-medium text-right">Meas</th>
              <th className="pb-2 text-slate-500 font-medium text-right bg-slate-50/50">Pred</th>
              <th className="pb-2 text-slate-500 font-medium text-right">%Pred</th>
              <th className="pb-2 text-slate-500 font-medium text-right text-xs">LLN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 font-medium text-slate-700">FVC (L)</td>
              <td className={`py-3 text-right ${getRowColor(data.actual.fvc, data.predicted.fvcPred, 'vol')}`}>
                {data.actual.fvc.toFixed(2)}
              </td>
              <td className="py-3 text-right text-slate-500 bg-slate-50/50">{data.predicted.fvcPred.toFixed(2)}</td>
              <td className="py-3 text-right text-slate-600">{getPercent(data.actual.fvc, data.predicted.fvcPred)}%</td>
              <td className="py-3 text-right text-slate-400 text-xs">{data.predicted.fvcLLN.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-slate-700">FEV1 (L)</td>
              <td className={`py-3 text-right ${getRowColor(data.actual.fev1, data.predicted.fev1Pred, 'vol')}`}>
                {data.actual.fev1.toFixed(2)}
              </td>
              <td className="py-3 text-right text-slate-500 bg-slate-50/50">{data.predicted.fev1Pred.toFixed(2)}</td>
              <td className="py-3 text-right text-slate-600">{getPercent(data.actual.fev1, data.predicted.fev1Pred)}%</td>
              <td className="py-3 text-right text-slate-400 text-xs">-</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-slate-700">FEV1/FVC</td>
              <td className={`py-3 text-right ${getRowColor(data.actual.ratio, 1, 'ratio')}`}>
                {data.actual.ratio.toFixed(2)}
              </td>
              <td className="py-3 text-right text-slate-500 bg-slate-50/50">0.80</td>
              <td className="py-3 text-right text-slate-600">-</td>
              <td className="py-3 text-right text-slate-400 text-xs">{data.predicted.ratioLLN.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-slate-700">PEF (L/s)</td>
              <td className="py-3 text-right text-slate-700">{data.actual.pef.toFixed(1)}</td>
              <td className="py-3 text-right text-slate-500 bg-slate-50/50">{data.predicted.pefPred.toFixed(1)}</td>
              <td className="py-3 text-right text-slate-600">{getPercent(data.actual.pef, data.predicted.pefPred)}%</td>
              <td className="py-3 text-right text-slate-400 text-xs">-</td>
            </tr>
          </tbody>
        </table>

        {/* Interpretation / AI Section */}
        {showDiagnosis && (
          <div className="space-y-4">
             <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI Clinical Interpretation
                </h3>
                {!analysis.content && (
                  <button 
                    onClick={onAnalyze}
                    disabled={analysis.loading}
                    className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-full font-medium shadow-sm hover:bg-indigo-50 border border-indigo-200 transition-colors"
                  >
                    {analysis.loading ? 'Processing...' : 'Generate Report'}
                  </button>
                )}
              </div>

              {analysis.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 mb-2">
                  {analysis.error}
                </div>
              )}

              {analysis.content ? (
                <div className="text-sm text-slate-700 leading-relaxed space-y-2 animate-in fade-in">
                  {analysis.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-indigo-400 italic">
                  Review the data above or generate an AI analysis for detailed findings.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs text-slate-400 text-center">
        Reference: GLI-2012 Equations • National Asthma Council Australia Guidelines
      </div>
    </div>
  );
};

export default InfoPanel;
