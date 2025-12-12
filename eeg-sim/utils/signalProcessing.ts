import { BrainState, SimulatedPoint } from '../types';
import { STATE_CONFIGS } from '../constants';

const SAMPLE_RATE = 200;

export const generateDataPoint = (
  timeCounter: number,
  state: BrainState,
  channelId: string,
  lastValue: number
): SimulatedPoint => {
  const config = STATE_CONFIGS[state];
  const t = timeCounter / SAMPLE_RATE;
  let signal = 0;
  let isPattern = false;

  // --- 1. Realistic Background Noise (1/f approximation + White Noise) ---
  // EEG is never perfectly clean. We mix slow drift with high frequency jitter.
  const drift = Math.sin(2 * Math.PI * 0.5 * t + channelId.charCodeAt(0)) * 3; 
  const jitter = (Math.random() - 0.5) * config.noiseFloor;
  signal += drift + jitter;

  // --- 2. State-Specific Wave Synthesis ---

  if (state === BrainState.AWAKE_EYES_OPEN) {
    // BETA: Low amplitude, Desynchronized, 14-30Hz
    // We mix two high frequencies to create a non-sinusoidal "busy" look
    const beta1 = Math.sin(2 * Math.PI * config.baseFreq * t);
    const beta2 = Math.sin(2 * Math.PI * (config.baseFreq + 7) * t + 1); // Offset freq
    
    signal += (beta1 + beta2 * 0.5) * config.amplitude;
    
    // Muscle artifact (EMG) is common in awake state - fast low amplitude noise
    signal += (Math.random() - 0.5) * 4;
  }
  
  else if (state === BrainState.AWAKE_EYES_CLOSED) {
    // ALPHA: 8-13Hz, Posterior Dominant, Waxing and Waning (Spindles)
    let localAmp = config.amplitude;

    // Posterior Dominance: O1/O2/P3/P4 are strongest
    const isPosterior = ['O1', 'O2', 'P3', 'P4', 'Pz', 'T5', 'T6'].includes(channelId);
    const isFrontal = ['Fp1', 'Fp2', 'F7', 'F8', 'F3', 'F4', 'Fz'].includes(channelId);

    if (isPosterior) {
      localAmp *= 1.4;
      isPattern = true; // Highlight alpha source
    } else if (isFrontal) {
      localAmp *= 0.3; // Much weaker anteriorly
    }

    // Spindle Effect: Amplitude modulation (Envelope)
    // Beat frequency around 0.2Hz (5 seconds cycle)
    const envelope = 0.7 + 0.4 * Math.sin(2 * Math.PI * 0.2 * t);
    
    // Frequency Jitter: Alpha isn't perfectly stable 10Hz, it wavers slightly
    const freqWobble = Math.sin(t) * 0.5; 

    signal += Math.sin(2 * Math.PI * (config.baseFreq + freqWobble) * t) * localAmp * envelope;
  }
  
  else if (state === BrainState.DROWSY) {
    // THETA: 4-7Hz. Slowing of background.
    // Basic Theta wave
    signal += Math.sin(2 * Math.PI * config.baseFreq * t) * config.amplitude;
    
    // Occasional Alpha Dropout: Bursts of alpha that disappear
    const dropoutGate = Math.sin(2 * Math.PI * 0.1 * t); // 10s cycle
    if (dropoutGate > 0.7) {
       signal += Math.sin(2 * Math.PI * 10 * t) * 15; // Alpha burst
    }
  }
  
  else if (state === BrainState.DEEP_SLEEP) {
    // DELTA: <4Hz, High amplitude, Irregular
    // Mix of Delta frequencies to avoid perfect sine wave
    const delta1 = Math.sin(2 * Math.PI * config.baseFreq * t);
    const delta2 = Math.sin(2 * Math.PI * (config.baseFreq + 0.8) * t + 2); // Interference
    
    signal += (delta1 + delta2 * 0.6) * config.amplitude;

    // Optional: Sleep Spindles (14Hz) superimposed (Simulated lightly)
    if (Math.sin(2 * Math.PI * 0.2 * t) > 0.8) {
       signal += Math.sin(2 * Math.PI * 14 * t) * 10;
    }
  }
  
  else if (state === BrainState.SEIZURE_PETIT_MAL) {
    // 3Hz Spike and Wave Complex
    // Morphological simulation: Sharp spike -> Slow wave
    const cycle = (t * 3) % 1; // 0 to 1 progress of the 3Hz cycle

    if (cycle < 0.12) {
      // SPIKE: Sharp negative deflection
      // Modeled as half a steep sine
      signal += -1 * Math.sin((cycle / 0.12) * Math.PI) * config.amplitude * 1.5;
      isPattern = true;
    } else if (cycle < 0.20) {
      // Return to baseline fast
      signal += Math.sin(((cycle - 0.12) / 0.08) * Math.PI) * config.amplitude * 0.5;
      isPattern = true;
    } else {
      // WAVE: Slow rounded positive wave
      const waveProgress = (cycle - 0.20) / 0.80;
      signal += Math.sin(waveProgress * Math.PI) * config.amplitude * 0.8;
    }
  }
  
  else if (state === BrainState.SEIZURE_GRAND_MAL) {
    // Tonic-Clonic: Polyspikes, Chaotic, Muscle Artifact
    // 1. Fast Spiking (15Hz)
    const spikes = Math.sin(2 * Math.PI * 15 * t);
    
    // 2. Slow Swell (1.5Hz)
    const swell = Math.sin(2 * Math.PI * 1.5 * t);
    
    // 3. Chaos (Random large amplitude noise)
    const chaos = (Math.random() - 0.5) * 2;
    
    // 4. Muscle Tension (High freq, low amp overlay)
    const emg = Math.sin(2 * Math.PI * 50 * t) * 0.2;

    const combined = (spikes + swell * 0.5 + chaos + emg) * config.amplitude;
    signal += combined;
    isPattern = true;
  }
  
  else if (state === BrainState.ARTIFACT_BLINK) {
    // Normal background first
    signal += Math.sin(2 * Math.PI * 10 * t) * 10;
    signal += (Math.random() - 0.5) * 5;

    // Blink Artifact: Large Gaussian/Bell Curve
    // Frontal Only: Fp1, Fp2, F7, F8
    if (['Fp1', 'Fp2', 'F7', 'F8', 'F3', 'F4'].includes(channelId)) {
        // Trigger a blink every ~3 seconds
        const blinkFreq = 0.3; 
        const cycle = (t * blinkFreq) % 1;
        
        // Blink happens at cycle 0.5
        if (cycle > 0.4 && cycle < 0.6) {
           const x = (cycle - 0.5) * 15; // Width factor
           const bellCurve = Math.exp(-Math.pow(x, 2));
           
           // Amplitude decay as we go further back from Fp1/Fp2
           let eyeAmp = 250; 
           if (['F3', 'F4', 'F7', 'F8'].includes(channelId)) eyeAmp = 100;
           
           signal += bellCurve * eyeAmp;
           isPattern = true;
        }
    }
  }

  return { value: signal, isPattern };
};