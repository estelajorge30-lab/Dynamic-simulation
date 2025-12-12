
import React from 'react';
import { getLegendGradient } from '../utils/colorMap';

const PressureLegend: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-between h-full py-4 pl-2 select-none">
      <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">mmHg</div>
      
      {/* Gradient Bar */}
      <div className="relative flex-1 w-4 rounded-full overflow-hidden border border-gray-600 shadow-inner bg-black">
        <div 
          className="absolute inset-0 w-full h-full" 
          style={{ background: getLegendGradient() }} 
        />
      </div>

      {/* Scale Labels */}
      <div className="flex flex-col justify-between text-[9px] text-gray-400 font-mono mt-2 h-[260px] text-right w-10">
        <span className="text-pink-300 font-bold">250+</span>
        <span className="text-pink-400">200</span>
        <span className="text-red-400 font-semibold">150</span>
        <span className="text-orange-400">120</span>
        <span className="text-orange-300">90</span>
        <span className="text-yellow-300 font-semibold">75</span>
        <span className="text-lime-300">60</span>
        <span className="text-green-400">45</span>
        <span className="text-emerald-300">35</span>
        <span className="text-cyan-400">25</span>
        <span className="text-blue-400">15</span>
        <span className="text-blue-800">0</span>
      </div>
    </div>
  );
};

export default PressureLegend;
