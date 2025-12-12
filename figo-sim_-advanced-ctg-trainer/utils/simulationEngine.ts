import { SimulatorParams, DataPoint } from '../types';

let timeStep = 0;

// Helper for randomness
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Sinusoidal wave generator
const generateSinusoidal = (t: number) => {
  // 3-5 cycles per minute (0.05 - 0.08 Hz)
  // Amplitude 5-15 bpm
  return Math.sin(t * 0.4) * 10; 
};

export const generateNextPoint = (
  currentTime: number, 
  params: SimulatorParams,
  lastPoint: DataPoint | null
): DataPoint => {
  timeStep += 0.5; // Simulate half-second increments for smoothness
  
  // 1. Calculate Contractions (TOCO)
  let toco = 10; // Resting tone
  let contractionActive = false;
  let contractionIntensity = 0; // 0-1 factor

  const contractionFrequency = params.contractions === 'tachysystole' ? 90 : 180; // Seconds between peaks
  const contractionDuration = 60; // Seconds
  
  const cycleTime = currentTime % contractionFrequency;
  
  if (params.contractions !== 'none') {
    if (cycleTime < contractionDuration) {
      contractionActive = true;
      // Bell curve approximation for contraction
      const x = (cycleTime - contractionDuration / 2) / (contractionDuration / 6);
      contractionIntensity = Math.exp(-0.5 * x * x);
      toco += contractionIntensity * (params.contractions === 'hypertonus' ? 90 : 60);
    }
  }

  // Add realistic noise to TOCO (Respiratory movement / Muscle tone)
  toco += (Math.random() - 0.5) * 2.5;

  // 2. Calculate FHR Baseline + Variability
  let currentFhr = params.baseline;

  // Variability Logic
  let variabilityAmp = 0;
  switch (params.variability) {
    case 'absent': variabilityAmp = 2; break;
    case 'minimal': variabilityAmp = 4; break;
    case 'normal': variabilityAmp = 15; break;
    case 'saltatory': variabilityAmp = 35; break;
    case 'sinusoidal': variabilityAmp = 0; break; // Handled separately
  }

  if (params.variability === 'sinusoidal') {
    currentFhr += generateSinusoidal(currentTime);
  } else {
    // Structural Variability (The "Bandwidth")
    const noise = (Math.random() - 0.5) * variabilityAmp;
    
    // Low pass filter to create organic wander (Structural)
    if (lastPoint) {
      // 0.4 / 0.6 mix gives it a bit more "nervousness" than 0.3/0.7
      currentFhr = lastPoint.fhr * 0.4 + (currentFhr + noise) * 0.6;
    } else {
      currentFhr += noise;
    }

    // High Frequency "Pen Noise" (The scratchiness of the signal)
    // This is added on top without smoothing to create high fidelity texture
    const jitter = (Math.random() - 0.5) * (params.noiseLevel || 1) * 3;
    currentFhr += jitter;
  }

  // 3. Decelerations Logic
  if (params.decelerations !== 'none' && contractionActive) {
    let decelDepth = 0;
    
    if (params.decelerations === 'early') {
      // Mirrors contraction exactly
      decelDepth = contractionIntensity * 25; 
      currentFhr -= decelDepth;
    } 
    else if (params.decelerations === 'late') {
      // Shifted by ~20-30 seconds
      const lag = 25;
      const delayedCycle = (currentTime - lag) % contractionFrequency;
      
      // Calculate depth based on delayed cycle intensity
      if (delayedCycle < contractionDuration && delayedCycle > 0) {
         const x = (delayedCycle - contractionDuration / 2) / (contractionDuration / 6);
         const intensity = Math.exp(-0.5 * x * x);
         decelDepth = intensity * 30;
         currentFhr -= decelDepth;
      }
    }
    else if (params.decelerations === 'variable') {
      // Sharp drop, "V" shape. 
      // Triggered during contraction, usually near peak but faster
      if (cycleTime > 15 && cycleTime < 45) {
        // Simple sharp drop simulation
        // In a real physics engine this would be slope-based, here we approximate with random depth
        const depthBase = 40;
        const depthVar = random(-10, 15);
        decelDepth = depthBase + depthVar;
        currentFhr -= decelDepth;
      }
    }
  }

  // Prolonged Deceleration (Periodic deep drop)
  if (params.decelerations === 'prolonged') {
    const longCycle = currentTime % 300; // every 5 mins
    if (longCycle > 20 && longCycle < 160) { // Lasts ~2+ mins
      // Gradual entry
      let intensity = 1;
      if (longCycle < 50) intensity = (longCycle - 20) / 30;
      else if (longCycle > 130) intensity = (160 - longCycle) / 30;
      
      currentFhr -= 70 * intensity;
    }
  }

  // Clamp values to realistic limits
  currentFhr = Math.max(50, Math.min(220, currentFhr));
  toco = Math.max(0, Math.min(100, toco));

  return {
    time: currentTime,
    fhr: currentFhr,
    toco: toco
  };
};