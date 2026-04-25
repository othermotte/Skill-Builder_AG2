import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import type { TranscriptEntry, Scenario, FeedbackAnalysis, PracticeAttempt, SkillSnapshot } from '../types';
import {
  getGlobalAssessorProtocol,
  getSkillLibrary
} from './firebase';

/**
 * Custom error class to handle rate limits and quota issues.
 */
export class GeminiApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// All AI calls go through Firebase Cloud Functions.
// The real Gemini API key never touches the browser.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DEEP ASSESSMENT (Requires Pro for high-fidelity reasoning)
 */
export const getFeedbackForTranscript = async (
  scenario: Scenario,
  transcript: TranscriptEntry[],
  skillName: string,
  language: string
): Promise<{ text: string }> => {
  if (transcript.length === 0) throw new Error("Transcript is empty.");

  // Fetch the assessor protocol from Firestore (still client-side, it's not a secret)
  const protocol = await getGlobalAssessorProtocol();

  try {
    const fn = httpsCallable<any, { text: string }>(functions, 'getFeedbackForTranscript');
    const result = await fn({ transcript, scenario, skillName, language, protocol });
    return result.data;
  } catch (error: any) {
    if (error?.code === 'functions/resource-exhausted' || error?.message?.includes('429')) {
      throw new GeminiApiError(429, "The Assessment Studio is currently at capacity. Please wait a few moments before submitting again.");
    }
    throw error;
  }
};

/**
 * SKILL SUGGESTIONS
 */
export const getMicroSkillSuggestions = async (
  transcript: TranscriptEntry[],
  feedback: FeedbackAnalysis
): Promise<any[]> => {
  const skillLibrary = await getSkillLibrary();

  const fn = httpsCallable<any, any[]>(functions, 'getMicroSkillSuggestions');
  const result = await fn({ transcript, feedback, skillLibrary });
  return result.data;
};

/**
 * SNAPSHOT GENERATION - Structured for clean UI
 */
export const generateSkillSnapshot = async (
  microSkillLabel: string,
  evidence: string,
  history: string
): Promise<SkillSnapshot> => {
  const fn = httpsCallable<any, SkillSnapshot>(functions, 'generateSkillSnapshot');
  const result = await fn({ microSkillLabel, evidence, history });
  return result.data;
};

/**
 * PRACTICE REFLECTION
 */
export const analyzePracticeReflection = async (
  attempt: PracticeAttempt,
  microSkillLabel: string
): Promise<any> => {
  const fn = httpsCallable<any, any>(functions, 'analyzePracticeReflection');
  const result = await fn({ transcript: attempt.transcript, microSkillLabel });
  return result.data;
};
