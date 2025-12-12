import { EKGConfig, WaveComponent, CaseScenario, LeadId, CaseCategory } from './types';

// Visual Themes
export const THEME_COLORS = {
  PAPER: {
    BACKGROUND: '#fff0f0',    // Very light pink typical of thermal paper
    LINE_FINE: '#ffc0c0',     // 1mm lines
    LINE_THICK: '#ff8080',    // 5mm lines
    SIGNAL: '#000000',        // Black ink
    TEXT: '#0f172a',          // Dark slate for text labels
    CURSOR: '#ef4444',        // Red drawing head
    GLOW_BLUR: 0              // No glow on paper
  },
  MONITOR: {
    BACKGROUND: '#000000',    // Deep black
    LINE_FINE: '#1a1a1a',     // Very subtle dark grey/green
    LINE_THICK: '#333333',    // Dark grey
    SIGNAL: '#39ff14',        // Bright Neon Green
    TEXT: '#39ff14',          // Green text
    CURSOR: '#ffffff',        // White drawing head
    GLOW_BLUR: 6              // Phosphor glow effect
  }
};

// Simulation Settings
export const SIMULATION_CONFIG = {
  ERASER_SIZE_MM: 20,       // Width of the clearing bar in mm
  NOISE_AMPLITUDE: 0.035,   // Amplitude of the realistic tremor/noise (in mV)
};

// Standard EKG Calibration
export const STANDARD_CONFIG: EKGConfig = {
  gridSpeed: 25,     // 25 mm/s
  voltageGain: 10,   // 10 mm/mV
  pixelsPerMm: 5,    // Scale factor for screen resolution
};

// --- ACADEMIC WAVE DEFINITIONS (Based on Gertsch, The ECG Manual) ---
// Note: Skew negative (-0.2) creates Physiological T-wave (Slow Rise, Fast Fall)

// LEAD II: Axis +60deg. 
const BASE_LEAD_II: WaveComponent[] = [
  { amplitude: 0.22, center: -0.16, width: 0.035, skew: 0 },   // P Wave (Upright, clear)
  { amplitude: -0.15, center: -0.045, width: 0.01, skew: 0 },  // Septal Q (Distinct)
  { amplitude: 1.6, center: 0, width: 0.018, skew: 0 },        // R Wave (Tallest)
  { amplitude: -0.3, center: 0.04, width: 0.015, skew: 0 },    // S Wave (Small but present)
  { amplitude: 0.45, center: 0.28, width: 0.07, skew: -0.3 },  // T Wave (Asymmetric +)
];

// LEAD I: Axis 0deg. 
const BASE_LEAD_I: WaveComponent[] = [
  { amplitude: 0.12, center: -0.16, width: 0.035, skew: 0 },  // P Wave (Positive)
  { amplitude: -0.1, center: -0.045, width: 0.01, skew: 0 },   // Septal Q
  { amplitude: 1.1, center: 0, width: 0.018, skew: 0 },        // R Wave (Good height)
  { amplitude: -0.2, center: 0.04, width: 0.015, skew: 0 },    // Basal S
  { amplitude: 0.30, center: 0.28, width: 0.07, skew: -0.3 },  // T Wave
];

// PRECORDIAL LEADS 

// V1: Right Septal. 
// Biphasic P (+/-). rS complex. T flat/inv.
const BASE_V1: WaveComponent[] = [
  // Biphasic P: RA (early/pos) + LA (late/neg)
  { amplitude: 0.08, center: -0.18, width: 0.02 }, 
  { amplitude: -0.06, center: -0.14, width: 0.02 },
  
  { amplitude: 0.35, center: -0.02, width: 0.015 }, // Small r 
  { amplitude: -1.4, center: 0.02, width: 0.022 },  // Deep S
  { amplitude: 0.1, center: 0.28, width: 0.07, skew: -0.2 }, // T Wave (Low positive)
];

// V2: Septal. Growing r, Deep S.
const BASE_V2: WaveComponent[] = [
  { amplitude: 0.12, center: -0.16, width: 0.04 }, 
  { amplitude: 0.6, center: -0.02, width: 0.015 }, // Growing r
  { amplitude: -1.8, center: 0.02, width: 0.022 }, // Deepest S
  { amplitude: 0.35, center: 0.28, width: 0.07, skew: -0.25 }, // T Wave
];

// V3: Transition. R ~ S.
const BASE_V3: WaveComponent[] = [
  { amplitude: 0.15, center: -0.16, width: 0.04 },
  { amplitude: 1.2, center: -0.01, width: 0.018 }, // R
  { amplitude: -1.1, center: 0.03, width: 0.02 },  // S
  { amplitude: 0.5, center: 0.28, width: 0.07, skew: -0.3 },
];

// V4: Anterior. R > S.
const BASE_V4: WaveComponent[] = [
  { amplitude: 0.15, center: -0.16, width: 0.04 },
  { amplitude: -0.05, center: -0.04, width: 0.01 }, // Tiny q
  { amplitude: 1.7, center: 0, width: 0.018 },      // Tall R
  { amplitude: -0.5, center: 0.04, width: 0.015 },  // Small s
  { amplitude: 0.55, center: 0.28, width: 0.07, skew: -0.3 },
];

// V5: Lateral. Max R.
const BASE_V5: WaveComponent[] = [
  { amplitude: 0.15, center: -0.16, width: 0.04 },
  { amplitude: -0.15, center: -0.045, width: 0.012 }, // Septal q
  { amplitude: 2.1, center: 0, width: 0.018 },       // Max R
  { amplitude: -0.2, center: 0.04, width: 0.015 },   // Tiny s
  { amplitude: 0.5, center: 0.28, width: 0.07, skew: -0.3 },
];

// V6: Lateral. R < V5.
const BASE_V6: WaveComponent[] = [
  { amplitude: 0.12, center: -0.16, width: 0.04 },
  { amplitude: -0.1, center: -0.045, width: 0.012 }, // Septal q
  { amplitude: 1.6, center: 0, width: 0.018 },       // Tall R (< V5)
  { amplitude: -0.1, center: 0.04, width: 0.015 },   // Basal s
  { amplitude: 0.4, center: 0.28, width: 0.07, skew: -0.3 },
];

export const BASE_LEADS: Record<string, WaveComponent[]> = {
  'I': BASE_LEAD_I,
  'II': BASE_LEAD_II,
  'V1': BASE_V1,
  'V2': BASE_V2,
  'V3': BASE_V3,
  'V4': BASE_V4,
  'V5': BASE_V5,
  'V6': BASE_V6,
};

// --- PROCEDURAL GENERATION HELPERS ---

// Random number between min and max
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Add slight variance to an array of wave components
const jitterWaves = (waves: WaveComponent[], ampJitter: number = 0.1, timeJitter: number = 0.005): WaveComponent[] => {
  return waves.map(w => ({
    ...w,
    amplitude: w.amplitude * randomRange(1 - ampJitter, 1 + ampJitter),
    center: w.center + randomRange(-timeJitter, timeJitter),
    width: w.width * randomRange(0.95, 1.05)
  }));
};

// --- TEMPLATES FOR GENERATION ---

export const CASE_TEMPLATES: Record<CaseCategory, Partial<CaseScenario>> = {
  'Normal': {
    name: 'Normal Sinus Rhythm',
    description: 'Physiologic rhythm. Biphasic P in V1. Normal Axis (+60). R-wave progression V1->V6.',
    keyFindings: ['Regular rate 60-90', 'Normal PR (0.12-0.20s)', 'qRs pattern in V5/V6'],
    overrides: {} 
  },
  'Arrhythmia': {
    name: 'Sinus Bradycardia',
    description: 'Normal morphology with rate < 60 bpm. Common in athletes.',
    keyFindings: ['Rate < 60 BPM', 'Normal PQ interval', 'Normal QRS'],
    overrides: {}
  },
  'Electrolyte': {
    name: 'Severe Hyperkalemia',
    description: 'Elevated serum potassium (>7.0 mmol/L). Danger of VF.',
    keyFindings: ['Tall, peaked ("tent-like") T waves', 'Flattened/absent P waves', 'Broad QRS'],
    overrides: {
      'II': [
        // Flattened P
        { amplitude: 0.05, center: -0.16, width: 0.04 },
        ...BASE_LEAD_II.slice(1, 4), 
        // Peaked T (Symmetric, Skew 0)
        { amplitude: 1.4, center: 0.24, width: 0.035, skew: 0 } 
      ],
      'V3': [
         ...BASE_V3.slice(0, 3),
         { amplitude: 2.0, center: 0.24, width: 0.035, skew: 0 } 
      ],
      'V4': [
         ...BASE_V4.slice(0, 3),
         { amplitude: 1.8, center: 0.24, width: 0.035, skew: 0 }
      ]
    }
  },
  'Ischemic': {
    name: 'Acute Inferior STEMI',
    description: 'Transmural injury of the inferior wall (RCA/LCx).',
    keyFindings: ['ST Elevation >1mm in II, III, aVF', 'Reciprocal ST depression in I, aVL'],
    overrides: {
      'II': [
        ...BASE_LEAD_II.slice(0, 3),
        // Monophasic ST Elevation merging into T (Tombstone)
        { amplitude: 0.8, center: 0.12, width: 0.10, skew: 0.2 }, 
        { amplitude: 0.4, center: 0.25, width: 0.06 }
      ],
      'I': [
        ...BASE_LEAD_I.slice(0, 3),
        // Reciprocal Depression
        { amplitude: -0.3, center: 0.12, width: 0.08 },
        { amplitude: -0.1, center: 0.25, width: 0.06 }
      ]
    }
  },
  'Structural': {
    name: 'Left Ventricular Hypertrophy (LVH)',
    description: 'Increased LV mass. Sokolow-Lyon Index positive.',
    keyFindings: ['S in V1 + R in V5/V6 > 35mm', 'ST strain pattern in lateral leads'],
    overrides: {
      'V1': [
        ...BASE_V1.slice(0, 3),
        { amplitude: -3.0, center: 0.02, width: 0.025 }, // Massive S
        { amplitude: 0.1, center: 0.28, width: 0.07 },
      ],
      'V5': [
         ...BASE_V5.slice(0, 2),
         { amplitude: 3.5, center: 0, width: 0.02 }, // Massive R
         { amplitude: -0.1, center: 0.04, width: 0.015 },
         // Strain pattern (ST depression + Inverted T)
         { amplitude: -0.4, center: 0.25, width: 0.08, skew: -0.1 }
      ],
      'V6': [
        ...BASE_V6.slice(0, 2),
        { amplitude: 3.0, center: 0, width: 0.02 }, 
        { amplitude: -0.15, center: 0.04, width: 0.015 },
        { amplitude: -0.3, center: 0.25, width: 0.08, skew: -0.1 }
      ]
    }
  }
};

// --- CASE GENERATOR FACTORY ---

export const generateRandomCase = (forcedCategory?: CaseCategory): CaseScenario => {
  const categories: CaseCategory[] = ['Normal', 'Arrhythmia', 'Electrolyte', 'Ischemic', 'Structural'];
  const category = forcedCategory || categories[Math.floor(Math.random() * categories.length)];
  const template = CASE_TEMPLATES[category];

  // 1. Randomize Heart Rate
  let heartRate = 60;
  if (category === 'Arrhythmia') heartRate = Math.floor(randomRange(35, 50)); 
  else if (category === 'Ischemic') heartRate = Math.floor(randomRange(80, 110)); 
  else heartRate = Math.floor(randomRange(55, 85));

  // 2. Clone and Jitter Overrides
  const overrides: Partial<Record<LeadId, WaveComponent[]>> = {};

  if (template.overrides) {
    Object.keys(template.overrides).forEach((key) => {
      const leadId = key as LeadId;
      const waves = template.overrides![leadId];
      if (waves) {
        overrides[leadId] = jitterWaves(waves);
      }
    });
  }

  // 3. Jitter Base Leads for natural variance
  if (!overrides['I']) overrides['I'] = jitterWaves(BASE_LEAD_I, 0.05, 0.001);
  if (!overrides['II']) overrides['II'] = jitterWaves(BASE_LEAD_II, 0.05, 0.001);
  if (!overrides['V1']) overrides['V1'] = jitterWaves(BASE_V1, 0.05, 0.001);

  const uniqueId = `${category}_${Math.floor(Math.random() * 10000)}`;

  return {
    id: uniqueId,
    name: template.name || 'Unknown',
    category: category,
    description: template.description || '',
    keyFindings: template.keyFindings || [],
    heartRate: heartRate,
    overrides: overrides,
    isGenerated: true
  };
};

export const CLINICAL_CASES: CaseScenario[] = [
  generateRandomCase('Normal'),
  generateRandomCase('Arrhythmia'),
  generateRandomCase('Electrolyte'),
  generateRandomCase('Ischemic'),
  generateRandomCase('Structural')
];