
import React, { useEffect, useRef, useState } from 'react';
import { ScenarioType } from '../types';
import { calculatePressure, getSwallowVariability, getSimulationMetrics } from '../services/simulationPhysics';
import { getPressureRGBArray } from '../utils/colorMap';

interface ManometryCanvasProps {
  scenario: ScenarioType;
  swallowTriggeredAt: number | null; 
  isLive: boolean;
  hideScenarioLabel?: boolean;
}

interface MeasurementBox {
  label: string;
  value: string;
  unit: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const ManometryCanvas: React.FC<ManometryCanvasProps> = ({ 
  scenario, 
  swallowTriggeredAt,
  isLive,
  hideScenarioLabel = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [measurements, setMeasurements] = useState<MeasurementBox[]>([]);
  
  // Rendering constants
  const SPEED = 1; 
  const PROBE_LENGTH = 36; // cm
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Calculate measurement positions
  const cmToY = (cm: number) => (cm / PROBE_LENGTH) * CANVAS_HEIGHT;

  // Update measurements when swallow is triggered
  useEffect(() => {
    if (swallowTriggeredAt) {
      const vars = getSwallowVariability(swallowTriggeredAt);
      const metrics = getSimulationMetrics(scenario, vars);
      
      // Generate measurement boxes based on scenario
      const boxes: MeasurementBox[] = [];
      
      // IRP measurement box (always shown at LES level)
      boxes.push({
        label: '4s IRP',
        value: `${metrics.irp}`,
        unit: 'mmHg',
        x: CANVAS_WIDTH - 180,
        y: cmToY(28),
        width: 90,
        height: 50,
        color: metrics.irp > 15 ? '#ff4444' : '#44ff44'
      });
      
      // DCI box (shown in esophageal body)
      if (scenario === ScenarioType.NORMAL || scenario === ScenarioType.ACHALASIA_TYPE_III) {
        boxes.push({
          label: 'DCI',
          value: `${metrics.dci}`,
          unit: 'mmHg·s·cm',
          x: CANVAS_WIDTH - 200,
          y: cmToY(14),
          width: 120,
          height: 80,
          color: scenario === ScenarioType.ACHALASIA_TYPE_III ? '#ff00ff' : '#00ffff'
        });
      } else if (scenario === ScenarioType.ACHALASIA_TYPE_I) {
        boxes.push({
          label: 'DCI',
          value: '0',
          unit: 'mmHg·s·cm',
          x: CANVAS_WIDTH - 180,
          y: cmToY(16),
          width: 100,
          height: 70,
          color: '#4444ff'
        });
      } else if (scenario === ScenarioType.ACHALASIA_TYPE_II) {
        // Pan-pressurization indicator
        boxes.push({
          label: 'DCI N/A',
          value: 'Pan-eso',
          unit: 'pressurization',
          x: CANVAS_WIDTH - 200,
          y: cmToY(12),
          width: 120,
          height: 100,
          color: '#00ffaa'
        });
      }
      
      // Delay showing measurements
      setTimeout(() => {
        setMeasurements(boxes);
      }, 4000);
      
      // Clear measurements after swallow cycle
      setTimeout(() => {
        setMeasurements([]);
      }, 11000);
    }
  }, [swallowTriggeredAt, scenario]);

  // Helper to draw landmarks and measurement boxes
  const drawOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    const cmPerPixel = height / PROBE_LENGTH;

    // 1. Horizontal Depth Lines (every 5cm)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';

    for (let cm = 5; cm < PROBE_LENGTH; cm += 5) {
      const y = cm * cmPerPixel;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${cm}`, 5, y - 2);
    }
    
    // 2. Vertical Time Lines
    const PX_PER_SEC = 60;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    for (let x = width; x > 0; x -= PX_PER_SEC * 2) {
       ctx.beginPath();
       ctx.moveTo(x, 0);
       ctx.lineTo(x, height);
       ctx.stroke();
    }

    // 3. UES and LES Anatomical Markers
    const uesY = 4 * cmPerPixel;
    const lesY = 31 * cmPerPixel;
    
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    
    // UES marker
    ctx.beginPath(); 
    ctx.moveTo(0, uesY); 
    ctx.lineTo(width, uesY); 
    ctx.stroke();
    ctx.fillStyle = '#fff'; 
    ctx.font = 'bold 11px monospace';
    ctx.fillText("UES", width - 40, uesY - 5);

    // LES marker
    ctx.beginPath(); 
    ctx.moveTo(0, lesY); 
    ctx.lineTo(width, lesY); 
    ctx.stroke();
    ctx.fillText("LES", width - 40, lesY - 5);

    ctx.setLineDash([]);
    
    // 4. Draw measurement boxes
    measurements.forEach(box => {
      // Dashed rectangle
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
      
      // Label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(box.x, box.y - 18, box.width, 18);
      
      // Label text
      ctx.fillStyle = box.color;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(box.label, box.x + 4, box.y - 5);
      
      // Value display (inside or below box)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      const valueText = `${box.value} ${box.unit}`;
      ctx.fillText(valueText, box.x + 4, box.y + box.height + 14);
    });
    
    // 5. Time scale at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.fillText('← 10 sec', 10, height - 5);
  };

  // Effect for Scenario Change (Clear Screen)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setMeasurements([]);
  }, [scenario]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    if (!ctx) return;

    const renderHeight = canvas.height;
    // Create ImageData for a single pixel column (width = SPEED)
    const columnData = ctx.createImageData(SPEED, renderHeight);

    const render = () => {
      if (!isLive) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const now = Date.now();
      let relativeTime = -10; // Default baseline time (negative)
      if (swallowTriggeredAt) {
        relativeTime = (now - swallowTriggeredAt) / 1000;
      }

      // Calculate variability once per frame/swallow context
      const variability = getSwallowVariability(swallowTriggeredAt);

      // 1. Scroll the existing canvas to the left
      ctx.drawImage(canvas, SPEED, 0, canvas.width - SPEED, canvas.height, 0, 0, canvas.width - SPEED, canvas.height);

      // 2. Generate new data for the rightmost strip
      // First compute pressure field, then apply a light vertical smoothing.
      // This makes the heatmap look more like real HRM (diffuse edges, less “polygonal”).
      const pressureField = new Float32Array(renderHeight);
      for (let y = 0; y < renderHeight; y++) {
        // Map pixel Y to cm Depth
        const depth = (y / renderHeight) * PROBE_LENGTH;
        
        // Calculate physics with variability
        pressureField[y] = calculatePressure(scenario, depth, relativeTime, variability);
      }

      for (let y = 0; y < renderHeight; y++) {
        // 5-tap vertical blur kernel: [1, 2, 3, 2, 1] / 9
        const p0 = pressureField[Math.max(0, y - 2)];
        const p1 = pressureField[Math.max(0, y - 1)];
        const p2 = pressureField[y];
        const p3 = pressureField[Math.min(renderHeight - 1, y + 1)];
        const p4 = pressureField[Math.min(renderHeight - 1, y + 2)];
        const smoothPressure = (p0 + 2 * p1 + 3 * p2 + 2 * p3 + p4) / 9;

        const [r, g, b] = getPressureRGBArray(smoothPressure);

        for (let x = 0; x < SPEED; x++) {
          const index = (y * SPEED + x) * 4;
          columnData.data[index] = r;
          columnData.data[index + 1] = g;
          columnData.data[index + 2] = b;
          columnData.data[index + 3] = 255; // Alpha
        }
      }

      // 3. Put the new strip at the right edge
      ctx.putImageData(columnData, canvas.width - SPEED, 0);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [scenario, swallowTriggeredAt, isLive]);

  // Separate effect for the static overlay (Grid + Measurements)
  useEffect(() => {
    const overlayCanvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
    if (overlayCanvas) {
       const ctx = overlayCanvas.getContext('2d');
       if (ctx) drawOverlay(ctx, overlayCanvas.width, overlayCanvas.height);
    }
  }, [measurements]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-crosshair">
      {/* Heatmap Layer */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="absolute top-0 left-0 w-full h-full block"
      />
      
      {/* Grid/Labels Layer */}
      <canvas
        id="overlay-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      
      {/* Scenario Label (hidden in Quiz Mode to avoid giving away the diagnosis) */}
      {!hideScenarioLabel && (
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded text-xs font-mono text-white/80 border border-white/20">
          {scenario.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
};

export default ManometryCanvas;
