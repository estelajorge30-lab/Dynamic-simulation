export enum BrainState {
  AWAKE_EYES_OPEN = 'AWAKE_EYES_OPEN',
  AWAKE_EYES_CLOSED = 'AWAKE_EYES_CLOSED', // Alpha dominant
  DROWSY = 'DROWSY', // Theta
  DEEP_SLEEP = 'DEEP_SLEEP', // Delta
  SEIZURE_GRAND_MAL = 'SEIZURE_GRAND_MAL', // High amplitude, chaotic/spiky
  SEIZURE_PETIT_MAL = 'SEIZURE_PETIT_MAL', // 3Hz spike and wave
  ARTIFACT_BLINK = 'ARTIFACT_BLINK'
}

export enum ClinicalCategory {
  PHYSIOLOGICAL = 'Physiological',
  PATHOLOGICAL = 'Pathological',
  ARTIFACT = 'Artifact'
}

export interface Electrode {
  id: string;
  label: string;
  x: number; // Percentage 0-100 relative to head width
  y: number; // Percentage 0-100 relative to head height
  region: string; // Frontal, Parietal, etc.
  description: string;
}

export interface SimulatedPoint {
  value: number;
  isPattern: boolean; // True if this point is part of the characteristic pattern (to highlight)
}

export interface ChannelData {
  id: string;
  data: SimulatedPoint[];
}

export interface SignalConfig {
  baseFreq: number; // Hz
  secondaryFreq?: number;
  amplitude: number; // microvolts
  noiseFloor: number;
  spikeProb: number; // Probability of epileptic spike
  blinkProb: number; // Probability of eye blink artifact
}

export interface ClinicalContext {
  category: ClinicalCategory;
  diagnosisName: string;
  explanation: string;
  clues: string[];
}