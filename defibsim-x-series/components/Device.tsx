import React, { useState, useRef, useEffect } from 'react';
import MonitorScreen from './MonitorScreen';
import ControlPanel from './ControlPanel';
import { RhythmType, ChargeState, AppMode, TutorialStep, ExamState, ScenarioData, PacerState, NIBPState, LeadType } from '../types';
import { audioSynth } from '../utils/audio';
import { triggerVentWave } from '../utils/waveformGenerators';

const Device: React.FC = () => {
  // --- DEVICE STATE ---
  const [energy, setEnergy] = useState(200);
  const [chargeState, setChargeState] = useState<ChargeState>(ChargeState.IDLE);
  const [rhythm, setRhythm] = useState<RhythmType>(RhythmType.VFIB);
  const [isCPR, setIsCPR] = useState(false);
  const [flash, setFlash] = useState(false);
  
  // Monitoring State
  const [lead, setLead] = useState<LeadType>('II');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [pacerState, setPacerState] = useState<PacerState>({ enabled: false, rate: 70, current: 0 });
  const [nibpState, setNibpState] = useState<NIBPState>(NIBPState.IDLE);
  const [nibpValue, setNibpValue] = useState("--/--");

  // PHYSIOLOGY STATE
  const [vitalSigns, setVitalSigns] = useState({
    hr: 75,
    spo2: 98,
    etco2: 38,
    sys: 120,
    dia: 80,
    rr: 12
  });
  
  // Internal Physiology Simulation Refs
  const physioState = useRef({
      currentSpO2: 98,
      currentEtCO2: 38,
      currentSys: 120,
      currentDia: 80,
      ventHistory: [] as number[],
      lastEpiTime: 0,
      epiBioAvailability: 0, // 0 to 1, requires circulation to increase
      lastAmiodaroneTime: 0,
      lastVentTime: 0,
      timeInSevereHypoxia: 0 // Seconds spent < 50% SpO2
  });

  // --- SIMULATION STATE ---
  const [mode, setMode] = useState<AppMode>(AppMode.FREE);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(TutorialStep.INTRO);
  const [instructorMsg, setInstructorMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'info'|'success'|'warning'>('info');

  // New: Cheat Sheet Logic
  const [showAlgorithmRef, setShowAlgorithmRef] = useState(false);

  // Exam Mode State
  const [examState, setExamState] = useState<ExamState>({
    caseNumber: 1,
    totalScore: 0,
    logs: [],
    caseActive: false,
    roscProgress: 0
  });
  
  const [showBriefing, setShowBriefing] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ScenarioData | null>(null);
  const cprStartTime = useRef<number>(0);

  // --- PHYSIOLOGY ENGINE LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        const p = physioState.current;

        // 1. CALCULATE VENT RATE
        p.ventHistory = p.ventHistory.filter(t => now - t < 60000); // keep last 60s
        const currentRR = p.ventHistory.length;

        // 2. DETERMINE TARGET VALUES BASED ON SCENARIO
        let targetSpO2 = 98;
        let targetEtCO2 = 38;
        let targetSys = 120;
        let targetDia = 80;
        let targetHR = 75;

        // Base Physiological Status
        if (rhythm === RhythmType.SINUS || rhythm === RhythmType.BRADYCARDIA) {
            targetHR = rhythm === RhythmType.BRADYCARDIA ? 40 : 75;
            targetSys = 115;
            targetDia = 75;
            targetSpO2 = 96;
            targetEtCO2 = 38;
        } else if (rhythm === RhythmType.VTACH) {
            targetHR = 180;
            targetSys = 60; // Unstable
            targetDia = 40;
            targetSpO2 = 85;
            targetEtCO2 = 25; // Poor perfusion
        } else {
            // ARREST RHYTHMS (VF, ASYSTOLE, PEA)
            targetHR = 0; // Mechanical HR is 0
            if (isCPR) {
                targetSys = 110; // Peak compression pressure
                targetDia = 20;
                targetEtCO2 = 32; // Good CPR target
                // SpO2 depends on ventilation.
                targetSpO2 = currentRR >= 6 ? 90 : 60;
            } else {
                // No CPR = Death
                targetSys = 0;
                targetDia = 0;
                targetEtCO2 = 4; // Residual metabolic washout
                targetSpO2 = 20; // Hypoxia
            }
        }

        // 3. PHYSIOLOGICAL COUPLING

        // COUPLING A: HYPOXEMIA -> HEART RATE (Hypoxic Drive & Decompensation)
        // If patient has a pulse (SINUS/BRADY)
        if (rhythm === RhythmType.SINUS || rhythm === RhythmType.BRADYCARDIA) {
            // Sympathetic Response (SpO2 90 -> 60)
            if (p.currentSpO2 < 90 && p.currentSpO2 > 60) {
                const stressFactor = (90 - p.currentSpO2) * 1.5;
                targetHR += stressFactor; // Tachycardia
            }
            // Decompensation / Terminal Bradycardia (SpO2 < 60)
            if (p.currentSpO2 <= 60) {
                const failureFactor = (60 - p.currentSpO2) * 2;
                targetHR = Math.max(20, targetHR - failureFactor);
            }
        }

        // COUPLING B: PERFUSION -> EtCO2
        // EtCO2 requires pulmonary blood flow. 
        // If Sys BP is low, EtCO2 drops even if ventilation is perfect.
        const perfusionFactor = Math.min(1.0, p.currentSys / 90); 
        targetEtCO2 = targetEtCO2 * perfusionFactor;
        
        // VENTILATION EFFECT on EtCO2
        // Hyperventilation (>20 bpm) lowers CO2, Hypo (<6) raises it
        if (currentRR > 20) targetEtCO2 -= 12;
        if (currentRR < 6 && rhythm !== RhythmType.SINUS) targetEtCO2 += 15; // CO2 accumulation in arrest

        // COUPLING C: CIRCULATION -> DRUG ONSET
        // Drugs only wash in if there is circulation (BP > 60)
        if (p.lastEpiTime > 0) {
            if (p.currentSys > 60) {
                // Bioavailability increases
                p.epiBioAvailability = Math.min(1.0, p.epiBioAvailability + 0.05);
            }
            
            // Drug Effect (Scaled by bioavailability)
            if (p.epiBioAvailability > 0.2) {
                const effectiveDose = p.epiBioAvailability;
                if (isCPR) targetSys += 25 * effectiveDose;
                
                // Initial vasoconstriction drops EtCO2 slightly
                if (p.epiBioAvailability < 0.5) {
                    targetEtCO2 -= 5 * effectiveDose;
                }
            }
        }

        // COUPLING D: HYPOXIA -> RHYTHM DEGENERATION
        // If SpO2 < 50 for > 30 seconds, risk of arrest
        if (p.currentSpO2 < 50) {
            p.timeInSevereHypoxia += 0.5;
            if (p.timeInSevereHypoxia > 30 && rhythm === RhythmType.SINUS) {
                // Determine degeneration type
                if (Math.random() < 0.3) {
                     setRhythm(RhythmType.BRADYCARDIA);
                     setInstructorMsg("WARNING: Bradycardia due to hypoxia!");
                     setMsgType('warning');
                }
            }
            if (p.timeInSevereHypoxia > 60 && rhythm !== RhythmType.ASYSTOLE && rhythm !== RhythmType.VFIB) {
                 setRhythm(RhythmType.PEA);
                 setInstructorMsg("CRITICAL: Hypoxic Arrest (PEA)!");
                 setMsgType('warning');
            }
        } else {
            p.timeInSevereHypoxia = Math.max(0, p.timeInSevereHypoxia - 0.5);
        }

        // 4. SMOOTH TRANSITION (LERP)
        const moveTowards = (current: number, target: number, speed: number) => {
            if (Math.abs(target - current) < 0.1) return target;
            return current + (target - current) * speed;
        };

        // BP moves relatively fast (10% per tick)
        p.currentSys = moveTowards(p.currentSys, targetSys, 0.1);
        p.currentDia = moveTowards(p.currentDia, targetDia, 0.1);

        // EtCO2 moves medium speed (5% per tick)
        p.currentEtCO2 = moveTowards(p.currentEtCO2, targetEtCO2, 0.05);

        // SpO2 moves SLOWLY (2% per tick) - Lag time is realistic
        p.currentSpO2 = moveTowards(p.currentSpO2, targetSpO2, 0.02);

        // 5. UPDATE REACT STATE
        setVitalSigns({
            hr: rhythm === RhythmType.VFIB || rhythm === RhythmType.ASYSTOLE ? '---' : Math.floor(targetHR + (Math.random()*4 - 2)),
            spo2: p.currentSpO2,
            etco2: p.currentEtCO2,
            sys: Math.floor(p.currentSys),
            dia: Math.floor(p.currentDia),
            rr: currentRR
        });

    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [rhythm, isCPR]);


  // --- ACTIONS ---

  const handleLeadChange = () => {
    const leads: LeadType[] = ['I', 'II', 'III', 'PADS'];
    const idx = leads.indexOf(lead);
    setLead(leads[(idx + 1) % leads.length]);
  };

  const handleToggleSync = () => setSyncEnabled(!syncEnabled);
  const handleTogglePacer = () => setPacerState(prev => ({ ...prev, enabled: !prev.enabled }));
  
  const handlePacerAdjust = (setting: 'rate' | 'current', delta: number) => {
     setPacerState(prev => {
        if (setting === 'rate') return { ...prev, rate: Math.max(30, Math.min(180, prev.rate + delta)) };
        if (setting === 'current') return { ...prev, current: Math.max(0, Math.min(140, prev.current + delta)) };
        return prev;
     });
  };

  const handleMeasureNIBP = () => {
    if (nibpState !== NIBPState.IDLE && nibpState !== NIBPState.COMPLETE) return;
    setNibpState(NIBPState.INFLATING);
    setTimeout(() => {
        setNibpState(NIBPState.MEASURING);
        setTimeout(() => {
            setNibpState(NIBPState.COMPLETE);
            // Capture CURRENT physiological BP
            const s = Math.round(physioState.current.currentSys);
            const d = Math.round(physioState.current.currentDia);
            
            if (s < 20) {
                 setNibpValue("---/---");
            } else {
                 setNibpValue(`${s}/${d}`);
            }
        }, 3000);
    }, 2000);
  };


  // --- LOGIC ENGINE ---

  const logAction = (action: string, correct: boolean, feedback: string, roscImpact: number = 0) => {
    if (mode !== AppMode.EXAM) return;
    
    setExamState(prev => {
        const newScore = correct ? prev.totalScore + 10 : Math.max(0, prev.totalScore - 15);
        let newProgress = prev.roscProgress + roscImpact;
        if (newProgress < 0) newProgress = 0;
        
        return {
            ...prev,
            totalScore: newScore,
            roscProgress: newProgress,
            logs: [...prev.logs, {
                timestamp: Date.now(),
                action,
                isCorrect: correct,
                feedback
            }]
        };
    });

    if (!correct) {
        setInstructorMsg(`❌ ${feedback}`);
        setMsgType('warning');
    } else {
        setInstructorMsg(`✅ ${feedback}`);
        setMsgType('success');
    }
    
    setTimeout(() => {
        setInstructorMsg(null);
    }, 3000);
  };

  // Check for Win Condition (ROSC)
  useEffect(() => {
      if (mode === AppMode.EXAM && examState.roscProgress >= 100 && rhythm !== RhythmType.SINUS) {
          setRhythm(RhythmType.SINUS);
          setInstructorMsg("ROSC ACHIEVED! Patient has a pulse. Good job.");
          setMsgType('success');
          audioSynth.playBeep();
      }
  }, [examState.roscProgress, mode, rhythm]);

  const handleEnergyChange = (delta: number) => {
    setEnergy(prev => {
      const next = prev + delta;
      return next < 2 ? 2 : next > 360 ? 360 : next;
    });
    if (chargeState === ChargeState.CHARGED) setChargeState(ChargeState.IDLE);
  };

  const handleCharge = () => {
    if (chargeState !== ChargeState.IDLE) return;
    
    if (mode === AppMode.EXAM) {
         const isNonShockable = rhythm === RhythmType.ASYSTOLE || rhythm === RhythmType.PEA;
         if (isNonShockable) {
            logAction('CHARGE', false, "Do not charge for Non-Shockable rhythms!", -10);
         }
    }

    setChargeState(ChargeState.CHARGING);
    audioSynth.playChargeSound(3); 

    setTimeout(() => {
      setChargeState(ChargeState.CHARGED);
      if (mode === AppMode.TUTORIAL && tutorialStep === TutorialStep.PHASE_1_VFIB) {
         setTutorialStep(TutorialStep.PHASE_1_SHOCK);
         setInstructorMsg("Rhythm is VFib. Charge to at least 200J and Shock!");
      }
    }, 3000);
  };

  const handleShock = () => {
    if (chargeState === ChargeState.CHARGED) {
      audioSynth.playShockSound();
      setFlash(true);
      setChargeState(ChargeState.DISCHARGED);
      
      setTimeout(() => {
        setChargeState(ChargeState.IDLE);
        setFlash(false);
      }, 300);
      
      const isShockable = rhythm === RhythmType.VFIB || rhythm === RhythmType.VTACH;

      // FREE MODE
      if (mode === AppMode.FREE && isShockable && energy >= 120) setRhythm(RhythmType.SINUS);

      // TUTORIAL
      if (mode === AppMode.TUTORIAL) {
          if (tutorialStep === TutorialStep.PHASE_1_SHOCK) {
             if (energy < 120) {
                 setInstructorMsg("Energy too low (<120J). Increase energy and try again!");
                 setMsgType('warning');
                 return;
             }

             setInstructorMsg("SHOCK DELIVERED. Resume CPR immediately.");
             setMsgType('success');
             setRhythm(RhythmType.SINUS); 
             setTutorialStep(TutorialStep.PHASE_1_CPR);
             setTimeout(() => {
                 setInstructorMsg("Great. Now let's try a Non-Shockable case.");
                 setTimeout(() => {
                     setRhythm(RhythmType.ASYSTOLE);
                     setTutorialStep(TutorialStep.PHASE_2_ASYSTOLE);
                     setInstructorMsg("Monitor shows Asystole (Flatline). Check pulse & leads.");
                 }, 4000);
             }, 3000);
          } else if (tutorialStep === TutorialStep.PHASE_2_ASYSTOLE) {
              setInstructorMsg("WRONG! Never shock Asystole/PEA.");
              setMsgType('warning');
          }
      }

      // EXAM MODE
      if (mode === AppMode.EXAM) {
          if (isCPR) {
             logAction('SHOCK', false, "DANGER: Shocked while doing CPR! Safety violation.", -50);
             setInstructorMsg("SAFETY VIOLATION! Stand clear before shocking.");
             setMsgType('warning');
             return;
          }

          if (isShockable) {
              if (energy < 120) {
                  logAction('SHOCK', false, `Shock Energy too low (${energy}J). Defibrillation failed.`, -20);
                  setInstructorMsg("Shock Ineffective. Increase Energy.");
                  setMsgType('warning');
              } else {
                  logAction('SHOCK', true, `Shock delivered (${energy}J). Effective.`, 35);
                  setRhythm(RhythmType.SINUS); 
              }
          } else {
              logAction('SHOCK', false, `Harmful shock delivered to ${rhythm}!`, -40);
          }
      }
    } else {
      if (mode !== AppMode.EXAM) alert("NOT CHARGED");
    }
  };

  const handleToggleCPR = () => {
      const newCPRState = !isCPR;
      setIsCPR(newCPRState);
      
      if (newCPRState) {
          cprStartTime.current = Date.now();
          if (mode === AppMode.TUTORIAL && tutorialStep === TutorialStep.INTRO) {
              setTutorialStep(TutorialStep.PHASE_1_VFIB);
              setRhythm(RhythmType.VFIB);
              setInstructorMsg("Good CPR. Stop for Rhythm Check.");
          }
      } else {
          // Stopped CPR
          if (mode === AppMode.EXAM && rhythm !== RhythmType.SINUS) {
              const duration = (Date.now() - cprStartTime.current) / 1000;
              if (duration > 5) {
                   logAction('CPR_CYCLE', true, "CPR Cycle completed.", 10);
              } else {
                   logAction('STOP_CPR', false, "CPR stopped too soon (<2 min).", -5);
              }
          }
      }
  };

  const handleVentilate = () => {
      physioState.current.lastVentTime = Date.now();
      physioState.current.ventHistory.push(Date.now());
      triggerVentWave(); // Triggers the visual wave in generator
  };

  const handleDrug = (drug: 'EPI' | 'AMIO') => {
      if (drug === 'EPI') {
          physioState.current.lastEpiTime = Date.now();
          // Reset bioavailability if given again (new dose)
          physioState.current.epiBioAvailability = 0; 
      }
      if (drug === 'AMIO') physioState.current.lastAmiodaroneTime = Date.now();

      if (mode === AppMode.EXAM) {
          const isShockable = rhythm === RhythmType.VFIB || rhythm === RhythmType.VTACH;
          
          if (drug === 'EPI') {
              // Simple check - in reality we need a history array for multiple doses
              logAction('MED_EPI', true, "Epinephrine 1mg administered.", 20);
          }

          if (drug === 'AMIO') {
              if (isShockable) {
                  logAction('MED_AMIO', true, "Amiodarone given for refractory VF/VT.", 25);
              } else {
                  logAction('MED_AMIO', false, "Amiodarone NOT indicated for Non-Shockable rhythms.", -15);
              }
          }
      }
      setInstructorMsg(`Drug Administered: ${drug}`);
      setTimeout(() => setInstructorMsg(null), 2000);
      
      if (mode === AppMode.TUTORIAL && tutorialStep === TutorialStep.PHASE_2_ASYSTOLE) {
           if (drug === 'EPI') {
               setTutorialStep(TutorialStep.COMPLETE);
               setInstructorMsg("Correct. Epi is the primary drug for Asystole. Tutorial Complete.");
               setMsgType('success');
           }
      }
  };

  // --- SCENARIO GENERATOR ---

  const generateRandomScenario = (): ScenarioData => {
      const rhythms = [RhythmType.VFIB, RhythmType.VTACH, RhythmType.PEA, RhythmType.ASYSTOLE];
      const selectedRhythm = rhythms[Math.floor(Math.random() * rhythms.length)];
      
      const ages = [45, 52, 67, 74, 81, 58];
      const genders = ["Male", "Female"];
      const contexts = [
          "found collapsed at a grocery store.",
          "found unresponsive in bed by family.",
          "collapsed while playing tennis.",
          "found down in the bathroom.",
          "arrested in the dialysis clinic."
      ];
      
      const age = ages[Math.floor(Math.random() * ages.length)];
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      
      let initialPrompt = "Patient is apneic and pulseless. Start ACLS.";
      if (selectedRhythm === RhythmType.PEA) {
          initialPrompt = "Monitor shows rhythm, but NO PULSE is palpable. What is this?";
      }

      return {
          rhythm: selectedRhythm,
          title: `Case #${Math.floor(Math.random() * 900) + 100}: Cardiac Arrest`,
          description: `${age}yo ${gender} ${context} Bystander CPR in progress. No medical history available.`,
          initialPrompt: initialPrompt,
          isShockable: selectedRhythm === RhythmType.VFIB || selectedRhythm === RhythmType.VTACH
      };
  };

  const startNextCase = () => {
      const newScenario = generateRandomScenario();
      setCurrentScenario(newScenario);
      setShowBriefing(true);
      
      // Reset State
      setRhythm(newScenario.rhythm);
      setChargeState(ChargeState.IDLE);
      setEnergy(200); 
      setIsCPR(false);
      physioState.current.lastEpiTime = 0;
      physioState.current.ventHistory = [];
      setNibpValue("--/--");
      setNibpState(NIBPState.IDLE);
      setInstructorMsg(null);
      setSyncEnabled(false);
      setShowAlgorithmRef(false);
      
      // Reset Physiology for new patient
      physioState.current.currentEtCO2 = 10;
      physioState.current.currentSpO2 = 60;
      physioState.current.currentSys = 0;
      physioState.current.epiBioAvailability = 0;
      physioState.current.timeInSevereHypoxia = 0;
      
      setExamState(prev => ({
          ...prev,
          caseNumber: prev.caseNumber + 1,
          roscProgress: 0,
          caseActive: false
      }));
  };

  const handleStartExam = () => {
      setMode(AppMode.EXAM);
      setExamState({
          caseNumber: 0,
          totalScore: 0,
          logs: [],
          caseActive: false,
          roscProgress: 0
      });
      startNextCase();
  };

  const handleAcceptBriefing = () => {
      setShowBriefing(false);
      if (currentScenario) {
        setInstructorMsg(currentScenario.initialPrompt);
        setMsgType('info');
      }
      setExamState(prev => ({ ...prev, caseActive: true }));
  };

  const handleTutorialStart = () => {
      setMode(AppMode.TUTORIAL);
      setRhythm(RhythmType.VFIB); 
      setTutorialStep(TutorialStep.INTRO);
      setEnergy(100); 
      setInstructorMsg("Welcome to ACLS Tutorial. Step 1: Patient is unconscious. Start CPR.");
      setMsgType('info');
      setShowAlgorithmRef(true);
      
      // Reset Physio
      physioState.current.currentEtCO2 = 15;
      physioState.current.currentSpO2 = 80;
  };

  // Determine what logic stage to highlight on the reference chart
  const getSmartStageHighlight = () => {
      if (mode === AppMode.TUTORIAL) return tutorialStep;
      
      if (rhythm === RhythmType.VFIB || rhythm === RhythmType.VTACH) return 'VFIB SHOCK';
      if (rhythm === RhythmType.ASYSTOLE || rhythm === RhythmType.PEA) return 'ASYSTOLE PEA MEDS';
      return 'INTRO';
  };

  // Check if ventilating recently (for UI display)
  const isVentilating = (Date.now() - physioState.current.lastVentTime) < 2000;

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-2 md:p-4 items-center min-h-screen bg-[#111] overflow-x-hidden font-sans select-none">
      
      {/* --- DEVICE UNIT --- */}
      <div className="relative bg-[#333] p-1 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col md:flex-row gap-0 w-full max-w-[1200px] border-4 border-[#222]">
        
        {/* Rubber Bumpers */}
        <div className="hidden md:block absolute -top-2 -left-2 w-16 h-16 bg-[#1a1a1a] rounded-tl-[2.5rem] z-0 shadow-lg"></div>
        <div className="hidden md:block absolute -top-2 -right-2 w-16 h-16 bg-[#1a1a1a] rounded-tr-[2.5rem] z-0 shadow-lg"></div>
        <div className="hidden md:block absolute -bottom-2 -left-2 w-16 h-16 bg-[#1a1a1a] rounded-bl-[2.5rem] z-0 shadow-lg"></div>
        <div className="hidden md:block absolute -bottom-2 -right-2 w-16 h-16 bg-[#1a1a1a] rounded-br-[2.5rem] z-0 shadow-lg"></div>

        <div className="flex flex-col md:flex-row w-full bg-[#e5e5e5] rounded-[1rem] md:rounded-[1.5rem] overflow-hidden z-10 border-4 border-[#444] shadow-inner min-h-[70vh] md:min-h-[600px] md:h-auto relative">
            
            {/* --- BRIEFING MODAL --- */}
            {showBriefing && currentScenario && (
                <div className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="bg-gray-900 border border-gray-600 text-gray-200 max-w-2xl w-full p-6 md:p-10 rounded-xl shadow-2xl flex flex-col gap-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
                        
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold tracking-widest uppercase text-xs">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                EMS HANDOFF REPORT
                            </div>
                            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 font-mono leading-tight">{currentScenario.title}</h2>
                            <div className="h-px w-full bg-gray-700 mb-6"></div>
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed font-light">
                                {currentScenario.description}
                            </p>
                        </div>

                        <button 
                            onClick={handleAcceptBriefing}
                            className="mt-4 bg-white text-black font-bold text-lg py-4 rounded hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                        >
                            <span>Start Resuscitation</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Monitor Area */}
            <div className="flex-[3] bg-[#222] p-2 md:p-4 flex flex-col border-b-4 md:border-b-0 md:border-r-4 border-[#111] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] relative h-[50vh] md:h-auto">
                <MonitorScreen 
                    rhythm={rhythm} 
                    chargeState={chargeState}
                    energySelected={energy}
                    instructorMessage={instructorMsg}
                    messageType={msgType}
                    isCPR={isCPR}
                    tutorialStage={getSmartStageHighlight()}
                    showAlgorithm={mode === AppMode.TUTORIAL ? true : showAlgorithmRef}
                    onToggleAlgorithm={() => setShowAlgorithmRef(!showAlgorithmRef)}
                    lead={lead}
                    syncEnabled={syncEnabled}
                    pacerState={pacerState}
                    nibpState={nibpState}
                    nibpValue={nibpValue}
                    vitalSigns={vitalSigns}
                    isVentilating={isVentilating}
                />
                
                {/* Flash Overlay */}
                <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${flash ? 'opacity-80' : 'opacity-0'} z-[100] mix-blend-hard-light`}></div>
            </div>

            {/* Controls Area */}
            <div className="w-full md:w-[320px] bg-[#333] border-l border-[#555] shrink-0 h-auto md:h-auto">
                <ControlPanel 
                    energy={energy}
                    chargeState={chargeState}
                    onEnergyChange={handleEnergyChange}
                    onCharge={handleCharge}
                    onShock={handleShock}
                    isCPR={isCPR}
                    onToggleCPR={handleToggleCPR}
                    onVentilate={handleVentilate}
                    onAdministerDrug={handleDrug}
                    lead={lead}
                    onLeadChange={handleLeadChange}
                    syncEnabled={syncEnabled}
                    onToggleSync={handleToggleSync}
                    pacerState={pacerState}
                    onTogglePacer={handleTogglePacer}
                    onPacerAdjust={handlePacerAdjust}
                    nibpState={nibpState}
                    onMeasureNIBP={handleMeasureNIBP}
                />
            </div>
        </div>
      </div>

      {/* --- INSTRUCTOR / EXAM CONTROLLER --- */}
      <div className="w-full max-w-[700px] bg-gray-100 rounded-xl shadow-2xl overflow-hidden border-4 border-gray-400 mb-8">
           <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white">
               <h3 className="font-bold text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   Training Controller
               </h3>
               {mode === AppMode.EXAM && (
                   <div className="flex gap-4">
                       <span className="text-blue-300 font-bold text-xs md:text-sm">CASE: {examState.caseNumber}</span>
                       <span className="text-yellow-400 font-bold text-xs md:text-sm">SCORE: {examState.totalScore}</span>
                   </div>
               )}
           </div>
           
           <div className="p-4 flex gap-2 md:gap-4 overflow-x-auto">
                <button 
                    onClick={handleTutorialStart}
                    className="flex-1 min-w-[100px] py-3 md:py-4 bg-blue-100 border-2 border-blue-400 rounded-lg hover:bg-blue-200 transition-colors flex flex-col items-center group"
                >
                    <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">📖</span>
                    <span className="font-bold text-blue-900 text-xs md:text-base mt-1">ACLS Tutorial</span>
                    <span className="text-[10px] md:text-xs text-blue-700">Guided Walkthrough</span>
                </button>

                <button 
                    onClick={handleStartExam}
                    className="flex-1 min-w-[100px] py-3 md:py-4 bg-red-100 border-2 border-red-400 rounded-lg hover:bg-red-200 transition-colors flex flex-col items-center group"
                >
                    <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">📝</span>
                    <span className="font-bold text-red-900 text-xs md:text-base mt-1">Start Exam</span>
                    <span className="text-[10px] md:text-xs text-red-700">Infinite Random Cases</span>
                </button>

                {mode === AppMode.EXAM && rhythm === RhythmType.SINUS && (
                    <button 
                        onClick={startNextCase}
                        className="flex-1 min-w-[100px] py-3 md:py-4 bg-green-100 border-2 border-green-400 rounded-lg hover:bg-green-200 transition-colors flex flex-col items-center animate-pulse"
                    >
                        <span className="text-xl md:text-2xl">➡️</span>
                        <span className="font-bold text-green-900 text-xs md:text-base mt-1">Next Case</span>
                    </button>
                )}

                <button 
                    onClick={() => { setMode(AppMode.FREE); setRhythm(RhythmType.SINUS); setInstructorMsg(null); }}
                    className="flex-1 min-w-[100px] py-3 md:py-4 bg-gray-200 border-2 border-gray-400 rounded-lg hover:bg-gray-300 transition-colors flex flex-col items-center group"
                >
                    <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">🏥</span>
                    <span className="font-bold text-gray-800 text-xs md:text-base mt-1">Free Play</span>
                    <span className="text-[10px] md:text-xs text-gray-600">Sandbox Mode</span>
                </button>
           </div>
      </div>

    </div>
  );
};

export default Device;