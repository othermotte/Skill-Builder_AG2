import React, { useState, useEffect } from 'react';
import { Scenario, Skill } from '../types';

export const ScenarioForm: React.FC<{
  scenario: Partial<Scenario>;
  skills: Skill[];
  onSave: (scenario: Partial<Scenario>) => void;
  onCancel: () => void;
}> = ({ scenario, skills, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Scenario>>(scenario);

  useEffect(() => {
    setFormData(scenario);
  }, [scenario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'challenges') {
        setFormData(prev => ({ ...prev, challenges: value.split('\n').filter(l => l.trim() !== '') }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="mb-8 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{formData.id ? 'Refine Laboratory' : 'New Laboratory'}</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Institutional Standards • Verbatim Case</p>
            </div>
            <button onClick={onCancel} className="text-gray-300 hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400" htmlFor="title">Lab Title</label>
                  <input id="title" name="title" value={formData.title || ''} onChange={handleChange} required placeholder="e.g. 1 Innovation vs. fairness"
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold" />
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500" htmlFor="skillId">Primary Mastery Target (AI Probing Focus)</label>
                  <select id="skillId" name="skillId" value={formData.skillId || ''} onChange={handleChange} required
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-bold">
                    <option value="" disabled>Select Probing Target</option>
                    {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400" htmlFor="description">Verbatim Case Description (Learner Facing)</label>
                <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} required rows={6} placeholder="Paste the case description text exactly as provided..."
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all text-sm font-medium leading-relaxed" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500" htmlFor="challenges">Specific Challenges (One per line)</label>
                <textarea id="challenges" name="challenges" value={formData.challenges?.join('\n') || ''} onChange={handleChange} rows={3} placeholder="Challenge 1: What if stock drops?&#10;Challenge 2: What if a key ally leaves?"
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-mono text-xs leading-relaxed" />
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]">Save Laboratory</button>
          </div>
        </form>
      </div>
    </div>
  );
};