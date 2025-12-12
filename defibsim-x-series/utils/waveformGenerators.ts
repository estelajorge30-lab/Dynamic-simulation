import { RhythmType, PacerState } from '../types';

// --- SHARED STATE ---
let globalTime = 0;

// --- ECG GENERATION ---
// Pre-calculated high-fidelity P-QRS-T template for Sinus Rhythm
const generateNSRBeat = (widthScale = 1.0) => {
  const points: number[] = [];
  // Isoelectric
  for(let i=0; i<5; i++) points.push(Math.random() * 0.02 - 0.01);
  // P Wave
  for(let i=0; i<10; i++) points.push(Math.sin((i/10)*Math.PI) * 0.12);
  // PR Interval
  for(let i=0; i<6; i++) points.push(Math.random() * 0.02 - 0.01);
  // QRS Complex
  points.push(-0.05, -0.12); 
  points.push(0.3, 0.8, 1.0, 0.4, -0.1);
  points.push(-0.4, -0.2);
  // ST Segment
  for(let i=0; i<8; i++) points.push(Math.random() * 0.02 - 0.01);
  // T Wave
  for(let i=0; i<18; i++) points.push(Math.sin((i/18)*Math.PI) * 0.28);
  // Baseline
  for(let i=0; i<25; i++) points.push(Math.random() * 0.02 - 0.01);
  return points;
};

// Generate a Wide Complex beat for VTach
const generateVTachBeat = () => {
    const points: number[] = [];
    for(let i=0; i<12; i++) {
        points.push(Math.sin((i/12)*Math.PI) * 0.95 + (Math.random()*0.1));
    }
    for(let i=0; i<10; i++) {
        points.push(-Math.sin((i/10)*Math.PI) * 0.5);
    }
    for(let i=0; i<3; i++) points.push(Math.random() * 0.02 - 0.01);
    return points;
};

const nsrBuffer = generateNSRBeat();
const vtachBuffer = generateVTachBeat();

let ecgIndex = 0;

export const getNextECGValue = (rhythm: RhythmType, isCPR: boolean, pacerState?: PacerState, hypoxiaStress: number = 0): number => {
  globalTime += 0.01;
  
  // 1. BASELINE WANDER (Simulates breathing/movement + Hypoxic stress)
  // Hypoxia increases the amplitude of the wander
  const stressWander = hypoxiaStress * 0.3; 
  const wander = (Math.sin(globalTime * 0.5) * (0.15 + stressWander)) + (Math.sin(globalTime * 0.1) * 0.1);

  // 2. CPR ARTIFACT
  let artifact = 0;
  if (isCPR) {
      const compressionRate = 110 / 60; // Hz
      const compressionPhase = (globalTime * compressionRate * 2 * Math.PI);
      artifact = (Math.sin(compressionPhase) * 0.8) + ((Math.random() - 0.5) * 0.6);
  }

  // 3. PACER SPIKE
  let pacerSpike = 0;
  if (pacerState?.enabled) {
      if (ecgIndex > 18 && ecgIndex < 20 && (rhythm === RhythmType.SINUS || rhythm === RhythmType.BRADYCARDIA || rhythm === RhythmType.PEA)) {
          pacerSpike = 1.2; 
      }
  }

  // 4. BEAT-TO-BEAT VARIABILITY & STRESS
  // Hypoxia increases amplitude modulation (pulsus alternans-ish)
  const ampMod = 0.9 + (Math.sin(globalTime * 1.5) * (0.1 + (hypoxiaStress * 0.2))); 

  // 5. ECTOPIC NOISE (Hypoxia induced instability)
  let ectopic = 0;
  if (hypoxiaStress > 0.5 && Math.random() < 0.005) {
     ectopic = 0.4 * (Math.random() > 0.5 ? 1 : -1); // Occasional random spike
  }

  // RHYTHM GENERATION
  
  // A. VFIB: Chaos
  if (rhythm === RhythmType.VFIB) {
    return (
      Math.sin(globalTime * 17) * 0.35 + 
      Math.sin(globalTime * 53) * 0.15 + 
      Math.sin(globalTime * 9 + 2) * 0.3 + 
      (Math.random() - 0.5) * 0.2
    ) + artifact + wander;
  } 
  
  // B. ASYSTOLE: Flatline with minimal noise
  if (rhythm === RhythmType.ASYSTOLE) {
    return (
        Math.sin(globalTime * 2) * 0.02 + 
        (Math.random() * 0.03 - 0.015)
    ) + artifact + pacerSpike + (wander * 0.5); 
  }

  // C. VTACH: Wide complex, Fast
  if (rhythm === RhythmType.VTACH) {
      const val = vtachBuffer[Math.floor(ecgIndex)] || 0;
      ecgIndex += 0.6; 
      if (ecgIndex >= vtachBuffer.length) ecgIndex = 0;
      return (val * ampMod) + (Math.random() * 0.05) + artifact + wander + ectopic;
  }

  // D. SINUS, BRADYCARDIA, PEA
  const val = nsrBuffer[Math.floor(ecgIndex)] || 0;
  
  let speed = 1.6; // Normal Sinus (~72bpm)
  if (rhythm === RhythmType.BRADYCARDIA) speed = 0.8; 
  if (rhythm === RhythmType.PEA) speed = 1.2; 

  // Paced Rhythm logic
  if (pacerState?.enabled && pacerState.current > 30) {
      speed = (pacerState.rate / 60) * 1.3; 
  }

  // RESPIRATORY SINUS ARRHYTHMIA + HYPOXIC VARIABILITY
  // Hypoxia creates more erratic speed changes
  const rsa = Math.sin(globalTime * 0.2) * 0.05;
  const hypoxicJitter = hypoxiaStress > 0.3 ? (Math.random() * 0.1 * hypoxiaStress) : 0;
  
  speed *= (1 + rsa + hypoxicJitter);

  ecgIndex += speed; 
  if (ecgIndex >= nsrBuffer.length) {
    ecgIndex = 0;
  }
  
  return (val * ampMod) + (Math.random() * 0.01) + artifact + pacerSpike + wander + ectopic;
};


// --- PLETH (SpO2) GENERATION ---
let plethTime = 0;

export const getNextPlethValue = (hasPulse: boolean, rateMultiplier: number = 1.0): number => {
  if (!hasPulse) return 0;
  
  plethTime += 0.022 * rateMultiplier; 
  const t = plethTime % 1.0; 
  
  // Pulsus Paradoxus simulation (breathing affecting amplitude)
  const ampMod = 0.8 + (Math.sin(globalTime * 0.3) * 0.15);

  let val = 0;
  if (t < 0.2) {
      val = Math.sin((t / 0.2) * (Math.PI / 2));
  } else {
      const decayPhase = (t - 0.2) / 0.8; 
      const basicDecay = Math.cos(decayPhase * (Math.PI / 1.8)); 
      
      const notchCenter = 0.35;
      const notchWidth = 0.1;
      const notchAmp = 0.15;
      const notch = notchAmp * Math.exp(-Math.pow(decayPhase - notchCenter, 2) / (2 * notchWidth * notchWidth));
      
      val = (basicDecay * 0.9) + notch;
  }
  
  return val * ampMod; 
};


// --- CAPNOGRAPHY (EtCO2) GENERATION ---
let capnoTime = 0;

export const getNextCapnoValue = (hasPulse: boolean, rateMultiplier: number = 1.0, isVentilating: boolean): number => {
    // If ventilating manually, we show a waveform even if no pulse (passive recoil)
    if (!hasPulse && !isVentilating) return 0;

    capnoTime += 0.006 * rateMultiplier; 
    
    // Override for manual ventilation timing if needed, but for now we let it cycle
    // to simulate the washout.
    
    const t = capnoTime % 1.0;
    
    if (t < 0.1) return 0; // Baseline
    
    // Upstroke
    if (t < 0.2) {
        const phase = (t - 0.1) / 0.1;
        return -0.5 * Math.cos(phase * Math.PI) + 0.5;
    }
    
    // Plateau
    if (t < 0.6) {
        const phase = (t - 0.2) / 0.4;
        return 1.0 + (phase * 0.1); // Slight upward slope (alveolar plateau)
    }
    
    // Downstroke
    if (t < 0.7) {
        const phase = (t - 0.6) / 0.1;
        return 1.1 * (0.5 * Math.cos(phase * Math.PI) + 0.5); 
    }
    
    return 0; 
}

// --- AIRWAY PRESSURE (Paw) GENERATION ---
// Used when ventilating
let pawTime = 0;
let lastVentTrigger = 0;

export const triggerVentWave = () => {
    lastVentTrigger = globalTime;
    pawTime = 0;
};

export const getNextPawValue = (): number => {
    // Standard breath profile: Rise -> Peak -> Hold -> Decay -> PEEP
    const timeSinceTrigger = globalTime - lastVentTrigger;
    
    // Duration of a breath ~1.5s total?
    // Scale: globalTime is approx seconds if incremented correctly? 
    // Wait, globalTime increments 0.01 per frame. Frame is ~16ms?
    // So 1 sec = 1.0 / 0.01 * 0.016 approx? 
    // Let's assume globalTime is roughly seconds * 0.6
    
    // Simple shape based on modulo won't work for triggered breaths.
    // We use a decay function since trigger.
    
    if (timeSinceTrigger > 2.0) return 0.2; // Return to PEEP (approx 5cmH20 / 25cmH20 scale = 0.2)
    
    const t = timeSinceTrigger;
    
    // 0.0 to 0.3: Rise to PIP
    if (t < 0.3) {
        return 0.2 + (Math.sin((t/0.3) * (Math.PI/2)) * 0.8);
    }
    // 0.3 to 0.6: Hold/Plateau
    if (t < 0.6) {
        return 1.0 - ((t-0.3) * 0.1); 
    }
    // 0.6 to 1.5: Exhale decay
    if (t < 1.5) {
        const decay = (t - 0.6) / 0.9;
        return 0.2 + (0.7 * Math.exp(-decay * 5));
    }
    
    return 0.2; // PEEP
};