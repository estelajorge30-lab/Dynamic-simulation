
import { DiagnosisType, Severity, CaseData, DataPoint, Demographics, ClinicalValues, ReferenceValues } from '../types';

// Simplified GLI-2012 style prediction approximations for demonstration
// In a real medical device, these would use the full lookup tables/coefficients
const calculatePredicted = (demographics: Demographics): ReferenceValues => {
  const { age, height, sex } = demographics;
  const hM = height / 100;

  // Rough coefficients for healthy adult
  let fvcPred = 0;
  let fev1Pred = 0;
  let pefPred = 0;

  if (sex === 'Male') {
    fvcPred = (5.76 * hM) - (0.026 * age) - 4.34;
    fev1Pred = (4.3 * hM) - (0.029 * age) - 2.49;
    pefPred = (6.14 * hM) - (0.043 * age) + 1.5;
  } else {
    fvcPred = (4.43 * hM) - (0.026 * age) - 2.89;
    fev1Pred = (3.95 * hM) - (0.025 * age) - 2.6;
    pefPred = (5.5 * hM) - (0.03 * age) + 1.1;
  }

  // Ensure positive constraints
  fvcPred = Math.max(1.5, fvcPred);
  fev1Pred = Math.max(1.0, fev1Pred);
  pefPred = Math.max(3.0, pefPred);

  // Lower Limit of Normal (approx 5th percentile)
  const ratioLLN = 0.70; // Fixed roughly for adults < 60, decreases with age realistically
  const fvcLLN = fvcPred * 0.8;

  return {
    fvcPred,
    fev1Pred,
    pefPred,
    ratioLLN: age > 60 ? 0.65 : 0.70, // Age correction roughly
    fvcLLN
  };
};

const generateCurvePoints = (fvc: number, pef: number, diagnosis: DiagnosisType): { fv: DataPoint[], vt: DataPoint[] } => {
  const fvPoints: DataPoint[] = [];
  const vtPoints: DataPoint[] = [];
  
  const steps = 100;
  
  // Curve Shape Parameters
  let curveExponent = 1; 
  if (diagnosis === DiagnosisType.OBSTRUCTIVE) curveExponent = 3.5; // Scooped
  if (diagnosis === DiagnosisType.RESTRICTIVE) curveExponent = 0.8; // Convex/Linear
  if (diagnosis === DiagnosisType.MIXED) curveExponent = 2.5;

  // Expiration Logic
  // We model Flow vs Volume directly, then derive Time for VT curve
  const riseVolume = fvc * 0.10; // Rapid rise

  let currentTime = 0;

  for (let i = 0; i <= steps; i++) {
    const v = (i / steps) * fvc;
    let flow = 0;

    if (v < riseVolume) {
      flow = (v / riseVolume) * pef;
    } else {
      const rem = (fvc - v) / (fvc - riseVolume);
      flow = pef * Math.pow(rem, curveExponent);
    }
    
    // Safety for integration
    if (flow < 0.1) flow = 0.1;

    fvPoints.push({ volume: v, flow });
    
    // Estimate Time: dt = dV / Flow
    if (i > 0) {
      const dV = v - ((i - 1) / steps) * fvc;
      const avgFlow = (flow + fvPoints[i-1].flow) / 2;
      const dt = dV / avgFlow;
      currentTime += dt;
    }
    vtPoints.push({ volume: v, flow, time: currentTime });
  }

  // Inspiration Loop (Negative Flow) - Simplified, roughly semi-circle
  const pif = pef * 0.7;
  const inspSteps = 50;
  for (let i = 0; i <= inspSteps; i++) {
    const v = fvc - (i / inspSteps) * fvc;
    const normalizedV = v / fvc;
    const flow = -1 * pif * 4 * normalizedV * (1 - normalizedV);
    fvPoints.push({ volume: v, flow });
  }
  // Close loop
  fvPoints.push(fvPoints[0]);

  return { fv: fvPoints, vt: vtPoints };
};

export const generateCase = (forcedType?: DiagnosisType): CaseData => {
  // 1. Generate Demographics
  const age = Math.floor(Math.random() * (75 - 25) + 25);
  const isMale = Math.random() > 0.5;
  const height = isMale ? Math.floor(Math.random() * (190 - 165) + 165) : Math.floor(Math.random() * (175 - 150) + 150);
  
  const demographics: Demographics = {
    age,
    sex: isMale ? 'Male' : 'Female',
    height,
    ethnicity: 'Caucasian' // Simplifying for GLI demo
  };

  // 2. Get Predicted
  const predicted = calculatePredicted(demographics);

  // 3. Determine Diagnosis & Severity
  let diagnosis = forcedType;
  if (!diagnosis) {
    const types = [DiagnosisType.NORMAL, DiagnosisType.OBSTRUCTIVE, DiagnosisType.RESTRICTIVE, DiagnosisType.MIXED];
    diagnosis = types[Math.floor(Math.random() * types.length)];
  }

  let severity = Severity.NORMAL;
  if (diagnosis !== DiagnosisType.NORMAL) {
    const r = Math.random();
    if (r < 0.33) severity = Severity.MILD;
    else if (r < 0.66) severity = Severity.MODERATE;
    else severity = Severity.SEVERE;
  }

  // 4. Calculate Actual Values based on Disease Modifiers (PDF Page 8/9)
  let actualFVC = predicted.fvcPred;
  let actualFEV1 = predicted.fev1Pred;
  let actualPEF = predicted.pefPred;

  switch (diagnosis) {
    case DiagnosisType.OBSTRUCTIVE:
      // FEV1 reduced significantly, FVC normal or slightly reduced
      actualFVC = predicted.fvcPred * (Math.random() * (1.1 - 0.85) + 0.85);
      
      let obstFactor = 0.75;
      if (severity === Severity.MILD) obstFactor = 0.75;
      if (severity === Severity.MODERATE) obstFactor = 0.55;
      if (severity === Severity.SEVERE) obstFactor = 0.35;
      
      actualFEV1 = predicted.fev1Pred * obstFactor;
      actualPEF = predicted.pefPred * obstFactor; // Peak flow also drops in COPD
      break;

    case DiagnosisType.RESTRICTIVE:
      // FVC reduced, FEV1 reduced proportionately (Ratio normal/high)
      let restFactor = 0.75;
      if (severity === Severity.MILD) restFactor = 0.75;
      if (severity === Severity.MODERATE) restFactor = 0.55;
      if (severity === Severity.SEVERE) restFactor = 0.35;

      actualFVC = predicted.fvcPred * restFactor;
      actualFEV1 = predicted.fev1Pred * restFactor; 
      actualPEF = predicted.pefPred * restFactor; // PEF drops due to volume loss but shape is sharp
      break;

    case DiagnosisType.MIXED:
      // Both reduced
      actualFVC = predicted.fvcPred * 0.6;
      actualFEV1 = predicted.fev1Pred * 0.4;
      actualPEF = predicted.pefPred * 0.5;
      break;

    case DiagnosisType.NORMAL:
    default:
      actualFVC = predicted.fvcPred * (Math.random() * (1.1 - 0.9) + 0.9);
      actualFEV1 = predicted.fev1Pred * (Math.random() * (1.1 - 0.9) + 0.9);
      actualPEF = predicted.pefPred * (Math.random() * (1.1 - 0.9) + 0.9);
      break;
  }

  // Enforce LLN Logic for Quiz consistency
  const actualRatio = actualFEV1 / actualFVC;
  
  // Correction to ensure generated numbers match diagnosis strictly
  if (diagnosis === DiagnosisType.OBSTRUCTIVE && actualRatio > predicted.ratioLLN) {
     actualFEV1 = actualFVC * (predicted.ratioLLN - 0.10); 
  }
  if (diagnosis === DiagnosisType.RESTRICTIVE && actualFVC > predicted.fvcLLN) {
     actualFVC = predicted.fvcLLN - 0.5;
     actualFEV1 = actualFVC * 0.85; // Maintain ratio
  }

  const actualValues: ClinicalValues = {
    fvc: actualFVC,
    fev1: actualFEV1,
    ratio: actualFEV1 / actualFVC,
    pef: actualPEF
  };

  // 5. Generate Loops
  const actualCurves = generateCurvePoints(actualFVC, actualPEF, diagnosis);
  
  // Generate a "Predicted" curve (Normal shape, Predicted values)
  const predCurves = generateCurvePoints(predicted.fvcPred, predicted.pefPred, DiagnosisType.NORMAL);

  return {
    id: Math.random().toString(36).substr(2, 9),
    demographics,
    diagnosis,
    severity,
    actual: actualValues,
    predicted,
    loops: {
      flowVolume: actualCurves.fv,
      volumeTime: actualCurves.vt,
      predictedFlowVolume: predCurves.fv
    },
    description: `Generated case of ${severity} ${diagnosis}.`
  };
};
