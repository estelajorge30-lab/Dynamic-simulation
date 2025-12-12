
export enum ScenarioType {
  NORMAL = 'NORMAL',
  ACHALASIA_TYPE_I = 'ACHALASIA_TYPE_I',
  ACHALASIA_TYPE_II = 'ACHALASIA_TYPE_II',
  ACHALASIA_TYPE_III = 'ACHALASIA_TYPE_III'
}

export interface SimulationConfig {
  duration: number; // seconds
  sensorCount: number; // number of sensors vertically
  speed: number; // visual playback speed
}

export interface SimulationState {
  isPlaying: boolean;
  currentTime: number; // current time cursor in seconds
  hasSwallowed: boolean;
  swallowTime: number;
}

export interface QuizState {
  isActive: boolean;
  currentScenario: ScenarioType | null;
  score: number;
  totalQuestions: number;
  lastAnswerCorrect: boolean | null;
  showFeedback: boolean;
}
