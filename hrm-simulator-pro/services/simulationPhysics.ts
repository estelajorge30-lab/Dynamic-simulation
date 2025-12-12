
import { ScenarioType } from '../types';

// Anatomical configuration (cm)
const PROBE_LENGTH = 36;
const UES_CENTER = 4;
const LES_CENTER = 31;
const TRANSITION_ZONE_CENTER = 14; 
const SWALLOW_DURATION = 15; 

// --- Physics Types ---

export interface SwallowVariability {
  amplitudeMod: number; 
  speedMod: number;     
  noiseOffset: number;  
  irregularity: number; 
  wobblePhase: number;  
}

interface PhysiologicalProfile {
  uesRelaxation: 'normal';
  lesRestingTone: number;
  lesRelaxation: 'normal' | 'absent';
  waveType: 'normal' | 'failed' | 'pan-pressurization' | 'spastic';
  contractileVigor: number;
  waveSpeed: number;
}

const SCENARIO_PROFILES: Record<ScenarioType, PhysiologicalProfile> = {
  [ScenarioType.NORMAL]: {
    uesRelaxation: 'normal',
    lesRestingTone: 25,
    lesRelaxation: 'normal',
    waveType: 'normal',
    contractileVigor: 1.0,
    waveSpeed: 1.0
  },
  [ScenarioType.ACHALASIA_TYPE_I]: {
    uesRelaxation: 'normal',
    lesRestingTone: 45,
    lesRelaxation: 'absent',
    waveType: 'failed',
    contractileVigor: 0.0,
    waveSpeed: 1.0
  },
  [ScenarioType.ACHALASIA_TYPE_II]: {
    uesRelaxation: 'normal',
    lesRestingTone: 45,
    lesRelaxation: 'absent',
    waveType: 'pan-pressurization',
    contractileVigor: 1.0,
    waveSpeed: 0
  },
  [ScenarioType.ACHALASIA_TYPE_III]: {
    uesRelaxation: 'normal',
    lesRestingTone: 50,
    lesRelaxation: 'absent',
    waveType: 'spastic',
    contractileVigor: 2.5,
    waveSpeed: 5.0
  }
};

export const getSwallowVariability = (timestamp: number | null): SwallowVariability => {
  if (!timestamp) return { amplitudeMod: 1, speedMod: 1, noiseOffset: 0, irregularity: 0.1, wobblePhase: 0 };
  
  const seed = (timestamp % 100000) / 1000;
  return {
    amplitudeMod: 0.9 + (Math.sin(seed) * 0.15), 
    speedMod: 0.9 + (Math.cos(seed) * 0.15),    
    noiseOffset: seed * 137.5,
    irregularity: 0.2,
    wobblePhase: Math.cos(seed * 17) * Math.PI * 2
  };
};

export const getSimulationMetrics = (type: ScenarioType, vars: SwallowVariability) => {
  const profile = SCENARIO_PROFILES[type];
  
  let dci = 0;
  if (type === ScenarioType.NORMAL) dci = 2200;
  if (type === ScenarioType.ACHALASIA_TYPE_I) dci = 0;
  if (type === ScenarioType.ACHALASIA_TYPE_III) dci = 4561;
  if (type === ScenarioType.ACHALASIA_TYPE_II) dci = 0;
  
  // Swallow-to-swallow variability for displayed metrics (avoid “twin swallows”)
  // Keep within ±10% to preserve diagnostic consistency.
  const metricsSeed = ((vars.noiseOffset * 1000) | 0) ^ 0x5A17;
  const dciJitter = 1 + (hash01(metricsSeed ^ 0xDC1) - 0.5) * 0.20; // ±10%
  dci = Math.round(dci * vars.amplitudeMod * (type === ScenarioType.ACHALASIA_TYPE_III ? dciJitter : 1));

  let dl: string = "N/A";
  if (type === ScenarioType.NORMAL) dl = (6.5 * vars.speedMod).toFixed(1) + ' s';
  if (type === ScenarioType.ACHALASIA_TYPE_III) {
    // ±0.2–0.3s variability but always premature (<4.5s)
    const dlBase = 3.0 * vars.speedMod;
    const dlJitter = (hash01(metricsSeed ^ 0xD17A1) - 0.5) * 0.5; // ±0.25s
    const dlSec = Math.max(2.5, Math.min(4.4, dlBase + dlJitter));
    dl = dlSec.toFixed(1) + ' s';
  }

  let irp = profile.lesRelaxation === 'normal' ? 8 : 28;
  if (type === ScenarioType.ACHALASIA_TYPE_I) irp = 21;
  if (type === ScenarioType.ACHALASIA_TYPE_II) irp = 35;
  if (type === ScenarioType.ACHALASIA_TYPE_III) irp = 41;
  irp += (Math.random() * 4) - 2;

  return { 
    dci: type === ScenarioType.ACHALASIA_TYPE_I || type === ScenarioType.ACHALASIA_TYPE_II ? "N/A" : dci, 
    dl, 
    irp: Math.round(irp) 
  };
};

// ═══════════════════════════════════════════════════════════════
// ORGANIC NOISE FUNCTIONS - Creates natural, diffuse patterns
// ═══════════════════════════════════════════════════════════════

// Seeded hash -> [0, 1). Non-periodic and cheap.
const hash01 = (n: number): number => {
  // Robert Jenkins’ 32 bit integer hash mix (adapted)
  let x = (n | 0) >>> 0;
  x += 0x6D2B79F5;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// 1D value-noise in [-1, 1] with smooth interpolation.
const valueNoise1D = (x: number, seed: number): number => {
  const xi = Math.floor(x);
  const xf = x - xi;
  const t = smoothstep(xf);
  const a = hash01((xi * 374761393) ^ seed);
  const b = hash01(((xi + 1) * 374761393) ^ seed);
  return (lerp(a, b, t) * 2 - 1);
};

// 2D-ish smooth noise in [-1,1] (built from two 1D noises).
const valueNoise2D = (x: number, y: number, seed: number): number => {
  // decorrelate axes a bit
  const nx = valueNoise1D(x + y * 0.37, seed ^ 0xA2C2A);
  const ny = valueNoise1D(y - x * 0.23, seed ^ 0xB3D11);
  return 0.6 * nx + 0.4 * ny;
};

// Multi-layer noise for organic texture
const organicNoise = (depth: number, time: number, offset: number, scale: number = 1): number => {
  // Multiple sine waves at different frequencies create natural-looking noise
  const n1 = Math.sin(depth * 0.5 + time * 0.3 + offset) * 0.4;
  const n2 = Math.sin(depth * 1.2 + time * 0.7 + offset * 1.3) * 0.25;
  const n3 = Math.sin(depth * 2.5 + time * 1.1 + offset * 0.7) * 0.15;
  const n4 = Math.sin(depth * 0.3 - time * 0.5 + offset * 2.1) * 0.35;
  const n5 = Math.cos(depth * 0.8 + time * 0.4 - offset) * 0.3;
  
  return (n1 + n2 + n3 + n4 + n5) * scale;
};

// Smooth falloff function (no hard edges)
const smoothFalloff = (value: number, edge: number, softness: number): number => {
  if (value >= edge) return 1;
  if (value <= edge - softness) return 0;
  const t = (value - (edge - softness)) / softness;
  // Smooth step (cubic interpolation)
  return t * t * (3 - 2 * t);
};

// Gaussian with organic variation
const organicGaussian = (x: number, center: number, width: number, amp: number, depth: number, time: number, offset: number): number => {
  // Add wobble to the center position
  const wobble = Math.sin(time * 0.5 + offset) * 0.3;
  const adjustedCenter = center + wobble;
  
  // Add variation to width
  const widthVar = width * (1 + organicNoise(depth, time, offset, 0.15));
  
  const base = amp * Math.exp(-0.5 * Math.pow((x - adjustedCenter) / widthVar, 2));
  
  // Add texture
  const texture = organicNoise(x, time, offset + 50, 0.1) * amp * 0.2;
  
  return Math.max(0, base + texture);
};

// Plain Gaussian (stable, non-organic) - useful for muscular sphincters like LES
const gaussian = (x: number, center: number, width: number, amp: number): number => {
  return amp * Math.exp(-0.5 * Math.pow((x - center) / width, 2));
};

// Background tissue texture (always present, creates the "heat map" look)
const tissueTexture = (depth: number, time: number, offset: number, intensity: number = 1): number => {
  // Keep a tiny physiologic rhythm, but avoid obvious periodic tiling by mixing with seeded value-noise.
  const seed = ((offset * 1000) | 0) ^ 0x9E3779B9;

  // Low-amplitude catheter “thermal” noise (non-periodic)
  const thermal = valueNoise2D(depth * 0.55, time * 0.75, seed) * 1.1;
  const thermal2 = valueNoise2D(depth * 1.35, time * 1.9, seed ^ 0x51ED) * 0.7;

  // Mild breathing / motion (kept subtle)
  const breathing = Math.sin(time * 0.6 + offset * 0.03) * 1.1;

  // Mild vascular (subtle)
  const vascular = Math.sin(time * 2.6 + depth * 0.14 + offset * 0.02) * 0.8;

  // Grain (mostly noise-driven so it doesn’t look algorithmic)
  const grain = valueNoise2D(depth * 2.2, time * 0.25, seed ^ 0xC0FFEE) * 0.9;

  const baseline = 4.0;
  const total = baseline + breathing + vascular + thermal + thermal2 + grain;
  return Math.max(0, total * intensity);
};

export const calculatePressure = (
  type: ScenarioType,
  depth: number,
  time: number,
  vars: SwallowVariability
): number => {
  const profile = SCENARIO_PROFILES[type];
  const organicTime = time;
  const isSwallowing = organicTime >= 0 && organicTime <= SWALLOW_DURATION;
  const offset = vars.noiseOffset;
  
  // ═══════════════════════════════════════════════════════════════
  // BASE TISSUE TEXTURE (creates heat map background)
  // ═══════════════════════════════════════════════════════════════
  const textureIntensity = profile.waveType === 'failed' ? 0.4 : 1.0;
  let pressure = tissueTexture(depth, time, offset, textureIntensity);

  // ═══════════════════════════════════════════════════════════════
  // UES (Upper Sphincter) - Organic shape
  // ═══════════════════════════════════════════════════════════════
  let uesP = organicGaussian(depth, UES_CENTER, 1.2, 65, depth, time, offset);
  
  if (isSwallowing) {
    // Relaxation with soft transitions
    const relaxStart = 0.1;
    const relaxEnd = 1.4;
    if (organicTime > relaxStart && organicTime < relaxEnd) {
      const relaxProgress = smoothFalloff(organicTime - relaxStart, relaxEnd - relaxStart, 0.4);
      uesP *= (1 - relaxProgress * 0.92);
    }
    // Recovery with organic timing
    if (organicTime > 1.4 && organicTime < 3.0) {
      const recoveryEnv = smoothFalloff(organicTime - 1.4, 0.6, 0.4) * smoothFalloff(3.0 - organicTime, 0.8, 0.6);
      uesP += organicGaussian(depth, UES_CENTER, 1.0, 45 * recoveryEnv, depth, time, offset);
    }
  }
  pressure += uesP;

  // ═══════════════════════════════════════════════════════════════
  // LES (Lower Sphincter) - Muscular signature (stable + less diffuse)
  // Goal: looks like a distinct muscular ring so learners don't confuse it with distal pressurization.
  // ═══════════════════════════════════════════════════════════════
  const lesTone = profile.lesRestingTone;
  // Stable narrow core + faint halo (minimal wobble/noise)
  const lesCore = gaussian(depth, LES_CENTER, 1.05, (lesTone + 18) * vars.amplitudeMod); // +18 adds muscular “ring”
  const lesHalo = gaussian(depth, LES_CENTER, 2.1, (lesTone * 0.22) * vars.amplitudeMod);
  // tiny physiologic shimmer (kept very small to preserve a stable contour)
  const lesShimmer = organicNoise(depth, time, offset + 401, 0.45);
  let lesP = Math.max(0, lesCore + lesHalo + lesShimmer);
  
  if (isSwallowing && organicTime > 2.0) {
    if (profile.lesRelaxation === 'normal') {
      // Soft relaxation curve
      const relaxProgress = smoothFalloff(organicTime - 2.5, 2.0, 1.5);
      const recoveryProgress = organicTime > 9 ? smoothFalloff(organicTime - 9, 4, 3) : 0;
      // Relax the muscular ring strongly so it's clearly different from pressurization
      const relaxed = lesP * (1 - relaxProgress * 0.94);
      const recovered = gaussian(depth, LES_CENTER, 1.1, (lesTone + 18) * Math.min(1, recoveryProgress) * 0.85);
      lesP = Math.max(0, relaxed + recovered);
    } else {
      // Achalasia: stays high with organic variation
      // Keep ring stable; add only a mild time-dependent bolus load (non-diffuse)
      const bolusLoad = gaussian(organicTime, 6.2, 2.6, 8) * (1 + organicNoise(depth, time, offset + 77, 0.06));
      lesP += bolusLoad;
    }
  }
  pressure += lesP;

  // ═══════════════════════════════════════════════════════════════
  // ESOPHAGEAL BODY
  // ═══════════════════════════════════════════════════════════════
  const proximal = UES_CENTER + 2;
  const distal = LES_CENTER - 2;
  const bodyLength = distal - proximal;

  if (depth > proximal - 1 && depth < distal + 1) {
    // Soft edges at boundaries
    const bodyFade = smoothFalloff(depth - proximal, 1.5, 2) * smoothFalloff(distal - depth, 1.5, 2);
    
    // ─────────────────────────────────────────────────────────────
    // TYPE I: SILENT BODY (diffuse blue with minimal activity)
    // ─────────────────────────────────────────────────────────────
    if (profile.waveType === 'failed') {
      // Very quiet - just tissue noise, dampened
      const quietNoise = organicNoise(depth, time, offset, 2) + 3;
      pressure = tissueTexture(depth, time, offset, 0.3) + quietNoise * bodyFade * 0.3;
      
      // Occasional very faint activity
      if (isSwallowing && organicTime > 3 && organicTime < 8) {
        const faintActivity = organicNoise(depth, organicTime, offset, 3);
        pressure += Math.max(0, faintActivity) * bodyFade * 0.2;
      }
    }
    
    // ─────────────────────────────────────────────────────────────
    // TYPE II: PAN-PRESSURIZATION (diffuse vertical columns)
    // ─────────────────────────────────────────────────────────────
    else if (profile.waveType === 'pan-pressurization') {
      if (isSwallowing) {
        // Reference-like Type II:
        // - Several tall vertical columns (yellow/green) = pan-esophageal pressurization pulses
        // - Plus a distal horizontal red band near EGJ during the pressurization window

        const pulses = [
          { center: 3.1, sigma: 0.22, amp: 60 },
          { center: 4.3, sigma: 0.25, amp: 70 },
          { center: 5.6, sigma: 0.22, amp: 65 },
          { center: 6.9, sigma: 0.26, amp: 72 },
          { center: 8.2, sigma: 0.24, amp: 68 },
        ];

        // Vertical columns (mostly uniform along depth)
        for (const p of pulses) {
          const t = organicTime - p.center;
          const env = Math.exp(-0.5 * Math.pow(t / p.sigma, 2));
          if (env > 0.03) {
            const depthVar = 1 + organicNoise(depth, organicTime, offset + p.center * 17, 0.10);
            const timeVar = 1 + organicNoise(depth, organicTime * 1.7, offset + 33, 0.08);
            pressure += (p.amp * env * depthVar * timeVar * vars.amplitudeMod) * bodyFade;
          }
        }

        // Distal horizontal red band (compartmentalization) during pressurization
        // Appears near the distal esophagus/EGJ as in the reference.
        if (organicTime > 2.8 && organicTime < 9.5) {
          const window = smoothFalloff(organicTime - 2.8, 1.2, 0.9) * smoothFalloff(9.5 - organicTime, 1.5, 1.2);
          // Distal band centered slightly above LES with soft width
          const distalCenter = distal - 0.8;
          const band = organicGaussian(depth, distalCenter, 1.4, 95 * window, depth, organicTime, offset + 77);
          // Add slight undulation to mimic real traces
          const ripple = (organicNoise(depth, organicTime, offset + 91, 10) + 10) * window;
          pressure += (band + ripple) * bodyFade;
        }

        // Light background pressurization haze (keep subtle so columns stay visible)
        if (organicTime > 2.7 && organicTime < 9.8) {
          const haze = smoothFalloff(organicTime - 2.7, 1.5, 1.2) * smoothFalloff(9.8 - organicTime, 1.8, 1.4);
          pressure += (12 + organicNoise(depth, organicTime, offset, 6)) * haze * bodyFade * 0.25;
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────────
    // TYPE III: SPASTIC - Achalasia Type III (Chicago v4.0)
    // Core goals:
    // - Premature distal contraction (DL < 4.5s)
    // - Subtle intra-wave variability (speed ±5–10%), non-periodic contour irregularity
    // - No vertical pan-esophageal pressurization bands
    // ─────────────────────────────────────────────────────────────
    else if (profile.waveType === 'spastic') {
      if (isSwallowing) {
        // Swallow-to-swallow variability (seeded by swallow timestamp via vars.noiseOffset)
        const seed = ((offset * 1000) | 0) ^ 0x3141592;
        const onsetJitter = (hash01(seed ^ 0xA11CE) - 0.5) * 0.6; // ±0.3s
        const ampJitter = 1 + (hash01(seed ^ 0xBADC0DE) - 0.5) * 0.26; // ±13%

        const waveStart = 2.05 + onsetJitter;

        // Normalize depth position (0 proximal → 1 distal)
        const depthNorm = Math.max(0, Math.min(1, (depth - proximal) / bodyLength));

        // Micro-fluctuations in propagation speed (±5–10%) without periodicity:
        // We perturb the effective "slope" along depth using value-noise.
        const speedNoise = valueNoise1D(depthNorm * 9.0 + seed * 0.00001, seed ^ 0x51ED);
        const speedFactor = 1 + speedNoise * 0.08; // ±8%

        // Curved diagonal arrival with small irregularity (non-repeating).
        const curveBase = 0.42 * depthNorm * depthNorm;
        const contourIrreg = valueNoise1D(depthNorm * 13.0 + 17.3, seed ^ 0xC0FFEE) * 0.10; // seconds
        // Make proximal onset slightly less “clean” (5–10% more irregularity) without changing diagnosis.
        // Tiny, non-periodic jitter that fades distally.
        const proximalJitter = valueNoise2D(depthNorm * 4.0, organicTime * 0.9, seed ^ 0xFACE) * 0.10; // seconds
        const proximalWeight = (1 - depthNorm) * 0.8; // strongest proximally
        const arrival = waveStart + (depthNorm * (1.25 / speedFactor)) + curveBase + contourIrreg + (proximalJitter * proximalWeight);

        // Non-periodic trailing-edge indentations (avoid sinusoidal scallops).
        const indent = Math.max(0, valueNoise1D(depthNorm * 7.5 + 3.1, seed ^ 0xD1E) ) * 0.85; // seconds

        // Distal segments stay contracted longer -> wedge
        const sustainBase = 0.95 + depthNorm * 3.0; // seconds
        const sustain = Math.max(0.8, sustainBase - indent); // inward convex “bites”
        const releaseSoft = 1.0 + depthNorm * 0.6;

        // Soft envelope from arrival to arrival+sustain (make edges MORE diffuse)
        const t = organicTime;
        // Larger softness => less defined borders
        // Slightly blur the leading edge proximally (diffuse onset)
        const onSoft = 2.0 + (1 - depthNorm) * 0.35; // +0–0.35s proximally (~5–10% feel)
        const on = smoothFalloff(t - arrival, 2.2, onSoft);
        const off = smoothFalloff((arrival + sustain) - t, 2.2, Math.max(2.0, releaseSoft));
        let env = on * off;
        if (env > 0.001) {
          // Add subtle internal variability so it looks like heat, not a polygon
          const intra = valueNoise2D(depth * 0.35, t * 1.05, seed ^ 0x777) * 0.08;
          env *= 1 + intra;
          env = Math.max(0, Math.min(1.1, env));

          // Interior pressure: red range, swallow-variable amplitude
          const interiorBase = (140 + depthNorm * 18) * ampJitter; // ~140–158 ±13%
          const interiorNoise = valueNoise2D(depth * 0.9, t * 0.7, seed ^ 0x1234) * 10;
          const interior = Math.max(120, Math.min(185, interiorBase + interiorNoise));

          // Thin leading edge ridge (red/orange line)
          const ridgeWidth = 0.16 + depthNorm * 0.05;
          const ridge = Math.exp(-0.5 * Math.pow((t - arrival) / ridgeWidth, 2));
          const ridgeAmp = 55 + depthNorm * 20;

          // Add some patchiness inside (clouds) so it matches the reference texture
          const cloudA = organicGaussian(depth, 18 + valueNoise2D(depth * 0.2, t * 0.3, seed ^ 0xAAA) * 2.0, 4.9, 20 * env, depth, t, offset + 40);
          const cloudB = organicGaussian(depth, 25 + valueNoise2D(depth * 0.23, t * 0.35, seed ^ 0xBBB) * 2.2, 5.8, 26 * env, depth, t, offset + 90);

          // Total spastic pressure: interior + ridge emphasis (but still smooth)
          const total = (interior * env) + (ridgeAmp * ridge) + cloudA + cloudB;

          // Keep it in a realistic strong range (avoid blowing into pink/white)
          const capped = Math.max(0, Math.min(210, total));
          // IMPORTANT: cap AFTER vigor too, to prevent saturation into white/pink
          const withVigor = capped * profile.contractileVigor;
          const finalP = Math.min(230, withVigor); // keep in strong red range (avoid white)
          pressure += finalP * bodyFade;
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────────
    // NORMAL: Diagonal peristaltic wave (organic)
    // ─────────────────────────────────────────────────────────────
    else if (profile.waveType === 'normal' && isSwallowing) {
      const waveSpeed = 3.2 * profile.waveSpeed * vars.speedMod;
      const waveStart = 2.0;
      
      const distance = depth - proximal;
      const waveCenterTime = waveStart + (distance / waveSpeed);
      
      // Add organic wobble to wave timing
      const timeWobble = organicNoise(depth, 0, offset, 0.15);
      const tDiff = organicTime - waveCenterTime - timeWobble;
      
      // Soft wave envelope
      const waveWidth = 0.6 + organicNoise(depth, organicTime, offset, 0.1);
      const waveEnv = Math.exp(-0.5 * Math.pow(tDiff / waveWidth, 2));
      
      if (waveEnv > 0.02) {
        let amp = 80 + organicNoise(depth, organicTime, offset, 10);
        
        // Transition Zone dip with soft edges
        const tzDist = Math.abs(depth - TRANSITION_ZONE_CENTER);
        if (tzDist < 4) {
          const tzFactor = smoothFalloff(tzDist, 4, 3);
          amp *= (0.35 + tzFactor * 0.65);
        }
        
        amp *= profile.contractileVigor * vars.amplitudeMod;
        
        // Add trailing tail
        let waveShape = waveEnv;
        if (tDiff > 0) {
          waveShape *= Math.exp(-tDiff * 0.6);
        }
        
        pressure += amp * waveShape * bodyFade;
      }
    }
  }

  // Final organic texture overlay
  pressure += organicNoise(depth, time, offset + 200, 1.5);

  return Math.max(0, pressure);
};
