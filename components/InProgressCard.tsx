import React from 'react';
import { PracticeSession, Scenario } from '../types';

interface InProgressCardProps {
  session: PracticeSession;
  scenario: Scenario;
  onContinue: () => void;
  onDiscard: () => void;
}

export const InProgressCard: React.FC<InProgressCardProps> = ({ session, scenario, onContinue, onDiscard }) => {
  const lastTurn = session.transcript[session.transcript.length - 1];
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-sm">
      {/* Subtle active stripe */}
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
      
      <div className="flex-grow pl-2">
        <div className="flex items-baseline gap-3 mb-1">
            <h4 className="text-lg font-bold text-gray-900">{scenario.title}</h4>
            <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">In Progress</span>
        </div>
        
        <p className="text-xs text-gray-400 mb-4 font-mono">
          Last saved: {new Date(session.timestamp).toLocaleString()}
        </p>
        
        {lastTurn && (
          <div className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3 py-1">
            &ldquo;{lastTurn.text.length > 100 ? `${lastTurn.text.substring(0, 100)}...` : lastTurn.text}&rdquo;
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex gap-3 w-full sm:w-auto">
        <button 
          onClick={onContinue} 
          className="flex-1 sm:flex-none bg-black text-white hover:bg-gray-800 font-medium py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
        >
          Continue
        </button>
        <button 
          onClick={onDiscard} 
          className="flex-1 sm:flex-none bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-medium py-2 px-4 rounded-xl text-sm transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
};