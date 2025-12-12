import React from 'react';
import { X, FileText } from 'lucide-react';
import { FIGO_GUIDELINES } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-emerald-600" /> FIGO Consensus Guidelines Cheat Sheet
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Basic CTG Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2">Baseline</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  <li><strong>Normal:</strong> {FIGO_GUIDELINES.baseline.normal}</li>
                  <li><strong>Tachycardia:</strong> {FIGO_GUIDELINES.baseline.tachycardia} (Pyrexia, Epidural, Hypoxia)</li>
                  <li><strong>Bradycardia:</strong> {FIGO_GUIDELINES.baseline.bradycardia} (Hypothermia, Drugs, Arrhythmia)</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded border border-purple-100">
                <h4 className="font-bold text-purple-800 mb-2">Variability</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  <li><strong>Normal:</strong> {FIGO_GUIDELINES.variability.normal}</li>
                  <li><strong>Reduced:</strong> {FIGO_GUIDELINES.variability.reduced} (Sleep, Hypoxia, Drugs)</li>
                  <li><strong>Saltatory:</strong> {FIGO_GUIDELINES.variability.increased}</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Decelerations</h3>
            <div className="space-y-3">
              <div className="flex gap-4 items-start p-3 bg-slate-100 rounded">
                <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">EARLY</span>
                <p className="text-sm text-slate-700">{FIGO_GUIDELINES.decelerations.early}</p>
              </div>
              <div className="flex gap-4 items-start p-3 bg-slate-100 rounded">
                <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">VARIABLE</span>
                <p className="text-sm text-slate-700">{FIGO_GUIDELINES.decelerations.variable}</p>
              </div>
              <div className="flex gap-4 items-start p-3 bg-slate-100 rounded">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">LATE</span>
                <p className="text-sm text-slate-700">{FIGO_GUIDELINES.decelerations.late}</p>
              </div>
            </div>
          </section>

          <section>
             <h3 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Tracing Classification (Table 1)</h3>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-200 text-slate-800">
                     <th className="p-3 border">Class</th>
                     <th className="p-3 border">Criteria</th>
                     <th className="p-3 border">Interpretation</th>
                     <th className="p-3 border">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr className="bg-emerald-50">
                     <td className="p-3 border font-bold text-emerald-800">Normal</td>
                     <td className="p-3 border">Baseline 110-160, Var 5-25, No repetitive decels.</td>
                     <td className="p-3 border">No hypoxia/acidosis</td>
                     <td className="p-3 border">No intervention.</td>
                   </tr>
                   <tr className="bg-amber-50">
                     <td className="p-3 border font-bold text-amber-800">Suspicious</td>
                     <td className="p-3 border">Lacking at least one characteristic of normality, but not pathological.</td>
                     <td className="p-3 border">Low probability of hypoxia</td>
                     <td className="p-3 border">Correct reversible causes, close monitoring.</td>
                   </tr>
                   <tr className="bg-red-50">
                     <td className="p-3 border font-bold text-red-800">Pathological</td>
                     <td className="p-3 border">Baseline &lt;100, Reduced Var &gt;50min, Sinusoidal &gt;30min, or Repetitive Late/Prolonged decels.</td>
                     <td className="p-3 border">High probability of hypoxia</td>
                     <td className="p-3 border">Immediate action. Expedite delivery if not reversible.</td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </section>

          <div className="text-xs text-slate-500 italic mt-8">
            Based on: FIGO Consensus Guidelines on Intrapartum Fetal Monitoring. Safe Motherhood and Newborn Health Committee.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;