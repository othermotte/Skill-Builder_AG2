import React from 'react';
import { InteractionMedium } from '../types';
import { MicIcon } from './icons/MicIcon';

interface SessionMediumChoiceProps {
  activityLabel: string;
  onSelect: (medium: InteractionMedium) => void;
  disabled?: boolean;
}

const KeyboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-7 h-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5A2.25 2.25 0 0 1 22.5 9v6A2.25 2.25 0 0 1 20.25 17.25H3.75A2.25 2.25 0 0 1 1.5 15V9a2.25 2.25 0 0 1 2.25-2.25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 10.125h.008v.008H5.25v-.008Zm3.375 0h.008v.008h-.008v-.008Zm3.375 0h.008v.008H12v-.008Zm3.375 0h.008v.008h-.008v-.008Zm3.375 0h.008v.008h-.008v-.008ZM5.25 13.875h.008v.008H5.25v-.008Zm3.375 0h6.75m3.375 0h.008v.008h-.008v-.008Z" />
  </svg>
);
export const SessionMediumChoice: React.FC<SessionMediumChoiceProps> = ({ activityLabel, onSelect, disabled = false }) => (
  <section className="w-full space-y-6" aria-labelledby="medium-choice-heading">
    <div className="text-center space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Choose for this {activityLabel}</p>
      <h2 id="medium-choice-heading" className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">
        How would you like to take part?
      </h2>
      <p className="text-sm font-medium text-gray-500">You can choose again for your next activity.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onSelect('voice')}
        disabled={disabled}
        className="group text-left rounded-3xl border border-gray-200 bg-white p-6 hover:border-indigo-500 hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <MicIcon className="w-6 h-6" />
        </div>
        <p className="text-lg font-black text-gray-900">Voice conversation</p>
        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2">Speak and listen to the tutor. Best somewhere quiet.</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-6">Start with voice</p>
      </button>

      <button
        type="button"
        onClick={() => onSelect('text')}
        disabled={disabled}
        className="group text-left rounded-3xl border border-gray-200 bg-white p-6 hover:border-indigo-500 hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait"
      >
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
          <KeyboardIcon />
        </div>
        <p className="text-lg font-black text-gray-900">Text conversation</p>
        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2">Type your responses and read the tutor’s replies. Suitable for class.</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-6">Start with text</p>
      </button>
    </div>
  </section>
);
