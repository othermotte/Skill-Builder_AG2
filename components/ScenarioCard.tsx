
import React from 'react';
import { Scenario } from '../types';
import { MicIcon } from './icons/MicIcon';

interface ScenarioCardProps {
  scenario: Scenario;
  depth?: number;
  onSelect: () => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, depth = 0, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="group relative bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-900 rounded-3xl p-8 transition-all duration-500 flex flex-col h-full overflow-hidden shadow-sm hover:shadow-2xl ease-out cursor-pointer"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="bg-gray-100 text-gray-400 p-2 rounded-full group-hover:bg-black group-hover:text-white transition-colors duration-500">
            <MicIcon className="w-4 h-4" />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Scenario Depth</p>
              <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{depth}</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-gray-200 text-gray-400 bg-white">
            Assessor Studio
          </span>
        </div>
      </div>
      
      <div className="flex flex-col h-full">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tighter leading-none uppercase">
          {scenario.title}
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed font-medium mb-8 whitespace-pre-wrap line-clamp-6 group-hover:line-clamp-none transition-all duration-700">
            {scenario.description}
        </p>
        
        <div className="mt-auto pt-6 flex items-center justify-end border-t border-gray-50">
          <div className="flex items-center gap-2 text-black font-bold text-sm">
               <span>Enter Studio</span>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 transform group-hover:translate-x-1 transition-transform">
                  <path fillRule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
