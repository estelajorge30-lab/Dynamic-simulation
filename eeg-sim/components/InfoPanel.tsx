import React from 'react';
import { BrainState, Electrode } from '../types';

interface InfoPanelProps {
  brainState: BrainState;
  selectedElectrode: Electrode | undefined;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ brainState, selectedElectrode }) => {
  const getStateInfo = () => {
    switch (brainState) {
      case BrainState.AWAKE_EYES_OPEN:
        return {
          title: 'Wakefulness (Beta Rhythm)',
          content: 'Dominated by Beta waves (14-26 Hz). Associated with active thinking, attention, and focus on the outside world. Low amplitude, desynchronized activity normally found in adults.'
        };
      case BrainState.AWAKE_EYES_CLOSED:
        return {
          title: 'Relaxed Wakefulness (Alpha Rhythm)',
          content: 'Alpha waves (8-13 Hz) appear over posterior regions (occipital). Discovered by Hans Berger (1929). Indicates relaxed awareness. Blocked by opening eyes (Alpha Block).'
        };
      case BrainState.DROWSY:
        return {
          title: 'Drowsiness (Theta Rhythm)',
          content: 'Theta waves (4-7.5 Hz). Associated with access to unconscious material, creative inspiration, and deep meditation. As consciousness slides towards sleep.'
        };
      case BrainState.DEEP_SLEEP:
        return {
          title: 'Deep Sleep (Delta Rhythm)',
          content: 'Delta waves (0.5-4 Hz). High amplitude slow waves. Primarily associated with deep sleep (NREM). Neck muscle artifacts can sometimes mimic Delta waves.'
        };
      case BrainState.SEIZURE_PETIT_MAL:
        return {
          title: 'Absence Seizure (Petit Mal)',
          content: 'Characterized by a synchronous 3 Hz spike and wave complex. Lasts approx 70ms. Usually has maximum amplitude around the frontal midline.'
        };
      case BrainState.SEIZURE_GRAND_MAL:
        return {
          title: 'Tonic-Clonic Seizure (Grand Mal)',
          content: 'Generalized seizure with rhythmic but spiky patterns (6-12 Hz) or chaotic high voltage discharges. Often followed by post-ictal slowing.'
        };
      case BrainState.ARTIFACT_BLINK:
        return {
          title: 'Artifact: Blink',
          content: 'High amplitude slow waves seen primarily in Frontal electrodes (Fp1, Fp2). Caused by the movement of the eyeball potential difference (cornea positive, retina negative).'
        };
      default:
        return { title: '', content: '' };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 h-full flex flex-col gap-6 shadow-xl">
      <div>
        <h2 className="text-xl font-bold text-cyan-400 mb-2 border-b border-slate-700 pb-2">
          Current Rhythm
        </h2>
        <h3 className="text-lg font-semibold text-white mb-1">{stateInfo.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          {stateInfo.content}
        </p>
      </div>

      <div className="flex-grow">
        <h2 className="text-xl font-bold text-cyan-400 mb-2 border-b border-slate-700 pb-2">
          Electrode Detail
        </h2>
        {selectedElectrode ? (
          <div className="animate-fade-in">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-mono text-white">{selectedElectrode.label}</span>
              <span className="text-xs text-cyan-600 uppercase font-bold tracking-wider">{selectedElectrode.region}</span>
            </div>
            <p className="text-slate-300 text-sm">{selectedElectrode.description}</p>
            <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
               <span className="text-xs text-slate-500 block mb-1">COORDINATES (10-20)</span>
               <div className="flex justify-between text-xs font-mono">
                 <span>Left/Right: {selectedElectrode.x}%</span>
                 <span>Ant/Post: {selectedElectrode.y}%</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-600 italic text-sm text-center mt-10">
            Select an electrode on the map to see details.
          </div>
        )}
      </div>

      <div className="text-xs text-slate-600 border-t border-slate-800 pt-4">
        <p>Ref: EEG Signal Processing (Sanei & Chambers, 2007)</p>
        <p className="mt-1">Hans Berger (1873-1941) - Father of EEG</p>
      </div>
    </div>
  );
};

export default InfoPanel;