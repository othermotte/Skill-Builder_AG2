
import React, { useState } from 'react';

interface ReflectionViewProps {
  analysis: {
      detected: boolean;
      evidence: string;
      impact: string;
      adjustment: string;
  };
  onNextStep: (choice: 'repeat' | 'different_micro' | 'different_skill' | 'new_scenario') => void;
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({ analysis, onNextStep }) => {
  const [confidence, setConfidence] = useState(3);
  const [usefulness, setUsefulness] = useState(3);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-12 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 px-2 py-1 bg-indigo-50 rounded border border-indigo-100">
              Practice Reflection
          </span>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 leading-tight">
              Progress <span className="text-indigo-500">Signal</span>.
          </h2>
      </div>

      <div className="space-y-8 mb-12">
          <div className="p-8 bg-white border border-gray-100 rounded-[3rem] shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${analysis.detected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-sm font-black uppercase tracking-widest text-gray-900">
                      {analysis.detected ? 'Micro-Skill Detected' : 'Micro-Skill Not Seen'}
                  </span>
              </div>
              
              <div className="space-y-4">
                  <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Evidence</p>
                      <p className="text-base font-medium text-gray-700 italic">"{analysis.evidence}"</p>
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Observed Impact</p>
                      <p className="text-base font-medium text-gray-700">{analysis.impact}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Adjustment for next time</p>
                      <p className="text-sm font-bold text-indigo-600 uppercase tracking-tight">{analysis.adjustment}</p>
                  </div>
              </div>
          </div>

          <div className="p-8 bg-gray-50 border border-gray-100 rounded-[3rem] space-y-8">
              <h4 className="text-xl font-black tracking-tight text-gray-900">Self-Rating</h4>
              
              <div className="space-y-6">
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-gray-400">Confidence using this skill</label>
                          <span className="text-xs font-black">{confidence}/5</span>
                      </div>
                      <input type="range" min="1" max="5" value={confidence} onChange={(e) => setConfidence(parseInt(e.target.value))} className="w-full accent-black" />
                  </div>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-gray-400">Usefulness of this lab</label>
                          <span className="text-xs font-black">{usefulness}/5</span>
                      </div>
                      <input type="range" min="1" max="5" value={usefulness} onChange={(e) => setUsefulness(parseInt(e.target.value))} className="w-full accent-black" />
                  </div>
              </div>
          </div>
      </div>

      <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Next Step Decision</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => onNextStep('repeat')} className="p-6 bg-white border border-gray-200 hover:border-black rounded-2xl text-left transition-all">
                  <p className="text-[10px] font-black uppercase text-indigo-500 mb-1">Reinforce</p>
                  <p className="text-sm font-bold text-gray-900">Repeat same Micro-Skill (New Variant)</p>
              </button>
              <button onClick={() => onNextStep('different_micro')} className="p-6 bg-white border border-gray-200 hover:border-black rounded-2xl text-left transition-all">
                  <p className="text-[10px] font-black uppercase text-indigo-500 mb-1">Expand</p>
                  <p className="text-sm font-bold text-gray-900">Choose different Micro-Skill in same Skill</p>
              </button>
              <button onClick={() => onNextStep('different_skill')} className="p-6 bg-white border border-gray-200 hover:border-black rounded-2xl text-left transition-all">
                  <p className="text-[10px] font-black uppercase text-indigo-500 mb-1">Pivot</p>
                  <p className="text-sm font-bold text-gray-900">Choose different Skill Group</p>
              </button>
              <button onClick={() => onNextStep('new_scenario')} className="p-6 bg-white border border-gray-200 hover:border-black rounded-2xl text-left transition-all">
                  <p className="text-[10px] font-black uppercase text-indigo-500 mb-1">Reset</p>
                  <p className="text-sm font-bold text-gray-900">Choose a new Assessor Lab</p>
              </button>
          </div>
      </div>
    </div>
  );
};
