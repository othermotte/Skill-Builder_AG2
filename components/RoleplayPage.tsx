
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Scenario, Skill, PracticeSession, User, MicroSkill, SkillSnapshot } from '../types';
import { getFeedbackForTranscript } from '../services/geminiService';
import { MicIcon } from './icons/MicIcon';
import { useLiveSession } from '../hooks/useLiveSession';
import { getMicroSkillTutorInstruction } from '../services/firebase';

interface RoleplayPageProps {
  scenario: Scenario;
  skills: Skill[];
  currentUser: User;
  onSessionEnd: (sessionResult: PracticeSession, isDiagnostic?: boolean, isCompleted?: boolean) => void;
  onBackToDashboard: () => void;
  practiceMode?: {
    microSkill: MicroSkill;
    cuePrompt: string;
    snapshot?: SkillSnapshot;
  };
  mode?: 'diagnostic' | 'tutorial';
}

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

export const RoleplayPage: React.FC<RoleplayPageProps> = ({
  scenario, skills, currentUser,
  onSessionEnd, onBackToDashboard, practiceMode, mode = 'diagnostic'
}) => {
  const [showFeedbackConfirm, setShowFeedbackConfirm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiConcluded, setIsAiConcluded] = useState(false);
  const [tutorInstruction, setTutorInstruction] = useState<string | null>(null);

  const targetSkill = skills.find(s => s.id === scenario.skillId);

  useEffect(() => {
    if (mode === 'tutorial' && practiceMode) {
      getMicroSkillTutorInstruction().then(baseInstruction => {
        const inputData = `
### SESSION INPUT DATA (CONFIDENTIAL):
- Micro-skill label: ${practiceMode.microSkill.label}
- Success cue: ${practiceMode.microSkill.cue || 'None'}
- Common trap: ${practiceMode.microSkill.trap || 'None'}
- Criteria: ${practiceMode.microSkill.criteria?.join(', ') || 'Not specified'}
- Evidence context: ${practiceMode.cuePrompt || 'N/A'}
        `;

        const enriched = baseInstruction
          .replace('[micro-skill label]', practiceMode.microSkill.label)
          + "\n\n" + inputData;

        setTutorInstruction(enriched);
      });
    }
  }, [mode, practiceMode]);

  const diagnosticInstruction = `
    ### DIAGNOSTIC MODE: ASSESSOR PERSONA
    Probe deeply into the participant’s thinking in a structured, neutral way. Collect evidence of reasoning.
    ${targetSkill ? `Prioritize evidence for: "${targetSkill.name}".` : ""}
    ${scenario.description}
  `;

  const combinedInstruction = mode === 'tutorial' ? (tutorInstruction || 'You are a supportive leadership tutor.') : diagnosticInstruction;

  const {
    status,
    connect,
    disconnect,
    volume,
    streamingText,
    transcript
  } = useLiveSession({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY as string,
    voiceName: 'Kore',
    systemInstruction: combinedInstruction
  });

  useEffect(() => {
    if (transcript.length > 0) {
      const lastEntry = transcript[transcript.length - 1];
      if (lastEntry.speaker === 'ai' && (
        lastEntry.text.toLowerCase().includes('concludes our session') ||
        lastEntry.text.toLowerCase().includes('concludes this session') ||
        lastEntry.text.toLowerCase().includes('concludes our tutorial session') ||
        lastEntry.text.toLowerCase().includes('ready to apply this in the field')
      )) {
        setIsAiConcluded(true);
      }
    }
  }, [transcript]);

  const handleStart = () => {
    setShowFeedbackConfirm(false);
    setIsAiConcluded(false);
    connect();
  };

  const handleStop = async () => {
    const finalTranscript = await disconnect();
    if (finalTranscript.length === 0 && !streamingText) {
      onBackToDashboard();
    } else {
      setShowFeedbackConfirm(true);
    }
  };

  const handleGetFeedback = async () => {
    setIsAnalyzing(true);
    setShowFeedbackConfirm(false);

    try {
      const response = await getFeedbackForTranscript(scenario, transcript, targetSkill?.name || 'Leadership', 'English');

      onSessionEnd({
        id: '',
        userId: currentUser.id,
        scenarioId: scenario.id,
        transcript: transcript,
        feedback: response.text,
        timestamp: new Date().toISOString(),
        status: 'completed'
      }, mode === 'diagnostic', isAiConcluded);
    } catch (e) {
      onSessionEnd({
        id: '',
        userId: currentUser.id,
        scenarioId: scenario.id,
        transcript: transcript,
        feedback: JSON.stringify({ error: true }),
        timestamp: new Date().toISOString(),
        status: 'completed'
      }, mode === 'diagnostic', isAiConcluded);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDiscardSession = () => {
    onBackToDashboard();
  };

  /**
   * CENTRALIZED INSTRUCTION LOGIC (SINGLE RULE)
   * Ensures only one primary instruction is visible at a time.
   */
  let instructionAreaText = '';
  let belowMicText = '';
  let isNudge = false;

  const lastEntry = transcript[transcript.length - 1];

  if (isAnalyzing) {
    instructionAreaText = 'Analyzing capability...';
    belowMicText = 'Processing...';
  } else if (status === 'error') {
    instructionAreaText = 'Connection error. Check mic access.';
    belowMicText = 'Tap to retry';
  } else if (status === 'connecting') {
    instructionAreaText = "Warming up the studio...";
    belowMicText = 'Connecting...';
  } else if (status === 'active') {
    if (isAiConcluded) {
      instructionAreaText = "Session concluded. Tap to finish.";
      belowMicText = 'Finalize Rep';
    } else if (streamingText) {
      // Show real-time transcription (yours or AI's)
      instructionAreaText = streamingText;
      belowMicText = 'Voice Active';
    } else if (lastEntry && lastEntry.speaker === 'ai') {
      // PERSIST THE LAST AI MESSAGE while learner ponders
      // This is crucial for keeping the challenge visible.
      instructionAreaText = lastEntry.text;
      belowMicText = 'Voice Active';
    } else if (transcript.length === 0) {
      instructionAreaText = "Tell the tutor when you’re ready.";
      belowMicText = 'Voice Active';
      isNudge = true;
    } else {
      // Fallback: If learner just spoke and AI hasn't started yet, 
      // show "Voice Active" while waiting for AI processing.
      belowMicText = 'Voice Active';
    }
  } else {
    // Idle state
    belowMicText = "Tap to start, then speak to tell the tutor you’re ready.";
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white overflow-hidden relative">

      <header className="flex-none h-16 px-4 md:px-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
        <button onClick={onBackToDashboard} className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
          <ArrowLeftIcon />
          <span className="text-sm font-medium">Return to Dashboard</span>
        </button>
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${status === 'active' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider">{mode === 'tutorial' ? 'Micro-Skill Practice' : 'Assessor Lab'}</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        <div className="max-w-xl w-full flex flex-col items-center gap-8">
          <div className="text-center space-y-4 w-full">
            {mode === 'tutorial' ? (
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Micro-skill</p>
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                  {practiceMode?.microSkill.label}
                </h1>
              </div>
            ) : (
              <div className="space-y-6 mb-6 text-left">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Diagnostic Scenario</p>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight uppercase">
                    {scenario.title}
                  </h1>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-inner">
                  <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                    {scenario.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center w-full">
            {/* Main Single Instruction Area - Persists the AI message while pondering */}
            <div className="h-24 w-full flex items-center justify-center mb-10 relative">
              <p className={`text-lg font-bold text-center transition-all px-8 ${isNudge ? 'text-indigo-500 italic' : 'text-gray-900'}`}>
                {instructionAreaText}
              </p>
            </div>

            <div className="relative group">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 ${isAiConcluded ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-50'}`}
                style={{
                  opacity: (status === 'active' || status === 'connecting') ? (isAiConcluded ? 0.3 : 0.6) : 0,
                  transform: `scale(${1 + (volume / 80) + (isAiConcluded ? 0.2 : 0)})`
                }}
              />
              <div className="flex flex-col items-center gap-6">
                <button
                  onClick={(status === 'idle' || status === 'error') ? handleStart : handleStop}
                  disabled={status === 'connecting' || isAnalyzing}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all z-10 shadow-xl active:scale-[0.9] ${status === 'active' ? (isAiConcluded ? 'bg-indigo-600 animate-bounce shadow-indigo-200 shadow-2xl' : 'bg-indigo-600') : 'bg-black'} text-white disabled:opacity-50`}
                >
                  {(status === 'active' || status === 'connecting') ? <div className="w-8 h-8 bg-white rounded-sm" /> : <MicIcon className="w-10 h-10" />}
                </button>

                <div className="flex flex-col items-center text-center">
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed max-w-[240px] ${isAiConcluded ? 'text-indigo-600 animate-pulse' : 'text-gray-400'}`}>
                    {belowMicText}
                  </span>
                  {status === 'active' && !isAiConcluded && (
                    <span className="text-[9px] text-gray-300 font-bold mt-2 uppercase tracking-widest">Tap square to stop</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showFeedbackConfirm && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-sm w-full border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{mode === 'tutorial' ? 'Sync Practice' : 'Sync Evidence'}</h3>
            <p className="text-gray-500 mb-8 text-sm">Session recording stopped. Would you like to analyze this interaction for your capability profile?</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleGetFeedback} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm">Analyze Interaction</button>
              <button onClick={handleDiscardSession} className="w-full text-gray-400 py-4 font-bold text-xs">Discard Interaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
