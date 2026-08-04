import React from 'react';
import { InteractionMedium, Scenario } from '../types';
import { SessionMediumChoice } from './SessionMediumChoice';

interface AssessmentLaunchPageProps {
  scenario: Scenario;
  onSelectMedium: (medium: InteractionMedium) => void;
  onBack: () => void;
}

export const AssessmentLaunchPage: React.FC<AssessmentLaunchPageProps> = ({ scenario, onSelectMedium, onBack }) => (
  <div className="max-w-3xl mx-auto w-full px-6 py-10 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-12"
    >
      <span aria-hidden="true">←</span>
      Back to scenarios
    </button>

    <header className="text-center space-y-5 mb-12">
      <span className="inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
        Assessment lab
      </span>
      <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-900 uppercase leading-none">
        {scenario.title}
      </h1>
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 md:p-8 text-left">
        <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
          {scenario.description}
        </p>
      </div>
    </header>

    <SessionMediumChoice activityLabel="assessment" onSelect={onSelectMedium} />
  </div>
);
