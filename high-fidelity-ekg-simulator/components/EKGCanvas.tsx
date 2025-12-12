import React, { useRef, useEffect, useCallback, useState } from 'react';
import { 
  THEME_COLORS, STANDARD_CONFIG, SIMULATION_CONFIG, BASE_LEADS
} from '../constants';
import { LeadId, WaveComponent, CaseScenario } from '../types';

interface EKGCanvasProps {
  isStatic: boolean;
  themeMode: 'paper' | 'monitor';
  currentCase: CaseScenario;
  showMeasurements?: boolean;
  zoomScale?: number;
  isCaliperMode?: boolean;
  speed?: 25 | 50;
  gain?: 10 | 20;
}

const SAMPLE_RATE = 2000; // Hz for the cache buffer

const EKGCanvas: React.FC<EKGCanvasProps> = ({ 
  isStatic, 
  themeMode, 
  currentCase, 
  showMeasurements = false, 
  zoomScale = 1.0, 
  isCaliperMode = false,
  speed = 25,
  gain = 10 
}) => {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const signalCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  
  // Animation state
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Performance Caches
  const beatVoltageCache = useRef<Record<string, Float32Array>>({});
  const beatMeasurementCache = useRef<Record<string, any>>({});
  
  // Dimensions state to trigger redraws
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, dpr: 1 });

  // Caliper State
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Calculate the physical size of the canvas DOM elements based on Zoom
  const renderWidth = dimensions.width * zoomScale;
  // Always Grid mode (2 cols, 6 rows)
  const renderHeight = dimensions.height * zoomScale;

  // --- PRE-CALCULATE CACHE EFFECT ---
  useEffect(() => {
    const beatDuration = 60 / currentCase.heartRate;
    const numSamples = Math.floor(beatDuration * SAMPLE_RATE);
    const cache: Record<string, Float32Array> = {};
    const measureCache: Record<string, any> = {};

    const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    
    // Gaussian math helper with Skew support
    const calcVolts = (t: number, waves: WaveComponent[]) => {
       let v = 0;
       for(const w of waves) {
         // Optimization range check
         if (Math.abs(t - w.center) > w.width * 4) continue;
         
         let effectiveWidth = w.width;
         if (w.skew) {
            // Skew logic: 
            // Negative skew = Left side wider (Slow rise), Right side narrower (Fast fall) -> Physiological T wave
            // Positive skew = Left side narrower (Fast rise), Right side wider (Slow fall)
            const dt = t - w.center;
            if (dt < 0) {
               effectiveWidth = w.width * (1 - w.skew);
            } else {
               effectiveWidth = w.width * (1 + w.skew);
            }
         }

         v += w.amplitude * Math.exp(-Math.pow(t - w.center, 2) / (2 * Math.pow(effectiveWidth, 2)));
       }
       return v;
    };

    const getWaves = (lead: string) => {
        // @ts-ignore
        if (currentCase.overrides && currentCase.overrides[lead]) return currentCase.overrides[lead];
        if (BASE_LEADS[lead]) return BASE_LEADS[lead];
        return [];
    };

    // 1. Generate Raw Buffers for I and II first (base for derivation)
    ['I', 'II'].forEach(lead => {
         const waves = getWaves(lead);
         const arr = new Float32Array(numSamples);
         for(let i=0; i<numSamples; i++) {
             const t = (i / SAMPLE_RATE) - (beatDuration / 2);
             arr[i] = calcVolts(t, waves);
         }
         cache[lead] = arr;
    });

    // 2. Generate rest of leads
    leads.forEach(lead => {
        if (lead === 'I' || lead === 'II') return;

        // @ts-ignore
        const hasOverride = currentCase.overrides && currentCase.overrides[lead];
        
        if (hasOverride || !['III', 'aVR', 'aVL', 'aVF'].includes(lead)) {
             // Calculate from waves directly
             const waves = getWaves(lead);
             const arr = new Float32Array(numSamples);
             if (waves.length > 0) {
                for(let i=0; i<numSamples; i++) {
                    const t = (i / SAMPLE_RATE) - (beatDuration / 2);
                    arr[i] = calcVolts(t, waves);
                }
             }
             cache[lead] = arr;
        } else {
             // Einthoven Derivation
             const arr = new Float32Array(numSamples);
             const bufI = cache['I'];
             const bufII = cache['II'];
             // Safety check
             if (bufI && bufII) {
                 for(let i=0; i<numSamples; i++) {
                    const v1 = bufI[i];
                    const v2 = bufII[i];
                    let val = 0;
                    if (lead === 'III') val = v2 - v1;
                    else if (lead === 'aVR') val = -0.5 * (v1 + v2);
                    else if (lead === 'aVL') val = v1 - 0.5 * v2;
                    else if (lead === 'aVF') val = v2 - 0.5 * v1;
                    arr[i] = val;
                 }
             }
             cache[lead] = arr;
        }
    });

    // 3. Pre-calculate Measurements
    // Fallback timings from Lead II (Master)
    let masterTimings: any = {};
    const masterWaves = getWaves('II');
    if (masterWaves && masterWaves.length > 0) {
        const sorted = [...masterWaves].sort((a,b) => a.center - b.center);
        const significant = sorted.filter(w => Math.abs(w.amplitude) > 0.02);
        const pWave = significant.find(w => w.center < -0.09); 
        const qOrRFirst = significant.find(w => w.center >= -0.09 && w.center < 0);
        const reversed = [...significant].reverse();
        const rOrSLast = reversed.find(w => w.center >= -0.09 && w.center < 0.12);
        const tWave = reversed.find(w => w.center >= 0.12);

        if (pWave && qOrRFirst) {
            masterTimings.pStart = pWave.center - (2.2 * pWave.width);
            masterTimings.qrsStart = qOrRFirst.center - (2.0 * qOrRFirst.width);
        }
        if (qOrRFirst && rOrSLast) {
            masterTimings.qrsStart = masterTimings.qrsStart || (qOrRFirst.center - (2.0 * qOrRFirst.width));
            masterTimings.qrsEnd = rOrSLast.center + (2.0 * rOrSLast.width);
            if (tWave) {
               masterTimings.tEnd = tWave.center + (2.5 * tWave.width);
            }
        }
        if (rOrSLast) {
             masterTimings.jPointTime = rOrSLast.center + (2.0 * rOrSLast.width);
        }
    }

    leads.forEach(lead => {
         const waves = getWaves(lead);
         // Measurements object
         const m: any = { ...masterTimings };
         
         // If this lead has specific waves, refine timings?
         // For stability, sticking to master timings for intervals is clinically acceptable for a simulator
         // unless specific lead pathology (like pre-excitation) changes local timings. 
         // But voltage measurements MUST be local.

         // Calculate ST Voltage for THIS lead using master J-point + 60ms
         if (m.jPointTime !== undefined && cache[lead]) {
             const stTime = m.jPointTime + 0.06;
             const stIndex = Math.floor(((stTime + (beatDuration/2)) / beatDuration) * numSamples);
             if (stIndex >= 0 && stIndex < cache[lead].length) {
                 m.stVoltage = cache[lead][stIndex];
             }
         }
         
         measureCache[lead] = m;
    });

    beatVoltageCache.current = cache;
    beatMeasurementCache.current = measureCache;

  }, [currentCase]);


  // --- POINTER EVENTS FOR CALIPERS ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isCaliperMode || !scrollWrapperRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const rect = scrollWrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);
    
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isCaliperMode || !scrollWrapperRef.current || !renderWidth) return;
    
    const rect = scrollWrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    if (isDragging) {
      setDragCurrent({ x, y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isCaliperMode) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!isCaliperMode) {
      setDragStart(null);
      setDragCurrent(null);
      setIsDragging(false);
    }
  }, [isCaliperMode]);

  // --- MATH HELPERS ---

  const getNoise = useCallback((t: number, seedOffset: number) => {
    // Continuous harmonic noise to fix flickering
    const highFreq = Math.sin(t * 150 + seedOffset) * 0.5; 
    const midFreq = Math.sin(t * 60 + seedOffset) * 0.3; 
    const lowFreq = Math.sin(t * 10 + seedOffset) * 0.2;
    // Combine frequencies
    return (highFreq * 0.4 + midFreq * 0.3 + lowFreq * 0.3) * SIMULATION_CONFIG.NOISE_AMPLITUDE;
  }, []);

  const getVoltageAtTime = useCallback((absoluteTime: number, lead: LeadId, clean: boolean = false) => {
    const beatDuration = 60 / currentCase.heartRate; 
    const timeInBeat = (absoluteTime % beatDuration) - (beatDuration / 2);
    
    // LOOKUP FROM CACHE
    let baseVoltage = 0;
    const cache = beatVoltageCache.current[lead];
    if (cache) {
        // Map timeInBeat (-duration/2 to +duration/2) to index (0 to numSamples)
        const sampleIndex = Math.floor(((timeInBeat + (beatDuration/2)) / beatDuration) * cache.length);
        if (sampleIndex >= 0 && sampleIndex < cache.length) {
            baseVoltage = cache[sampleIndex];
        }
    }

    if (clean) return baseVoltage;

    const leadOffset = lead.charCodeAt(0) + (lead.length > 1 ? lead.charCodeAt(1) : 0);
    return baseVoltage + getNoise(absoluteTime, leadOffset);

  }, [currentCase, getNoise]);

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        const dpr = window.devicePixelRatio || 1;
        setDimensions({ width, height, dpr });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // --- DRAW STATIC GRID ---
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || renderWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = renderWidth * dimensions.dpr;
    canvas.height = renderHeight * dimensions.dpr;
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;
    
    ctx.scale(dimensions.dpr, dimensions.dpr);

    const width = renderWidth;
    const height = renderHeight;
    
    const COLORS = themeMode === 'monitor' ? THEME_COLORS.MONITOR : THEME_COLORS.PAPER;
    const totalCols = 2;
    const totalRows = 6;
    const colWidth = width / totalCols;
    const rowHeight = height / totalRows;

    const basePixelsPerMm = STANDARD_CONFIG.pixelsPerMm * zoomScale;
    const effectivePixelsPerMm = basePixelsPerMm; 

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const drawGridLines = (stepSizeMm: number, color: string, lineWidth: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const stepSizePx = stepSizeMm * effectivePixelsPerMm;
      if (stepSizePx < 4) return; 
      for (let x = 0; x <= width; x += stepSizePx) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = 0; y <= height; y += stepSizePx) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();
    };

    drawGridLines(1, COLORS.LINE_FINE, 0.5);
    drawGridLines(5, COLORS.LINE_THICK, 1.0);

    const leads: LeadId[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = `bold ${Math.max(10, 12 * (effectivePixelsPerMm/5))}px monospace`;

    leads.forEach((lead, index) => {
      let colIndex = index >= 6 ? 1 : 0;
      let rowIndex = index % 6;
      const startX = colIndex * colWidth;
      ctx.fillText(lead, startX + 10, (rowIndex * rowHeight) + 20);
    });
    
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = themeMode === 'monitor' ? '#666' : '#999';
    ctx.fillText(`${speed} mm/s  ${gain} mm/mV`, width - 10, height - 10);
    ctx.textAlign = 'left';

  }, [dimensions, themeMode, zoomScale, speed, gain, renderWidth, renderHeight]);


  // --- DRAW DYNAMIC SIGNAL ---
  const drawSignal = useCallback((timestamp: number) => {
    const canvas = signalCanvasRef.current;
    if (!canvas || renderWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = Math.round(renderWidth * dimensions.dpr);
    const targetH = Math.round(renderHeight * dimensions.dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${renderWidth}px`;
        canvas.style.height = `${renderHeight}px`;
        ctx.scale(dimensions.dpr, dimensions.dpr);
    } else {
       ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
    }
    
    ctx.clearRect(0, 0, renderWidth, renderHeight);

    if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = timestamp;
    
    if (!isStatic) {
      timeRef.current += deltaTime;
    }
    const currentTime = timeRef.current;

    const width = renderWidth;
    const height = renderHeight;
    const COLORS = themeMode === 'monitor' ? THEME_COLORS.MONITOR : THEME_COLORS.PAPER;
    const colWidth = width / 2;
    const rowHeight = height / 6;

    const basePixelsPerMm = STANDARD_CONFIG.pixelsPerMm * zoomScale;
    const effectivePxPerSecond = speed * basePixelsPerMm;
    const effectiveVoltageGain = gain;
    
    const eraserWidthPx = SIMULATION_CONFIG.ERASER_SIZE_MM * basePixelsPerMm;
    const relativeCursorX = (currentTime * effectivePxPerSecond) % colWidth;
    const leads: LeadId[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const displayCalHeightPx = 1 * effectiveVoltageGain * basePixelsPerMm; 
    const calWidthPx = 5 * basePixelsPerMm;
    const calOffsetX = 10; 

    // Helper for drawing measurement text/lines
    const drawMeasurement = (startX: number, endX: number, y: number, label: string, color: string = '#0ea5e9', position: 'above' | 'below' = 'below', isAmp: boolean = false) => {
      const bracketHeight = isAmp ? 0 : 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.fillStyle = color;
      ctx.font = '9px monospace'; 
      
      if (!isAmp) {
        ctx.beginPath();
        ctx.moveTo(startX, y); ctx.lineTo(endX, y);
        const yEnd = position === 'below' ? y - bracketHeight : y + bracketHeight;
        ctx.moveTo(startX, y); ctx.lineTo(startX, yEnd);
        ctx.moveTo(endX, y); ctx.lineTo(endX, yEnd);
        ctx.stroke();
      }

      const textWidth = ctx.measureText(label).width;
      let textX = startX + (endX - startX) / 2 - textWidth / 2;
      if (textWidth > Math.abs(endX - startX)) {
         textX = endX + 2; 
      }
      const textY = isAmp ? y : (position === 'below' ? y + 10 : y - 4);
      ctx.fillText(label, textX, textY);
    };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    leads.forEach((lead, index) => {
      let colIndex = index >= 6 ? 1 : 0;
      let rowIndex = index % 6;
      const startX = colIndex * colWidth;
      const rowCenterY = (rowIndex * rowHeight) + (rowHeight / 2);
      const signalStartX = startX + calOffsetX + calWidthPx + 5; 
      const signalAvailableWidth = colWidth - (calOffsetX + calWidthPx + 5);

      // 1. Calibration Pulse
      ctx.beginPath();
      ctx.strokeStyle = COLORS.SIGNAL;
      ctx.lineWidth = 1.5;
      const calBaseY = rowCenterY + (displayCalHeightPx / 2);
      ctx.moveTo(startX + calOffsetX, calBaseY); 
      ctx.lineTo(startX + calOffsetX + (calWidthPx * 0.2), calBaseY); 
      ctx.lineTo(startX + calOffsetX + (calWidthPx * 0.2), calBaseY - displayCalHeightPx); 
      ctx.lineTo(startX + calOffsetX + (calWidthPx * 0.8), calBaseY - displayCalHeightPx); 
      ctx.lineTo(startX + calOffsetX + (calWidthPx * 0.8), calBaseY); 
      ctx.lineTo(startX + calOffsetX + calWidthPx, calBaseY); 
      ctx.stroke();

      // 2. Waveform Drawing
      const drawWavePath = () => {
        ctx.beginPath();
        let isDrawing = false;
        // Optimization: fewer points when zoomed out, more when zoomed in
        const stepSize = isStatic ? Math.max(0.5, 0.5 / zoomScale) : 1; 

        for (let xRel = 0; xRel <= signalAvailableWidth; xRel += stepSize) { 
          let shouldDrawPoint = true;
          let timeForPoint = 0;
          const screenX = signalStartX + xRel;

          if (isStatic) {
            timeForPoint = xRel / effectivePxPerSecond;
            shouldDrawPoint = true;
          } else {
             const relativeXInCol = (screenX - startX);
             let distanceAhead = relativeXInCol - relativeCursorX;
             if (distanceAhead < 0) distanceAhead += colWidth;

             if (distanceAhead < eraserWidthPx) {
                shouldDrawPoint = false;
             } else {
                let timeOffset = (relativeCursorX - relativeXInCol) / effectivePxPerSecond;
                if (relativeXInCol > relativeCursorX) {
                    timeOffset = (relativeCursorX + (colWidth - relativeXInCol)) / effectivePxPerSecond;
                }
                timeForPoint = currentTime - timeOffset;
             }
          }

          if (shouldDrawPoint) {
            const voltage = getVoltageAtTime(timeForPoint, lead);
            const dyPixels = voltage * effectiveVoltageGain * basePixelsPerMm;
            const y = rowCenterY - dyPixels;

            if (!isDrawing) {
              ctx.moveTo(screenX, y);
              isDrawing = true;
            } else {
              ctx.lineTo(screenX, y);
            }
          } else {
            isDrawing = false;
          }
        }
        ctx.stroke();
      };

      if (themeMode === 'monitor') {
          ctx.strokeStyle = COLORS.SIGNAL;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.3; 
          drawWavePath();
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 1.0; 
          drawWavePath();
      } else {
          ctx.strokeStyle = COLORS.SIGNAL;
          ctx.lineWidth = 1.5;
          drawWavePath();
      }

      // 3. Automated Measurements (Cached)
      if (showMeasurements && !isCaliperMode) {
        const beatDuration = 60 / currentCase.heartRate;
        const visibleBeatCenterTime = beatDuration / 2;
        const beatCenterPx = (visibleBeatCenterTime * effectivePxPerSecond) + signalStartX;
        
        if (beatCenterPx > signalStartX && beatCenterPx < startX + colWidth) {
           const tToX = (tOffset: number) => beatCenterPx + (tOffset * effectivePxPerSecond);
           const m = beatMeasurementCache.current[lead];
           
           if (m) {
             const color = themeMode === 'monitor' ? '#c084fc' : '#9333ea';
             const yMeas = rowCenterY + (30 * dimensions.dpr * (zoomScale > 1 ? 1 : 0.6)); 

             // ST Voltage
             if (m.stVoltage !== undefined && m.jPointTime !== undefined) {
                 const stLabel = `ST: ${m.stVoltage > 0 ? '+' : ''}${m.stVoltage.toFixed(2)}mV`;
                 const jPointX = tToX(m.jPointTime);
                 const labelY = rowCenterY - (m.stVoltage * effectiveVoltageGain * basePixelsPerMm) - 15;
                 ctx.fillStyle = color;
                 ctx.font = 'bold 9px monospace';
                 ctx.fillText(stLabel, jPointX, labelY);
             }

             // PR
             if (m.pStart !== undefined && m.qrsStart !== undefined) {
                 const prMs = (m.qrsStart - m.pStart) * 1000;
                 if (zoomScale > 0.6) drawMeasurement(tToX(m.pStart), tToX(m.qrsStart), yMeas, `PR:${prMs.toFixed(0)}`, color);
             }

             // QRS & QT
             if (m.qrsStart !== undefined && m.qrsEnd !== undefined) {
                 const qrsMs = (m.qrsEnd - m.qrsStart) * 1000;
                 drawMeasurement(tToX(m.qrsStart), tToX(m.qrsEnd), yMeas + 12, `QRS:${qrsMs.toFixed(0)}`, color);
                 
                 if (m.tEnd !== undefined) {
                     const qtMs = (m.tEnd - m.qrsStart) * 1000;
                     drawMeasurement(tToX(m.qrsStart), tToX(m.tEnd), yMeas + 24, `QT:${qtMs.toFixed(0)}`, color);
                 }
             }
           }
        }
      }

      // 4. Cursor Dot
      if (!isStatic) {
        const currentVoltage = getVoltageAtTime(currentTime, lead);
        const penY = rowCenterY - (currentVoltage * effectiveVoltageGain * basePixelsPerMm);
        const penX = startX + relativeCursorX;
        if (penX < startX + colWidth) {
          ctx.fillStyle = COLORS.CURSOR;
          ctx.beginPath();
          ctx.arc(penX, penY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // 5. MANUAL CALIPER OVERLAY
    if (isCaliperMode && dragStart && dragCurrent) {
        ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0); 
        const x1 = dragStart.x;
        const y1 = dragStart.y;
        const x2 = dragCurrent.x;
        const y2 = dragCurrent.y;
        
        const widthPx = Math.abs(x2 - x1);
        const heightPx = Math.abs(y2 - y1);
        
        const timeMs = (widthPx / basePixelsPerMm) / speed * 1000;
        const boxes = widthPx / basePixelsPerMm; 
        const voltageMv = (heightPx / basePixelsPerMm) / gain;
        const heightMm = heightPx / basePixelsPerMm;

        const mainColor = themeMode === 'monitor' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(37, 99, 235, 0.8)';
        const bgColor = themeMode === 'monitor' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), widthPx, heightPx);
        ctx.setLineDash([]);
        
        ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI*2); ctx.fillStyle = mainColor; ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI*2); ctx.stroke();

        const labelText1 = `Time: ${timeMs.toFixed(0)} ms (${boxes.toFixed(1)} bx)`;
        const labelText2 = `Amp:  ${voltageMv.toFixed(2)} mV (${heightMm.toFixed(1)} mm)`;
        
        ctx.font = '12px monospace';
        const m1 = ctx.measureText(labelText1);
        const m2 = ctx.measureText(labelText2);
        const boxW = Math.max(m1.width, m2.width) + 16;
        const boxH = 40;
        
        const tooltipX = x2 + 10;
        const tooltipY = y2 + 10;
        
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = mainColor;
        ctx.fillRect(tooltipX, tooltipY, boxW, boxH);
        ctx.strokeRect(tooltipX, tooltipY, boxW, boxH);
        
        ctx.fillStyle = themeMode === 'monitor' ? '#fff' : '#000';
        ctx.fillText(labelText1, tooltipX + 8, tooltipY + 16);
        ctx.fillText(labelText2, tooltipX + 8, tooltipY + 32);
    }
  }, [dimensions, themeMode, currentCase, isStatic, getVoltageAtTime, showMeasurements, zoomScale, isCaliperMode, dragStart, dragCurrent, speed, gain, renderWidth, renderHeight]);

  const drawCallbackRef = useRef(drawSignal);
  useEffect(() => {
    drawCallbackRef.current = drawSignal;
  }, [drawSignal]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
        if (!isStatic) {
            drawCallbackRef.current(time);
            animationFrameId = requestAnimationFrame(loop);
        }
    };
    if (!isStatic) {
        animationFrameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStatic]);

  useEffect(() => {
      if (isStatic) {
          requestAnimationFrame((t) => drawCallbackRef.current(t));
      }
  }, [drawSignal, isStatic]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}
      className="shadow-inner transition-colors duration-300 select-none bg-transparent"
    >
       <div 
        ref={scrollWrapperRef}
        style={{ 
          width: renderWidth ? `${renderWidth}px` : '100%', 
          height: renderHeight ? `${renderHeight}px` : '100%',
          position: 'relative',
          touchAction: isCaliperMode ? 'none' : 'auto', 
          cursor: isCaliperMode ? 'crosshair' : 'default'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
       >
          <canvas ref={gridCanvasRef} className="block absolute top-0 left-0 z-0 pointer-events-none" />
          <canvas ref={signalCanvasRef} className="block absolute top-0 left-0 z-10 pointer-events-none" />
       </div>
    </div>
  );
};

export default EKGCanvas;