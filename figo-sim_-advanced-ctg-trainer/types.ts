
export type SimulationMode = 'training' | 'quiz';

export type PaperSpeed = 1 | 2 | 3; // cm/min

export type VariabilityType = 'absent' | 'minimal' | 'normal' | 'saltatory' | 'sinusoidal';
export type DecelerationType = 'none' | 'early' | 'variable' | 'late' | 'prolonged';
export type ContractionPattern = 'none' | 'normal' | 'tachysystole' | 'hypertonus';

export interface SimulatorParams {
  baseline: number;
  variability: VariabilityType;
  decelerations: DecelerationType;
  contractions: ContractionPattern;
  noiseLevel: number;
}

export interface DataPoint {
  time: number; // Seconds
  fhr: number;
  toco: number;
}

export type Classification = 'Normal' | 'Suspicious' | 'Pathological';

export interface DetailedDiagnosis {
  baselineState: 'bradycardia' | 'normal' | 'tachycardia';
  variabilityState: VariabilityType;
  decelerationState: DecelerationType;
  classification: Classification;
}

export interface QuizScenario {
  id: string;
  name: string; // Internal name / Title (Hidden during quiz)
  description: string; // Clinical context (Visible)
  params: SimulatorParams;
  correctDiagnosis: DetailedDiagnosis;
  explanation: string; // Based on Table 1
  management: string; // Based on Table 1
}

export const FIGO_GUIDELINES = {
  baseline: {
    normal: "110-160 bpm",
    tachycardia: "> 160 bpm (>10 min)",
    bradycardia: "< 110 bpm (>10 min)"
  },
  variability: {
    normal: "5-25 bpm",
    reduced: "< 5 bpm (>50 min)",
    increased: "> 25 bpm (>30 min, saltatory)"
  },
  decelerations: {
    early: "Mirrors contraction, head compression, benign.",
    variable: "V-shaped, fast drop/rise, cord compression.",
    late: "U-shaped, starts after contraction onset, nadir after peak, hypoxia.",
    prolonged: "Drop > 15bpm for > 2 min but < 10 min."
  },
  classification: {
    normal: "No hypoxia/acidosis. Baseline 110-160, Var 5-25, No repetitive decels.",
    suspicious: "Low probability of hypoxia. Lacking at least one normal characteristic but not pathological.",
    pathological: "High probability of hypoxia. Baseline <100, Reduced Var >50min, Sinusoidal >30min, or Repetitive Late/Prolonged decels."
  }
};
