
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { User, Scenario, Skill, PracticeSession, Role, FeedbackAnalysis, PracticeAttempt, MicroSkill, SkillSnapshot, SkillLibrary } from './types';
import {
  logout,
  getUser,
  getScenarios,
  getSkills,
  getPracticeSessions,
  getPracticeAttempts,
  saveScenario,
  deleteScenario,
  savePracticeSession,
  deletePracticeSession,
  ensureDbInitialized,
  updateUserMemory,
  logEvent,
  savePracticeAttempt,
  getSkillLibrary
} from './services/firebase';
import { auth } from './firebaseConfig';
import { generateSkillSnapshot, analyzePracticeReflection, getFeedbackForTranscript } from './services/geminiService';

import { LoginPage } from './components/LoginPage';
import { NetworkIcon } from './components/icons/NetworkIcon';
import { DashboardPage } from './components/DashboardPage';
import { RoleplayPage } from './components/RoleplayPage';
import { FeedbackPage } from './components/FeedbackPage';
import { HistoryPage } from './components/HistoryPage';
import { SkillSnapshotView } from './components/SkillSnapshotView';
import { ReflectionView } from './components/ReflectionView';

const App: React.FC = () => {
  const [appUser, setAppUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[]>([]);
  const [appLibrary, setAppLibrary] = useState<SkillLibrary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState<'login' | 'dashboard' | 'roleplay' | 'feedback' | 'history' | 'snapshot' | 'reflection'>('dashboard');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [currentPracticeSession, setCurrentPracticeSession] = useState<PracticeSession | null>(null);
  const [feedbackInitialView, setFeedbackInitialView] = useState<'feedback' | 'choose_focus'>('feedback');

  const [activePracticeAttempt, setActivePracticeAttempt] = useState<Partial<PracticeAttempt> | null>(null);
  const [activeMicroSkill, setActiveMicroSkill] = useState<MicroSkill | null>(null);
  const [snapshot, setSnapshot] = useState<SkillSnapshot | null>(null);
  const [practiceType, setPracticeType] = useState<'diagnostic' | 'tutorial'>('diagnostic');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
      if (!user) {
        setAppUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadAppData = async () => {
    if (!firebaseUser) return;
    setIsLoadingData(true);
    setDataLoadError(null);
    try {
      await ensureDbInitialized();
      const loadedAppUser = await getUser(firebaseUser.uid, { email: firebaseUser.email! });
      if (!loadedAppUser) throw new Error(`User profile initialization failed.`);
      const [loadedScenarios, loadedSkills, loadedSessions, loadedAttempts, loadedLibrary] = await Promise.all([
        getScenarios(),
        getSkills(),
        getPracticeSessions(firebaseUser.uid),
        getPracticeAttempts(firebaseUser.uid),
        getSkillLibrary(),
      ]);
      setAppUser(loadedAppUser);
      setScenarios(loadedScenarios);
      setSkills(loadedSkills);
      setPracticeSessions(loadedSessions);
      setPracticeAttempts(loadedAttempts);
      setAppLibrary(loadedLibrary);
    } catch (error: any) {
      console.error("Data load error:", error);
      setDataLoadError(error.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && firebaseUser) {
      loadAppData();
    }
  }, [firebaseUser, isAuthLoading]);

  const handleLogout = async () => {
    await logout();
    setAppUser(null);
    setFirebaseUser(null);
    setActivePage('dashboard');
  };

  const handleStartPractice = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setCurrentPracticeSession(null);
    setActiveMicroSkill(null);
    setPracticeType('diagnostic');
    setActivePage('roleplay');
    logEvent(appUser?.id!, 'assessor_lab_started', { scenarioId: scenario.id });
  };

  const handleBeginPracticeLoop = async (groupId: string, microSkillId: string, reason: string) => {
    if (!appUser || !currentPracticeSession || !selectedScenario) return;

    logEvent(appUser.id, 'skill_selected', { groupId, microSkillId, reason });

    const library = await getSkillLibrary();
    const skillGroup = library.skill_groups.find(g => g.id === groupId);
    const ms = skillGroup?.skills.flatMap(s => s.micro_skills).find(m => m.id === microSkillId);

    if (!ms) {
      console.error("MicroSkill not found:", microSkillId);
      return;
    }

    setActiveMicroSkill(ms as MicroSkill);

    const feedback: FeedbackAnalysis = JSON.parse(currentPracticeSession.feedback!);
    const snapshotData = await generateSkillSnapshot(ms.label, feedback.summary.overall_summary || "None", appUser.growth_memory || "None");
    setSnapshot(snapshotData);

    setActivePracticeAttempt({
      userId: appUser.id,
      parentSessionId: currentPracticeSession.id,
      scenarioId: selectedScenario.id, // Anchor to scenario
      skillId: groupId,
      microSkillId,
      selectionReason: reason,
      snapshotContent: JSON.stringify(snapshotData),
      timestamp: new Date().toISOString()
    });

    setPracticeType('tutorial');
    setActivePage('snapshot');
    logEvent(appUser.id, 'snapshot_delivered', { microSkillId });
  };

  const handlePracticeLoopStart = () => {
    setActivePage('roleplay');
    logEvent(appUser?.id!, 'practice_loop_started', { microSkillId: activeMicroSkill?.id });
  };

  const handleSessionEnd = async (completedSession: PracticeSession, isDiagnostic = true, isCompleted = false) => {
    try {
      const savedSession = await savePracticeSession(completedSession);
      setPracticeSessions(prev => [savedSession, ...prev]);
      setCurrentPracticeSession(savedSession);

      if (completedSession.feedback && appUser) {
        try {
          const feedbackData: FeedbackAnalysis = JSON.parse(completedSession.feedback);
          const updatedUser = await updateUserMemory(appUser.id, feedbackData, completedSession.scenarioId);
          if (updatedUser) setAppUser(updatedUser);
        } catch (e) { }
      }

      if (activeMicroSkill && activePracticeAttempt) {
        const attemptPayload: Partial<PracticeAttempt> = {
          ...activePracticeAttempt,
          transcript: completedSession.transcript
        };

        // Mark as completed if the tutor reached its closing message
        if (isCompleted) {
          attemptPayload.completedAt = new Date().toISOString();
        }

        const savedAttempt = await savePracticeAttempt(attemptPayload);
        setPracticeAttempts(prev => [savedAttempt, ...prev.filter(a => a.id !== savedAttempt.id)]);

        setIsLoadingData(true);
        const reflectionAnalysis = await analyzePracticeReflection(savedAttempt, activeMicroSkill.label);
        const finalAttempt = await savePracticeAttempt({
          ...savedAttempt,
          reflection: reflectionAnalysis
        });
        setActivePracticeAttempt(finalAttempt);
        setPracticeAttempts(prev => [finalAttempt, ...prev.filter(a => a.id !== finalAttempt.id)]);
        setActivePage('reflection');
        setIsLoadingData(false);
        logEvent(appUser.id, 'practice_completed', { attemptId: finalAttempt.id, reflection: reflectionAnalysis, isCompleted });
        return;
      }

    } catch (error) {
      console.error("Error saving session:", error);
    }

    if (isDiagnostic) {
      setFeedbackInitialView('feedback'); // Always show Rubric after a fresh scenario
      setActivePage('feedback');
    } else {
      setActivePage('dashboard');
    }
  };

  const handleRetryAssessment = async (session: PracticeSession) => {
    // Clear old feedback immediately so UI shows loader
    const loadingSession = { ...session, feedback: null };
    setCurrentPracticeSession(loadingSession);
    setIsLoadingData(true);
    try {
      // Guard: Check if there's enough transcript to analyze
      if (!session.transcript || session.transcript.length < 2) {
        throw new Error("This session doesn't have enough conversation data to analyze. The voice connection may have dropped before a meaningful exchange could take place. Please try running a new scenario.");
      }

      const scenario = scenarios.find(s => s.id === session.scenarioId);
      if (!scenario) throw new Error("Scenario not found. Please return to the dashboard and try again.");

      const targetSkill = skills.find(s => s.id === scenario.skillId);
      const response = await getFeedbackForTranscript(scenario, session.transcript, targetSkill?.name || 'Leadership', 'English');

      const updatedSession: PracticeSession = {
        ...session,
        feedback: response.text?.replace(/```json/gi, '').replace(/```/g, '').trim(),
        suggestedFocusOptions: null, // Clear old suggestions so they re-generate correctly
        status: 'completed'
      };

      const savedSession = await savePracticeSession(updatedSession);
      setCurrentPracticeSession(savedSession);
      setPracticeSessions(prev => prev.map(s => s.id === savedSession.id ? savedSession : s));

      if (appUser) {
        try {
          const feedbackData: FeedbackAnalysis = JSON.parse(savedSession.feedback!);
          const updatedUser = await updateUserMemory(appUser.id, feedbackData, savedSession.scenarioId);
          if (updatedUser) setAppUser(updatedUser);
        } catch (e) { }
      }
    } catch (error: any) {
      console.error("Retry assessment failed:", error);
      // Put back the original session so they can retry again
      setCurrentPracticeSession(session);
      // Show user-friendly message
      const userMsg = error.message?.includes('expected pattern')
        ? "The AI couldn't generate a structured assessment from this transcript. The conversation may have been too short. Try running a new scenario with a longer interaction."
        : (error.message || "Unknown error. Please try again.");
      alert(userMsg);
    } finally {
      setIsLoadingData(false);
    }
  };

  const renderLoader = (text: string) => (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium text-gray-500 animate-pulse">{text}</p>
    </div>
  );

  const renderContent = () => {
    if (isAuthLoading) return renderLoader("Authenticating...");
    if (!firebaseUser) return <LoginPage />;
    if (isLoadingData && !appUser) return renderLoader("Loading Labs...");
    if (dataLoadError) return <div className="p-12 text-center text-rose-500 font-bold">{dataLoadError}</div>;
    if (!appUser) return renderLoader("Finalizing...");

    switch (activePage) {
      case 'dashboard':
        return <DashboardPage
          currentUser={appUser} scenarios={scenarios} skills={skills}
          practiceSessions={practiceSessions}
          practiceAttempts={practiceAttempts}
          appLibrary={appLibrary}
          onStartPractice={handleStartPractice}
          onSaveScenario={saveScenario} onDeleteScenario={deleteScenario}
          onUserUpdate={loadAppData}
          onViewHistory={() => setActivePage('history')}
          onViewSessionFeedback={(s, initialView = 'feedback') => {
            const scenario = scenarios.find(sc => sc.id === s.scenarioId);
            setSelectedScenario(scenario || null);
            setCurrentPracticeSession(s);
            setFeedbackInitialView(initialView);
            setActivePage('feedback');
          }}
        />;
      case 'roleplay':
        return selectedScenario ? <RoleplayPage
          scenario={selectedScenario} skills={skills} currentUser={appUser}
          onSessionEnd={handleSessionEnd}
          onBackToDashboard={() => setActivePage('dashboard')}
          practiceMode={activeMicroSkill ? { microSkill: activeMicroSkill, cuePrompt: activeMicroSkill.cue || '', snapshot: snapshot || undefined } : undefined}
          mode={practiceType}
        /> : null;
      case 'feedback':
        if (!currentPracticeSession) {
          console.warn("Missing session for feedback page, redirecting to dashboard");
          setTimeout(() => setActivePage('dashboard'), 0);
          return renderLoader("Finalizing...");
        }
        // Try to find the scenario; it's OK if missing — FeedbackPage can function without it
        const feedbackScenario = selectedScenario || scenarios.find(sc => sc.id === currentPracticeSession.scenarioId) || null;
        return <FeedbackPage
          practiceSession={currentPracticeSession} scenario={feedbackScenario!}
          skills={skills} practiceAttempts={practiceAttempts}
          onBackToDashboard={() => setActivePage('dashboard')}
          onViewHistory={() => setActivePage('history')}
          onBeginPracticeLoop={handleBeginPracticeLoop}
          initialView={feedbackInitialView}
          onSessionUpdate={(updatedSession) => {
            setCurrentPracticeSession(updatedSession);
            setPracticeSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
          }}
          onRetryAssessment={() => handleRetryAssessment(currentPracticeSession)}
        />;
      case 'snapshot':
        return (activeMicroSkill && snapshot) ? <SkillSnapshotView
          microSkill={activeMicroSkill}
          snapshot={snapshot}
          reason={activePracticeAttempt?.selectionReason || ""}
          onStartPractice={handlePracticeLoopStart}
          onPause={() => setActivePage('dashboard')}
        /> : null;
      case 'reflection':
        return activePracticeAttempt?.reflection ? <ReflectionView
          analysis={activePracticeAttempt.reflection}
          onNextStep={(choice) => {
            logEvent(appUser.id, 'next_step_chosen', { choice });
            if (choice === 'repeat') setActivePage('snapshot');
            else setActivePage('dashboard');
          }}
        /> : null;
      case 'history':
        return <HistoryPage
          practiceSessions={practiceSessions} scenarios={scenarios} skills={skills}
          practiceAttempts={practiceAttempts}
          appLibrary={appLibrary}
          onViewItem={(s) => {
            const scenario = scenarios.find(sc => sc.id === s.scenarioId);
            setSelectedScenario(scenario || null);
            setCurrentPracticeSession(s);
            setFeedbackInitialView('feedback');
            setActivePage('feedback');
          }}
          onDeleteItem={async (id) => { await deletePracticeSession(id); setPracticeSessions(prev => prev.filter(ps => ps.id !== id)); }}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans mx-auto w-full overflow-x-hidden">
      {firebaseUser && appUser && (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 h-16 flex items-center w-full">
          <div className="max-w-7xl mx-auto w-full px-4 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('dashboard')}>
              <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 flex items-center justify-center">
                <NetworkIcon className="w-5 h-5" />
              </div>
              <h1 className="text-sm font-bold tracking-tight uppercase">Skill Builder</h1>
            </div>
            <nav className="flex items-center gap-6">
              <button onClick={() => setActivePage('dashboard')} className={`text-xs font-black uppercase tracking-widest ${activePage === 'dashboard' ? 'text-black' : 'text-gray-400'}`}>Practice</button>
              <button onClick={() => setActivePage('history')} className={`text-xs font-black uppercase tracking-widest ${activePage === 'history' ? 'text-black' : 'text-gray-400'}`}>History</button>
              <button onClick={handleLogout} className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black">Sign out</button>
            </nav>
          </div>
        </header>
      )}
      <main className="flex-grow w-full flex flex-col">{renderContent()}</main>
    </div>
  );
};

export default App;
