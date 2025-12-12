
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CaseData } from '../types';

interface SpirometryGraphProps {
  data: CaseData;
  isPlaying: boolean;
  showPredicted: boolean;
  viewMode: 'flow-volume' | 'volume-time';
}

const SpirometryGraph: React.FC<SpirometryGraphProps> = ({ data, isPlaying, showPredicted, viewMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 400
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Graph Logic Switch ---
    if (viewMode === 'flow-volume') {
      renderFlowVolume(g, innerWidth, innerHeight);
    } else {
      renderVolumeTime(g, innerWidth, innerHeight);
    }

    function renderFlowVolume(group: d3.Selection<SVGGElement, unknown, null, undefined>, w: number, h: number) {
        // Scales
        const xScale = d3.scaleLinear().domain([0, 8]).range([0, w]);
        const yScale = d3.scaleLinear().domain([-6, 14]).range([h, 0]);

        drawGrid(group, xScale, yScale, w, h);
        drawAxes(group, xScale, yScale, w, h, "Volume (L)", "Flow (L/s)");

        // 1. Draw Predicted (Ghost) Loop
        if (showPredicted) {
          const predLine = d3.line<any>()
            .x(d => xScale(d.volume))
            .y(d => yScale(d.flow))
            .curve(d3.curveCatmullRom.alpha(0.5));
          
          group.append("path")
            .attr("d", predLine(data.loops.predictedFlowVolume) || "")
            .attr("fill", "none")
            .attr("stroke", "#94a3b8") // Slate-400
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.5);
            
           group.append("text")
            .attr("x", xScale(data.predicted.fvcPred) + 10)
            .attr("y", yScale(0))
            .text("Pred")
            .attr("fill", "#94a3b8")
            .attr("font-size", "10px");
        }

        // 2. Draw Actual Loop
        const line = d3.line<any>()
          .x(d => xScale(d.volume))
          .y(d => yScale(d.flow))
          .curve(d3.curveCatmullRom.alpha(0.5));

        const path = group.append("path")
          .attr("d", line(data.loops.flowVolume) || "")
          .attr("fill", "rgba(59, 130, 246, 0.05)") // Very light blue fill
          .attr("stroke", "#2563eb") // Blue-600
          .attr("stroke-width", 3)
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round");

        // Animation Dot
        const dot = group.append("circle")
          .attr("r", 6)
          .attr("fill", "#fff")
          .attr("stroke", "#2563eb")
          .attr("stroke-width", 2)
          .attr("opacity", 0);

        setupAnimation(path.node(), dot);
    }

    function renderVolumeTime(group: d3.Selection<SVGGElement, unknown, null, undefined>, w: number, h: number) {
        const xScale = d3.scaleLinear().domain([0, 6]).range([0, w]); // Time 0-6s
        const yScale = d3.scaleLinear().domain([0, 8]).range([h, 0]); // Volume 0-8L

        drawGrid(group, xScale, yScale, w, h);
        drawAxes(group, xScale, yScale, w, h, "Time (s)", "Volume (L)");

        const line = d3.line<any>()
          .x(d => xScale(d.time || 0))
          .y(d => yScale(d.volume))
          .curve(d3.curveMonotoneX); // Time curves are monotonic

        // Draw Actual
        const path = group.append("path")
          .attr("d", line(data.loops.volumeTime) || "")
          .attr("fill", "none")
          .attr("stroke", "#2563eb")
          .attr("stroke-width", 3);

        // Mark FEV1
        const fev1Point = data.loops.volumeTime.find(p => p.time && p.time >= 1.0);
        if (fev1Point) {
            group.append("line")
                .attr("x1", xScale(1))
                .attr("x2", xScale(1))
                .attr("y1", yScale(0))
                .attr("y2", yScale(fev1Point.volume))
                .attr("stroke", "#ec4899")
                .attr("stroke-dasharray", "4,2");
            
            group.append("circle")
                .attr("cx", xScale(1))
                .attr("cy", yScale(fev1Point.volume))
                .attr("r", 4)
                .attr("fill", "#ec4899");
                
            group.append("text")
                .attr("x", xScale(1) + 10)
                .attr("y", yScale(fev1Point.volume))
                .text("FEV1")
                .attr("fill", "#ec4899")
                .attr("font-size", "11px")
                .attr("font-weight", "bold");
        }
        
        // FVC line
        group.append("line")
            .attr("x1", 0)
            .attr("x2", w)
            .attr("y1", yScale(data.actual.fvc))
            .attr("y2", yScale(data.actual.fvc))
            .attr("stroke", "#2563eb")
            .attr("stroke-opacity", 0.3)
            .attr("stroke-dasharray", "2,2");
            
        group.append("text")
            .attr("x", w - 30)
            .attr("y", yScale(data.actual.fvc) - 5)
            .text("FVC")
            .attr("fill", "#2563eb")
            .attr("opacity", 0.7)
            .attr("font-size", "11px");

        // Animation Dot
        const dot = group.append("circle")
          .attr("r", 6)
          .attr("fill", "#fff")
          .attr("stroke", "#2563eb")
          .attr("stroke-width", 2)
          .attr("opacity", 0);

        setupAnimation(path.node(), dot);
    }

    function drawGrid(group: any, x: any, y: any, w: number, h: number) {
        group.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(-h).tickFormat(() => ""))
            .attr("opacity", 0.05);
        
        group.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(10).tickSize(-w).tickFormat(() => ""))
            .attr("opacity", 0.05);
            
        // Zero lines
        group.append("line")
            .attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0))
            .attr("stroke", "#64748b").attr("stroke-width", 1);
        group.append("line")
            .attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", h)
            .attr("stroke", "#64748b").attr("stroke-width", 1);
    }

    function drawAxes(group: any, x: any, y: any, w: number, h: number, xLabel: string, yLabel: string) {
        group.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x)).attr("font-family", "sans-serif").attr("color", "#64748b");
        group.append("g").call(d3.axisLeft(y)).attr("font-family", "sans-serif").attr("color", "#64748b");
        
        group.append("text").attr("x", w/2).attr("y", h + 35).attr("text-anchor", "middle").text(xLabel).attr("fill", "#475569").attr("font-weight", "500");
        group.append("text").attr("transform", "rotate(-90)").attr("y", -40).attr("x", -h/2).attr("text-anchor", "middle").text(yLabel).attr("fill", "#475569").attr("font-weight", "500");
    }

    function setupAnimation(pathNode: any, dot: any) {
        if (!pathNode) return;
        const totalLength = pathNode.getTotalLength();

        const animate = () => {
          if (!isPlaying) return;
          progressRef.current += 0.008; // speed
          if (progressRef.current > 1) progressRef.current = 0;

          const p = pathNode.getPointAtLength(progressRef.current * totalLength);
          dot.attr("cx", p.x).attr("cy", p.y).attr("opacity", 1);
          animationRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
            // reset
            progressRef.current = 0;
            dot.attr("opacity", 0);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

  }, [data, dimensions, isPlaying, showPredicted, viewMode, margin.left, margin.top, margin.right, margin.bottom]);

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-xl relative">
      <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
};

export default SpirometryGraph;
