
import React, { useState, useMemo, useEffect } from 'react';
import { PracticeSession, Scenario, Skill, FeedbackAnalysis, SkillLibrary, PracticeAttempt } from '../types';
import { getMicroSkillSuggestions } from '../services/geminiService';
import { getSkillLibrary, updateSessionRating, savePracticeSession } from '../services/firebase';

interface FeedbackPageProps {
    practiceSession: PracticeSession;
    scenario: Scenario;
    skills: Skill[];
    practiceAttempts?: PracticeAttempt[];
    onBackToDashboard: () => void;
    onViewHistory: () => void;
    onBeginPracticeLoop: (groupId: string, microSkillId: string, reason: string) => void;
    initialView?: 'feedback' | 'choose_focus';
    onSessionUpdate?: (session: PracticeSession) => void;
}

const ScoreBar: React.FC<{ score: number; max: number; name: string; justification: string }> = ({ score, max, name, justification }) => {
    const percentage = (score / max) * 100;
    return (
        <div className="group space-y-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-gray-900 transition-all duration-300">
            <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">{name}</span>
                <span className="text-2xl font-black text-gray-900">{score}<span className="text-gray-300">/5</span></span>
            </div>
            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
                {justification}
            </p>
        </div>
    );
};

const StarRating: React.FC<{ initialRating?: number; onRate: (rating: number) => void }> = ({ initialRating = 0, onRate }) => {
    const [rating, setRating] = useState(initialRating);
    const [hover, setHover] = useState(0);

    const handleRate = (r: number) => {
        setRating(r);
        onRate(r);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rate your Skill Builder Experience</p>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`text-2xl transition-all duration-200 ${star <= (hover || rating) ? 'text-indigo-500 scale-125' : 'text-gray-200'
                            }`}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                    >
                        ★
                    </button>
                ))}
            </div>
            {rating > 0 && <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-in fade-in">Thank you for your rating!</span>}
        </div>
    );
};

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ practiceSession, scenario, skills, practiceAttempts, onBackToDashboard, onViewHistory, onBeginPracticeLoop, initialView = 'feedback', onSessionUpdate }) => {
    const [showTranscript, setShowTranscript] = useState(false);
    const [viewState, setViewState] = useState<'feedback' | 'choose_focus'>(initialView);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [library, setLibrary] = useState<SkillLibrary | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Sync viewState if initialView changes (e.g., navigating from history vs session end)
    useEffect(() => {
        setViewState(initialView);
    }, [initialView, practiceSession.id]);

    const feedback: FeedbackAnalysis | null = useMemo(() => {
        if (!practiceSession.feedback) return null;
        try {
            const parsed = JSON.parse(practiceSession.feedback);
            if (parsed.error) return null;
            return parsed;
        } catch (e) {
            console.error("Failed to parse feedback JSON", e);
            return null;
        }
    }, [practiceSession.feedback]);

    useEffect(() => {
        if (feedback && viewState === 'choose_focus') {
            const fetchEverything = async () => {
                if (practiceSession.suggestedFocusOptions) {
                    try {
                        setSuggestions(JSON.parse(practiceSession.suggestedFocusOptions));
                        const lib = await getSkillLibrary();
                        setLibrary(lib);
                        return;
                    } catch (e) {
                        console.warn("Invalid cached suggestions", e);
                    }
                }

                setIsLoadingSuggestions(true);
                setErrorMsg(null);
                try {
                    const [lib, sug] = await Promise.all([
                        getSkillLibrary(),
                        getMicroSkillSuggestions(practiceSession.transcript, feedback)
                    ]);
                    setLibrary(lib);
                    setSuggestions(sug);

                    const updatedSession = { ...practiceSession, suggestedFocusOptions: JSON.stringify(sug) };
                    savePracticeSession(updatedSession).catch(e => console.error("Failed to cache suggestions", e));
                    if (onSessionUpdate) onSessionUpdate(updatedSession);
                } catch (e) {
                    setErrorMsg("Connection error while generating suggestions.");
                } finally {
                    setIsLoadingSuggestions(false);
                }
            };

            if (suggestions.length === 0) {
                fetchEverything();
            }
        }
    }, [feedback, viewState, practiceSession.transcript, practiceSession.suggestedFocusOptions, suggestions.length, onSessionUpdate]);

    const handleGenerateNewSuggestions = async () => {
        setIsLoadingSuggestions(true);
        setErrorMsg(null);
        try {
            const sug = await getMicroSkillSuggestions(practiceSession.transcript, feedback!);
            setSuggestions(sug);

            const updatedSession = { ...practiceSession, suggestedFocusOptions: JSON.stringify(sug) };
            savePracticeSession(updatedSession).catch(e => console.error("Failed to cache suggestions", e));
            if (onSessionUpdate) onSessionUpdate(updatedSession);

        } catch (e) {
            setErrorMsg("Connection error while generating new suggestions.");
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleRate = (r: number) => {
        updateSessionRating(practiceSession.id, r);
    };

    const handleSelectFocus = (opt: any) => {
        setSelectedId(opt.microSkillId);
        onBeginPracticeLoop(opt.groupId, opt.microSkillId, opt.reason);
    };

    if (!feedback) {
        return (
            <div className="max-w-3xl mx-auto p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black mb-4">Assessment Loading...</h2>
                <button onClick={onBackToDashboard} className="bg-black text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">Return to Dashboard</button>
            </div>
        );
    }

    const isValid = feedback.validity?.is_valid ?? false;

    const scoreItems = useMemo(() => {
        if (!feedback.scores) return [];
        return Object.entries(feedback.scores).map(([id, val]) => {
            const skillObj = skills.find(s => s.id === id);
            return {
                id,
                name: skillObj?.name || id.replace(/_/g, ' ').toUpperCase(),
                ...(val as any)
            };
        }).filter(item => item.name);
    }, [feedback.scores, skills]);

    if (viewState === 'choose_focus') {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 min-h-screen">
                <div className="mb-16 space-y-4">
                    <div className="flex justify-between items-center mb-10">
                        <button onClick={onBackToDashboard} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 hover:text-black transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Return to Dashboard
                        </button>
                        <button onClick={onViewHistory} className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            View Practice History
                        </button>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 leading-none">
                        Choose Your <span className="text-indigo-500">Focus</span>.
                    </h2>
                    <p className="text-gray-500 text-lg font-medium">Choose a micro-skill to practise next. Complete all suggested targets to unlock new recommendations.</p>
                </div>

                {isLoadingSuggestions ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest animate-pulse">Analyzing transcripts for micro-gaps...</p>
                    </div>
                ) : errorMsg ? (
                    <p className="text-rose-500 text-center font-bold bg-rose-50 p-8 rounded-3xl border border-rose-100">{errorMsg}</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            {suggestions.map((opt, i) => {
                                const isProcessing = selectedId === opt.microSkillId;
                                const isOtherSelected = !!selectedId && !isProcessing;

                                const reasonParts = opt.reason.split('\n').filter(Boolean);
                                const diagnosis = reasonParts[0];
                                const evidence = reasonParts.slice(1).join('\n');

                                const hasCompleted = practiceAttempts?.some(
                                    a => a.parentSessionId === practiceSession.id &&
                                        a.microSkillId === opt.microSkillId &&
                                        a.completedAt
                                );

                                return (
                                    <button
                                        key={i}
                                        disabled={!!selectedId}
                                        onClick={() => handleSelectFocus(opt)}
                                        className={`text-left group bg-white border rounded-[3rem] p-10 transition-all duration-500 flex flex-col h-full ring-offset-4 relative ${isProcessing ? 'border-indigo-500 ring-4 ring-indigo-50 scale-[0.98]' :
                                            isOtherSelected ? 'opacity-40 grayscale pointer-events-none' :
                                                hasCompleted ? 'border-emerald-100 bg-emerald-50/10 hover:border-emerald-300' :
                                                    'border-gray-100 hover:border-black hover:ring-2 hover:ring-indigo-50 shadow-sm hover:shadow-2xl'
                                            }`}
                                    >
                                        <div className="mb-4">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                {opt.groupLabel}
                                            </span>
                                        </div>

                                        <div className="absolute top-10 right-10 flex flex-col items-end gap-3">
                                            {hasCompleted && (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                                    Completed
                                                </span>
                                            )}
                                            <span className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${isProcessing ? 'bg-indigo-500 border-indigo-500 text-white' : hasCompleted ? 'border-emerald-200 text-emerald-500 bg-emerald-50' : 'border-gray-100 text-gray-400 group-hover:bg-black group-hover:text-white group-hover:border-black'}`}>
                                                {isProcessing ? (
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                ) : hasCompleted ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z" clipRule="evenodd" /></svg>
                                                )}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-10 tracking-tight leading-tight uppercase pr-12">
                                            {opt.microSkillLabel}
                                        </h3>

                                        <div className="flex-grow space-y-8">
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Why this?</p>
                                                <div className="space-y-4">
                                                    <p className="text-base font-medium text-gray-900 leading-snug">
                                                        {diagnosis}
                                                    </p>
                                                    {evidence && (
                                                        <p className="text-gray-600 text-sm font-medium leading-relaxed italic border-l-2 border-indigo-100 pl-4 whitespace-pre-wrap">
                                                            {evidence}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-10 mt-12 border-t border-gray-50 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Skill</span>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.1em] transition-colors ${isProcessing ? 'text-indigo-500' : 'text-gray-900'}`}>
                                                    {opt.skillLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isProcessing ? (
                                                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest animate-pulse">Loading Loop...</span>
                                                ) : (
                                                    <>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {suggestions.length > 0 && suggestions.every(opt =>
                            practiceAttempts?.some(
                                a => a.parentSessionId === practiceSession.id &&
                                    a.microSkillId === opt.microSkillId &&
                                    a.completedAt
                            )
                        ) && (
                                <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-3xl space-y-4">
                                    <p className="text-sm font-bold text-gray-600">You've completed all suggested practice targets for this session!</p>
                                    <div className="flex justify-center gap-4 flex-wrap">
                                        <button
                                            onClick={onViewHistory}
                                            className="bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-8 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-xs transition-colors shadow-sm"
                                        >
                                            View Practice History
                                        </button>
                                        <button
                                            onClick={handleGenerateNewSuggestions}
                                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-xs transition-colors shadow-lg"
                                        >
                                            Generate New Suggestions
                                        </button>
                                    </div>
                                </div>
                            )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-12 w-full animate-in fade-in duration-700 pb-32 min-h-screen">

            <div className="mb-16 text-center space-y-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gray-50 border border-gray-100">
                    <span className={`w-2 h-2 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">
                        Assessment Status: {isValid ? 'Valid Session' : (feedback.validity?.reason || 'Insufficient Engagement')}
                    </span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 leading-none">
                    {scenario.title}
                </h2>
                <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Score</p>
                        <p className="text-3xl font-black text-gray-900">{feedback.total_score}<span className="text-gray-300">/25</span></p>
                    </div>
                    <div className="w-px h-10 bg-gray-100" />
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Potential</p>
                        <p className="text-3xl font-black text-gray-900">{feedback.leadership_potential}</p>
                    </div>
                </div>
            </div>

            <section className="space-y-12">
                <div className="grid grid-cols-1 gap-6">
                    {scoreItems.map((item) => (
                        <ScoreBar
                            key={item.id}
                            score={item.score}
                            max={5}
                            name={item.name}
                            justification={item.justification}
                        />
                    ))}
                </div>

                <div className="bg-gray-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-40 -mt-40 transition-all group-hover:scale-110"></div>

                    <div className="relative z-10 space-y-10">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight">Adaptive Learning Loop</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <p className="text-gray-400 font-medium leading-relaxed text-lg">
                                    Lock in your learning now. Choose a proposed focus and enter a high-fidelity practice loop tailored to the gaps found in this transcript.
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Personalized Targets Ready</span>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center backdrop-blur-sm group-hover:border-indigo-500/30 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Practice Variation</span>
                                <p className="text-3xl font-black tracking-tighter">Micro-Skill Practice</p>
                                <p className="text-xs text-indigo-400 mt-4 font-black uppercase tracking-widest">Behavioral Alignment Focus</p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={() => setViewState('choose_focus')}
                                className="w-full sm:w-auto bg-indigo-500 hover:bg-white hover:text-black text-white font-black py-5 px-12 rounded-3xl text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-4 group/btn"
                            >
                                <span>View Focus & Practise Now</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-24 py-16 border-t border-gray-100 flex flex-col items-center">
                <StarRating initialRating={practiceSession.learner_rating} onRate={handleRate} />
            </div>

            <div className="mt-8 pt-12 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-6">
                <button onClick={() => setShowTranscript(!showTranscript)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                    {showTranscript ? 'Hide Case Record' : 'View Full Transcript'}
                </button>
                <button onClick={onBackToDashboard} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors flex items-center gap-2">
                    Return to Dashboard
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                </button>
            </div>

            {showTranscript && (
                <div className="mt-12 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Interaction Log</p>
                        <div className="space-y-6">
                            {practiceSession.transcript.map((entry, idx) => (
                                <div key={idx} className={`flex flex-col ${entry.speaker === 'user' ? 'items-end pl-12' : 'items-start pr-12'}`}>
                                    <span className="text-[9px] font-black uppercase text-gray-400 mb-2 px-2">{entry.speaker === 'user' ? 'Participant' : 'Assessor'}</span>
                                    <div className={`p-5 rounded-2xl text-sm leading-relaxed font-medium ${entry.speaker === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>
                                        {entry.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
