import React, { useState } from 'react';
import { MicroSkill, SkillSnapshot } from '../types';

interface SkillSnapshotViewProps {
  microSkill: MicroSkill;
  snapshot: SkillSnapshot;
  reason: string;
  onStartPractice: () => void;
  onPause: () => void;
}

export const SkillSnapshotView: React.FC<SkillSnapshotViewProps> = ({ microSkill, snapshot, reason, onStartPractice, onPause }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStart = () => {
    setIsTransitioning(true);
    // Add a slight delay to ensure UI feels responsive to the loading state
    setTimeout(() => {
        onStartPractice();
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="mb-16 text-center space-y-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
          Practice Briefing
        </span>
        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 leading-none">
          Micro-Skill <span className="text-indigo-500">Tutorial</span>.
        </h2>
      </header>

      <div className="space-y-12">
        {/* Field: Micro-skill */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Micro-skill</p>
          <h3 className="text-2xl font-black text-gray-900 leading-tight">
            {microSkill.label}
          </h3>
        </div>

        {/* Field: Why this now - No hardcoded quotes here */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Why this now</p>
          <p className="text-gray-600 text-lg font-medium leading-relaxed italic">
            {reason}
          </p>
        </div>

        {/* Field: One way to start */}
        <div className="space-y-4 border-t border-gray-100 pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">One way to start (in your own words)</p>
          <div className="flex flex-wrap gap-3">
              {snapshot.starterStems.map((stem, i) => (
                  <div key={i} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-base font-bold text-gray-900 italic">"{stem}"</p>
                  </div>
              ))}
          </div>
        </div>

        {/* Field: Watch for this */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Watch for this</p>
          <p className="text-lg font-bold text-gray-700 leading-snug">
            {snapshot.watchFor}
          </p>
        </div>

        {/* Field: Success Indicators */}
        <div className="space-y-4 border-t border-gray-100 pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">You’re doing it well when:</p>
          <ul className="space-y-3">
            {snapshot.successIndicators.map((indicator, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2"></div>
                <span className="text-sm font-bold text-gray-800 leading-tight">{indicator}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="mt-24 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center text-center space-y-6 w-full">
          {isTransitioning ? (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="text-center">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Setting up your first micro-challenge...</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {microSkill.label} • {microSkill.cue}
                    </p>
                </div>
            </div>
          ) : (
            <>
              <button 
                onClick={handleStart} 
                className="w-full md:w-auto bg-black text-white hover:bg-indigo-600 py-6 px-16 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
              >
                <span>BEGIN TUTORIAL</span>
              </button>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Next: you’ll practise this micro-skill in a short guided tutorial.
                </p>
              </div>
            </>
          )}
        </div>
        
        {!isTransitioning && (
            <button 
              onClick={onPause} 
              className="text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-900 transition-colors pt-8"
            >
              Pause Practice
            </button>
        )}
      </div>
    </div>
  );
};