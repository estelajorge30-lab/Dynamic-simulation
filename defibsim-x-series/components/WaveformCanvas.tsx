import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  color: string;
  getValue: () => number;
  speed?: number; // Pixels per frame shift
  lineWidth?: number;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ 
  color, 
  getValue, 
  speed = 3, 
  lineWidth = 2.5
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Function to handle resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        ctx.scale(dpr, dpr);
        
        // Reset buffer size based on new width
        // We keep existing data but trim/expand logic could be added here
        // For simplicity, we just ensure the array doesn't grow infinitely relative to screen
        const maxPoints = Math.ceil(width / speed) + 5;
        if (dataRef.current.length > maxPoints) {
           dataRef.current = dataRef.current.slice(dataRef.current.length - maxPoints);
        }
      }
    });

    resizeObserver.observe(container);

    const render = () => {
      if (!canvas || !container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 1. Get new data point
      const rawValue = getValue();
      
      const maxPoints = Math.ceil(width / speed) + 5;
      dataRef.current.push(rawValue);
      
      if (dataRef.current.length > maxPoints) {
        dataRef.current.shift();
      }

      // 2. Draw
      ctx.clearRect(0, 0, width, height);
      
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const centerY = height / 2;
      // Scale based on height available. 
      // We assume value is roughly -1 to 1.
      // Leave 10% padding on top/bottom
      const scaleY = (height * 0.8) / 2; 

      dataRef.current.forEach((val, i) => {
        const x = i * speed;
        // Invert Y because canvas Y grows downwards
        let y = centerY - (val * scaleY);
        
        // Clamp to prevent drawing out of bounds visual glitch
        if (y < 2) y = 2;
        if (y > height - 2) y = height - 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color, getValue, speed, lineWidth]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default WaveformCanvas;