export enum RhythmType {
  SINUS = 'SINUS',
  VFIB = 'VFIB',
  VTACH = 'VTACH', // Assumed Pulseless for Cardiac Arrest scenarios
  BRADYCARDIA = 'BRADYCARDIA',
  ASYSTOLE = 'ASYSTOLE',
  PEA = 'PEA' // Pulseless Electrical Activity
}

export interface WaveformPoint {
  x: number;
  y: number;
}

export enum ChargeState {
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  CHARGED = 'CHARGED',
  DISCHARGED = 'DISCHARGED'
}

export enum AppMode {
  FREE = 'FREE',
  TUTORIAL = 'TUTORIAL',
  EXAM = 'EXAM' // Infinite Random Cases
}

export enum TutorialStep {
  INTRO = 'INTRO',
  PHASE_1_VFIB = 'PHASE_1_VFIB', // Teaching Shockable
  PHASE_1_SHOCK = 'PHASE_1_SHOCK',
  PHASE_1_CPR = 'PHASE_1_CPR',
  PHASE_2_INTRO = 'PHASE_2_INTRO', // Teaching Non-Shockable
  PHASE_2_ASYSTOLE = 'PHASE_2_ASYSTOLE',
  PHASE_2_MEDS = 'PHASE_2_MEDS',
  COMPLETE = 'COMPLETE'
}

export interface ActionLog {
  timestamp: number;
  action: string;
  isCorrect: boolean;
  feedback: string;
}

export interface ScenarioData {
  rhythm: RhythmType;
  title: string;
  description: string;
  initialPrompt: string;
  isShockable: boolean;
}

export interface ExamState {
  caseNumber: number;
  totalScore: number;
  logs: ActionLog[];
  caseActive: boolean;
  roscProgress: number; // 0 to 100. 100 = ROSC (Win)
}

export interface PacerState {
  enabled: boolean;
  rate: number; // ppm
  current: number; // mA
}

export enum NIBPState {
  IDLE = 'IDLE',
  INFLATING = 'INFLATING',
  MEASURING = 'MEASURING',
  COMPLETE = 'COMPLETE'
}

export type LeadType = 'I' | 'II' | 'III' | 'PADS';