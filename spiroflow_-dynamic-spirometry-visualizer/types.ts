
export enum DiagnosisType {
  NORMAL = 'Normal',
  OBSTRUCTIVE = 'Obstruction',
  RESTRICTIVE = 'Restriction',
  MIXED = 'Mixed Defect',
}

export enum Severity {
  NORMAL = 'Normal',
  MILD = 'Mild',
  MODERATE = 'Moderate',
  SEVERE = 'Severe',
}

export interface Demographics {
  age: number;
  sex: 'Male' | 'Female';
  height: number; // cm
  ethnicity: string;
}

export interface ClinicalValues {
  fvc: number;
  fev1: number;
  ratio: number; // FEV1/FVC
  pef: number;
}

export interface ReferenceValues {
  fvcPred: number;
  fev1Pred: number;
  pefPred: number;
  ratioLLN: number; // Lower Limit of Normal for Ratio
  fvcLLN: number;
}

export interface DataPoint {
  volume: number; // x-axis
  flow: number;   // y-axis (Flow-Volume)
  time?: number;  // x-axis (Volume-Time)
}

export interface CaseData {
  id: string;
  demographics: Demographics;
  diagnosis: DiagnosisType;
  severity: Severity;
  actual: ClinicalValues;
  predicted: ReferenceValues;
  loops: {
    flowVolume: DataPoint[];
    volumeTime: DataPoint[];
    predictedFlowVolume: DataPoint[]; 
  };
  description: string;
}

export interface QuizState {
  active: boolean;
  currentCase: CaseData | null;
  selectedDiagnosis: DiagnosisType | null;
  selectedSeverity: Severity | null;
  isCorrect: boolean | null;
  feedback: string | null;
  streak: number;
}

export interface AnalysisState {
  loading: boolean;
  content: string | null;
  error: string | null;
}
