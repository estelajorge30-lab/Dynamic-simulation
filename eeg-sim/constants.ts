import { BrainState, ClinicalCategory, ClinicalContext, Electrode, SignalConfig } from './types';

// Based on Figure 1.8 and 1.9 of the PDF (10-20 System)
export const ELECTRODES: Electrode[] = [
  { id: 'Fp1', label: 'Fp1', x: 35, y: 15, region: 'Pre-Frontal (Left)', description: 'Attention, judgment. Prone to blink artifacts.' },
  { id: 'Fp2', label: 'Fp2', x: 65, y: 15, region: 'Pre-Frontal (Right)', description: 'Attention, judgment. Prone to blink artifacts.' },
  { id: 'F7', label: 'F7', x: 15, y: 30, region: 'Frontal (Temporal Left)', description: 'Language processing (near Broca\'s area).' },
  { id: 'F3', label: 'F3', x: 35, y: 30, region: 'Frontal (Left)', description: 'Motor planning, emotional regulation.' },
  { id: 'Fz', label: 'Fz', x: 50, y: 30, region: 'Frontal (Midline)', description: 'Executive function, working memory.' },
  { id: 'F4', label: 'F4', x: 65, y: 30, region: 'Frontal (Right)', description: 'Motor planning, emotional regulation.' },
  { id: 'F8', label: 'F8', x: 85, y: 30, region: 'Frontal (Temporal Right)', description: 'Spatial memory, emotion.' },
  
  { id: 'T3', label: 'T3', x: 10, y: 50, region: 'Temporal (Left)', description: 'Auditory processing, language comprehension.' },
  { id: 'C3', label: 'C3', x: 30, y: 50, region: 'Central (Left)', description: 'Sensorimotor integration (Right hand).' },
  { id: 'Cz', label: 'Cz', x: 50, y: 50, region: 'Central (Vertex)', description: 'Sensorimotor, reference point.' },
  { id: 'C4', label: 'C4', x: 70, y: 50, region: 'Central (Right)', description: 'Sensorimotor integration (Left hand).' },
  { id: 'T4', label: 'T4', x: 90, y: 50, region: 'Temporal (Right)', description: 'Auditory processing, non-verbal memory.' },

  { id: 'T5', label: 'T5', x: 15, y: 70, region: 'Posterior Temporal (Left)', description: 'Visual-verbal processing.' },
  { id: 'P3', label: 'P3', x: 35, y: 70, region: 'Parietal (Left)', description: 'Spatial orientation, calculation.' },
  { id: 'Pz', label: 'Pz', x: 50, y: 70, region: 'Parietal (Midline)', description: 'Integration of sensory information.' },
  { id: 'P4', label: 'P4', x: 65, y: 70, region: 'Parietal (Right)', description: 'Spatial processing.' },
  { id: 'T6', label: 'T6', x: 85, y: 70, region: 'Posterior Temporal (Right)', description: 'Visual-spatial processing.' },

  { id: 'O1', label: 'O1', x: 35, y: 90, region: 'Occipital (Left)', description: 'Primary visual cortex. Source of Alpha rhythm.' },
  { id: 'O2', label: 'O2', x: 65, y: 90, region: 'Occipital (Right)', description: 'Primary visual cortex. Source of Alpha rhythm.' },
];

// Configuration for signal generation based on brain state
export const STATE_CONFIGS: Record<BrainState, SignalConfig> = {
  [BrainState.AWAKE_EYES_OPEN]: {
    baseFreq: 22, // Beta (14-30Hz)
    amplitude: 10, // Very low amplitude (desynchronized)
    noiseFloor: 3,
    spikeProb: 0,
    blinkProb: 0.05
  },
  [BrainState.AWAKE_EYES_CLOSED]: {
    baseFreq: 10, // Alpha (8-13Hz)
    amplitude: 45, // Medium amplitude
    noiseFloor: 2,
    spikeProb: 0,
    blinkProb: 0.01
  },
  [BrainState.DROWSY]: {
    baseFreq: 6, // Theta (4-7Hz)
    amplitude: 35,
    noiseFloor: 4,
    spikeProb: 0,
    blinkProb: 0.01
  },
  [BrainState.DEEP_SLEEP]: {
    baseFreq: 1.5, // Delta (<4Hz)
    amplitude: 120, // High amplitude
    noiseFloor: 5,
    spikeProb: 0,
    blinkProb: 0
  },
  [BrainState.SEIZURE_GRAND_MAL]: {
    baseFreq: 12, 
    amplitude: 180, // Massive amplitude
    noiseFloor: 30, // Muscle artifact
    spikeProb: 0.3,
    blinkProb: 0
  },
  [BrainState.SEIZURE_PETIT_MAL]: {
    baseFreq: 3, // 3Hz
    secondaryFreq: 3,
    amplitude: 150, // High amplitude spike/wave
    noiseFloor: 5,
    spikeProb: 1.0, 
    blinkProb: 0
  },
  [BrainState.ARTIFACT_BLINK]: {
    baseFreq: 15,
    amplitude: 15, // Background is normal
    noiseFloor: 3,
    spikeProb: 0,
    blinkProb: 1.0 // Continuous triggers handled in logic
  }
};

export const CLINICAL_DATA: Record<BrainState, ClinicalContext> = {
  [BrainState.AWAKE_EYES_OPEN]: {
    category: ClinicalCategory.PHYSIOLOGICAL,
    diagnosisName: 'Normal Wakefulness (Beta)',
    explanation: 'Physiological normal state. EEG shows low voltage, desynchronized Beta activity (>14Hz), indicating active mental engagement or open eyes.',
    clues: ['Freq > 13Hz', 'Low Amplitude', 'No spikes']
  },
  [BrainState.AWAKE_EYES_CLOSED]: {
    category: ClinicalCategory.PHYSIOLOGICAL,
    diagnosisName: 'Relaxed Wakefulness (Alpha)',
    explanation: 'Physiological. Prominent Alpha rhythm (8-13Hz) in posterior regions (O1, O2) is the hallmark of a relaxed adult with eyes closed.',
    clues: ['Freq 8-13Hz', 'Posterior Dominance', 'Waxing/Waning Spindles']
  },
  [BrainState.DROWSY]: {
    category: ClinicalCategory.PHYSIOLOGICAL,
    diagnosisName: 'Drowsiness (Theta)',
    explanation: 'Can be physiological (in children or drowsiness) or pathological (focal lesions). Here, generalized Theta (4-7Hz) suggests sleep onset.',
    clues: ['Freq 4-7Hz', 'Background slowing', 'Alpha dropout']
  },
  [BrainState.DEEP_SLEEP]: {
    category: ClinicalCategory.PHYSIOLOGICAL,
    diagnosisName: 'Deep Sleep (Delta)',
    explanation: 'Physiological during NREM sleep. Characterized by high amplitude Delta waves (<4Hz). If seen in an alert adult, it would be pathological.',
    clues: ['Freq < 4Hz', 'High Amplitude', 'Irregular slow waves']
  },
  [BrainState.SEIZURE_GRAND_MAL]: {
    category: ClinicalCategory.PATHOLOGICAL,
    diagnosisName: 'Tonic-Clonic Seizure (Grand Mal)',
    explanation: 'Highly pathological. The trace shows chaotic high voltage polyspikes and muscle artifacts, consistent with the ictal phase of a generalized seizure.',
    clues: ['Chaotic high voltage', 'Fast spikes', 'Muscle contamination']
  },
  [BrainState.SEIZURE_PETIT_MAL]: {
    category: ClinicalCategory.PATHOLOGICAL,
    diagnosisName: 'Absence Seizure (Petit Mal)',
    explanation: 'Pathological. The classic "3Hz Spike and Wave" complex is diagnostic of Absence Seizures, often seen in childhood epilepsy.',
    clues: ['Strict 3Hz pattern', 'Spike followed by slow wave', 'Synchronized']
  },
  [BrainState.ARTIFACT_BLINK]: {
    category: ClinicalCategory.ARTIFACT,
    diagnosisName: 'Blink Artifact',
    explanation: 'Artifact, not brain activity. Large bell-shaped deflections in Frontal leads (Fp1, Fp2) correlate with eye movements (Eye dipole).',
    clues: ['Frontal Dominance', 'Bell-shaped wave', 'Normal background']
  }
};