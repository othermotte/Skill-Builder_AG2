import React, { useState } from 'react';
import { PracticeSession, Scenario, Skill, PracticeAttempt, SkillLibrary, User } from '../types';
import { LearningRecordView } from './LearningRecordView';

interface HistoryPageProps {
  practiceSessions: PracticeSession[];
  scenarios: Scenario[];
  skills: Skill[];
  practiceAttempts: PracticeAttempt[];
  appLibrary: SkillLibrary | null;
  currentUser: User;
  onDeleteItem: (sessionId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ practiceSessions, scenarios, skills, practiceAttempts, appLibrary, currentUser, onDeleteItem }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const completedSessions = [...practiceSessions]
    .filter(p => p.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const selectedSession = completedSessions.find(session => session.id === selectedSessionId);
  const selectedScenario = selectedSession ? scenarios.find(scenario => scenario.id === selectedSession.scenarioId) : null;

  if (selectedSession && selectedScenario) {
    return (
      <LearningRecordView
        currentUser={currentUser}
        session={selectedSession}
        scenario={selectedScenario}
        skills={skills}
        practiceAttempts={practiceAttempts}
        appLibrary={appLibrary}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">History</h2>
        <p className="text-gray-500 text-sm">Review your past sessions and feedback.</p>
      </div>

      {completedSessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
          <p className="text-gray-500">You haven't completed any sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedSessions.map(session => {
            const scenario = scenarios.find(s => s.id === session.scenarioId);
            if (!scenario) return null;
            // Fix: Removed reference to non-existent scenario.skillId as scenarios assess multiple skills

            return (
              <div key={session.id} className="bg-white hover:bg-gray-50 transition-colors rounded-xl p-5 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group shadow-sm">
                <div className="flex-grow space-y-2">
                  <div className="flex items-baseline justify-between sm:justify-start gap-4">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-black transition-colors">{scenario.title}</h3>
                    <span className="text-xs text-gray-400 font-mono">{new Date(session.timestamp).toLocaleDateString()}</span>
                  </div>

                  {(() => {
                    const sessionAttempts = practiceAttempts.filter(a => a.parentSessionId === session.id);
                    const completedAttempts = sessionAttempts.filter(attempt => !!attempt.completedAt);
                    let rubricStatus: 'valid' | 'invalid' | 'unavailable' = 'unavailable';

                    if (session.feedback) {
                      try {
                        const feedback = JSON.parse(session.feedback);
                        rubricStatus = feedback?.validity?.is_valid === true ? 'valid' : 'invalid';
                      } catch {
                        rubricStatus = 'unavailable';
                      }
                    }

                    return (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border bg-gray-50 text-gray-600 border-gray-200">
                          {completedAttempts.length} completed micro-{completedAttempts.length === 1 ? 'practice' : 'practices'}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border ${rubricStatus === 'valid' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {rubricStatus === 'valid' ? 'Formative rubric included' : rubricStatus === 'invalid' ? 'Assessment needs more evidence' : 'Rubric unavailable'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-shrink-0 flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                  <button
                    onClick={() => setSelectedSessionId(session.id)}
                    className="flex-1 sm:flex-none bg-black text-white hover:bg-gray-800 font-medium py-2 px-4 rounded-lg text-xs transition-colors shadow-sm"
                  >
                    View learning record
                  </button>
                  <button
                    onClick={() => onDeleteItem(session.id)}
                    className="flex-1 sm:flex-none bg-transparent text-gray-500 hover:text-rose-600 hover:bg-rose-50 font-medium py-2 px-4 rounded-lg text-xs transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
