
import { GoogleGenAI, Type } from '@google/genai';
import type { TranscriptEntry, Scenario, FeedbackAnalysis, PracticeAttempt, SkillLibrary, SkillSnapshot } from '../types';
import {
  getGlobalAssessorProtocol,
  getSkillLibrary
} from './firebase';
import {
  SKILL_ID_ADAPTIVE,
  SKILL_ID_COGNITIVE,
  SKILL_ID_SOCIAL,
  SKILL_ID_ETHICS,
  SKILL_ID_CHANGE
} from '../constants';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

/**
 * Custom error class to handle rate limits and quota issues
 */
export class GeminiApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

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

  const protocol = await getGlobalAssessorProtocol();
  const formattedTranscript = transcript
    .map((entry, idx) => `[Message ${idx + 1}] ${entry.speaker === 'user' ? 'PARTICIPANT' : 'ASSESSOR'}: ${entry.text}`)
    .join('\n\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      validity: {
        type: Type.OBJECT,
        properties: {
          is_valid: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["is_valid", "reason"]
      },
      scores: {
        type: Type.OBJECT,
        properties: {
          [SKILL_ID_ADAPTIVE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ["score", "justification"] },
          [SKILL_ID_COGNITIVE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ["score", "justification"] },
          [SKILL_ID_SOCIAL]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ["score", "justification"] },
          [SKILL_ID_ETHICS]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ["score", "justification"] },
          [SKILL_ID_CHANGE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ["score", "justification"] }
        },
        required: [SKILL_ID_ADAPTIVE, SKILL_ID_COGNITIVE, SKILL_ID_SOCIAL, SKILL_ID_ETHICS, SKILL_ID_CHANGE]
      },
      summary: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
          overall_summary: { type: Type.STRING }
        },
        required: ["strengths", "areas_for_improvement", "overall_summary"]
      },
      total_score: { type: Type.NUMBER },
      leadership_potential: { type: Type.STRING },
      next_review_days: { type: Type.NUMBER }
    },
    required: ["validity", "scores", "summary", "total_score", "leadership_potential", "next_review_days"]
  };

  const prompt = `
        ${protocol}

        ### CONTEXT (THE CASE BEING ASSESSED)
        Title: "${scenario.title}"
        Case Description: ${scenario.description}

        ### TRANSCRIPT TO ANALYZE
        ${formattedTranscript}
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
    return { text: response.text || "{}" };
  } catch (error: any) {
    if (error?.message?.includes('429')) {
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
  const library = await getSkillLibrary();

  const strippedLibrary = library.skill_groups.map(group => ({
    id: group.id,
    label: group.label,
    skills: group.skills.map(s => ({
      id: s.id,
      label: s.name,
      micro_skills: s.micro_skills.map(ms => ({ id: ms.id, label: ms.label }))
    }))
  }));

  const formattedTranscript = transcript
    .map((entry) => `${entry.speaker.toUpperCase()}: ${entry.text}`)
    .join('\n');

  const prompt = `
        Based on the transcript and assessment below, suggest 2-3 specific micro-skills from the provided library that this learner should practice next.
        
        ### CRITICAL INSTRUCTIONS:
        1. Address the learner directly in the FIRST PERSON (e.g., "You relied on..." instead of "The learner relied on...").
        2. STRUCTURE the "reason" field as follows: 
           - First line: A one-sentence diagnosis of the behavioral pattern observed in the transcript.
           - Followed by: A detailed explanation linking to specific evidence found in the transcript, including quoted text if possible.
        3. Reference ONLY the IDs and Labels provided in the MICRO-SKILLS LIBRARY below.
        4. Capture the hierarchy: Group (Category) -> Skill (Topic) -> Micro-Skill (Behavior).

        ### TRANSCRIPT
        ${formattedTranscript}

        ### ASSESSMENT SUMMARY
        ${feedback.summary.overall_summary}

        ### MICRO-SKILLS LIBRARY
        ${JSON.stringify(strippedLibrary)}

        ### OUTPUT FORMAT
        Return a JSON array of objects:
        {
            "groupId": "The category ID (e.g. 'adaptive_mindset')",
            "groupLabel": "The category label",
            "skillId": "The topic ID (e.g. 'curiosity')",
            "skillLabel": "The topic label",
            "microSkillId": "The micro_skill_id",
            "microSkillLabel": "The specific micro-skill behavioral instruction",
            "reason": "Structured explanation following the rules in point 2."
        }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              groupId: { type: Type.STRING },
              groupLabel: { type: Type.STRING },
              skillId: { type: Type.STRING },
              skillLabel: { type: Type.STRING },
              microSkillId: { type: Type.STRING },
              microSkillLabel: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["groupId", "groupLabel", "skillId", "skillLabel", "microSkillId", "microSkillLabel", "reason"]
          }
        }
      }
    });
    const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || "[]";
    return JSON.parse(cleanedText);
  } catch (error: any) {
    console.error("Suggestions Error:", error);
    return [];
  }
};

/**
 * SNAPSHOT GENERATION - Structured for clean UI
 */
export const generateSkillSnapshot = async (
  microSkillLabel: string,
  evidence: string,
  history: string
): Promise<SkillSnapshot> => {
  const prompt = `
        Generate a concise, learner-facing leadership briefing for the following micro-skill.
        
        Micro-skill: "${microSkillLabel}"
        Evidence from recent session: "${evidence}"
        Learner History: "${history}"

        ### OUTPUT FORMAT (JSON):
        {
            "concept": "A 2-3 sentence explanation of the skill's importance in context.",
            "starterStems": ["Fragment 1...", "Fragment 2..."],
            "watchFor": "A warning about a common trap or misuse of this skill.",
            "successIndicators": ["Point 1", "Point 2", "Point 3"],
            "firstChallenge": "A short (1 sentence) scenario prompt that forces the use of this micro-skill."
        }

        ### RULES:
        1. NO Markdown (no **, no #).
        2. Use first-person ("You").
        3. Be encouraging but direct.
        4. "starterStems" must be 2-3 short conversational fragments, not full sentences.
        5. "firstChallenge" should be a realistic line from a colleague or stakeholder that needs a response using the micro-skill.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            starterStems: { type: Type.ARRAY, items: { type: Type.STRING } },
            watchFor: { type: Type.STRING },
            successIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
            firstChallenge: { type: Type.STRING }
          },
          required: ["concept", "starterStems", "watchFor", "successIndicators", "firstChallenge"]
        }
      }
    });
    const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || "{}";
    return JSON.parse(cleanedText) as SkillSnapshot;
  } catch (error: any) {
    return {
      concept: "Unable to generate briefing.",
      starterStems: ["I'm curious about...", "I might be assuming..."],
      watchFor: "Avoid leading questions.",
      successIndicators: ["They share more info."],
      firstChallenge: "A colleague says: 'We should just go with my plan, right?'"
    };
  }
};

/**
 * PRACTICE REFLECTION
 */
export const analyzePracticeReflection = async (
  attempt: PracticeAttempt,
  microSkillLabel: string
): Promise<any> => {
  const formattedTranscript = attempt.transcript
    .map((entry) => `[${entry.speaker.toUpperCase()}]: ${entry.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this transcript for the specific application of the micro-skill: "${microSkillLabel}".\n\nCRITICAL TONE REQUIREMENT: You are a highly supportive, encouraging leadership coach. This is a safe practice environment. Frame the "adjustment" specifically as a warm, actionable coaching tip rather than a harsh critique.\n\nTranscript:\n${formattedTranscript}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            evidence: { type: Type.STRING },
            impact: { type: Type.STRING },
            adjustment: { type: Type.STRING }
          },
          required: ["detected", "evidence", "impact", "adjustment"]
        }
      }
    });
    const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || "{}";
    return JSON.parse(cleanedText);
  } catch (error: any) {
    return { detected: false, evidence: "Error", impact: "N/A", adjustment: "N/A" };
  }
};
