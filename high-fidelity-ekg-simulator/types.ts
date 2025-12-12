export interface WaveComponent {
  amplitude: number; // mV
  center: number;    // seconds (offset from beat center)
  width: number;     // seconds (spread/variance)
  skew?: number;     // asymmetry factor (-1 to 1). Negative = slow rise/fast fall (Physiological T)
}

export interface EKGConfig {
  gridSpeed: number; // mm per second (standard 25)
  voltageGain: number; // mm per mV (standard 10)
  pixelsPerMm: number; // visual scaling
}

export type LeadId = 
  | 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF'
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface WaveOverride {
  leadId: LeadId;
  components: WaveComponent[];
}

export type CaseCategory = 'Normal' | 'Arrhythmia' | 'Structural' | 'Ischemic' | 'Electrolyte';

export interface CaseScenario {
  id: string;
  name: string; // The display name (hidden in quiz)
  category: CaseCategory; // The correct diagnosis
  description: string;
  keyFindings: string[];
  heartRate: number;
  overrides: Partial<Record<LeadId, WaveComponent[]>>; 
  isGenerated?: boolean; // Flag to identify procedural cases
}