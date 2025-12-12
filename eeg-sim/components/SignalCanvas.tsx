import React, { useEffect, useRef } from 'react';
import { BrainState, SimulatedPoint } from '../types';
import { generateDataPoint } from '../utils/signalProcessing';

interface SignalCanvasProps {
  channelId: string;
  brainState: BrainState;
  isRunning: boolean;
  gain: number; // Multiplier for visual amplitude
  speed: number; // Rendering speed
  isTrainingMode: boolean; // Hide clues in training
}

const SignalCanvas: React.FC<SignalCanvasProps> = ({ channelId, brainState, isRunning, gain, speed, isTrainingMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<SimulatedPoint[]>(new Array(400).fill({ value: 0, isPattern: false }));
  const timeRef = useRef<number>(Math.random() * 1000); // Random start time desyncs channels slightly
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!ctx || !canvas) return;

      // Update data
      if (isRunning) {
        timeRef.current += speed;
        const lastVal = dataRef.current[dataRef.current.length - 1].value;
        const newPoint = generateDataPoint(timeRef.current, brainState, channelId, lastVal);
        dataRef.current.push(newPoint);
        dataRef.current.shift(); // Remove oldest
      }

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Grid Lines (simulating paper)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Horizontal mid line
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      // Vertical time lines
      for (let i = 0; i < rect.width; i += 50) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, rect.height);
      }
      ctx.stroke();

      // Draw Main Waveform (Standard Color)
      const sliceWidth = rect.width / (dataRef.current.length - 1);
      
      // We will draw the whole path in Cyan
      ctx.strokeStyle = '#22d3ee'; // Cyan-400
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      let x = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        // Clamp Y to canvas bounds to prevent weird rendering lines
        const rawY = (rect.height / 2) - (dataRef.current[i].value * gain);
        const y = rawY;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [channelId, brainState, isRunning, gain, speed, isTrainingMode]);

  return (
    <div className="flex items-center h-[80px] border-b border-slate-800 bg-black/20">
      <div className="w-16 flex-shrink-0 text-right pr-4 text-xs font-mono font-bold text-slate-400">
        {channelId}
      </div>
      <div className="flex-grow h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default React.memo(SignalCanvas);