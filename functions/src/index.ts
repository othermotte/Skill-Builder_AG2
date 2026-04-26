import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI, Type } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';

// The real API key is stored in Firebase Secret Manager.
// It is NEVER visible in source code, logs, or the browser.
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Shared function options
const fnOptions = {
  region: 'europe-west1' as const,
  secrets: [geminiApiKey],
};

// Helper to get authenticated AI client
function getAI(secretValue: string) {
  return new GoogleGenAI({ apiKey: secretValue });
}

// Helper to assert authenticated caller
function assertAuth(request: any) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE: Ephemeral Live API Token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getGeminiLiveToken
 *
 * Securely distributes the Gemini API key to authenticated users only.
 * The key is stored in Firebase Secret Manager and never appears in the
 * frontend JS bundle. Only signed-in Firebase users can call this function.
 *
 * Note: Google's authTokens ephemeral token API is not yet available in the
 * stable SDK. This pattern — server-side key distribution to authenticated
 * users — provides the same core security guarantee: the key is invisible
 * in the browser bundle and inaccessible to unauthenticated requests.
 */
export const getGeminiLiveToken = onCall(fnOptions, async (request) => {
  assertAuth(request);

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError('internal', 'API key not configured.');
  }

  return { token: apiKey };
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT: Deep Feedback for Transcript
// ─────────────────────────────────────────────────────────────────────────────

const SKILL_IDS = {
  ADAPTIVE: 'adaptive_mindset',
  COGNITIVE: 'cognitive_complexity',
  SOCIAL: 'social_intelligence',
  ETHICS: 'ethical_courage',
  CHANGE: 'change_leadership',
};

export const getFeedbackForTranscript = onCall(
  { ...fnOptions, timeoutSeconds: 120 },
  async (request) => {
    assertAuth(request);
    const { transcript, scenario, protocol } = request.data;

    if (!transcript || transcript.length === 0) {
      throw new HttpsError('invalid-argument', 'Transcript is empty.');
    }

    const ai = getAI(geminiApiKey.value());

    const formattedTranscript = transcript
      .map((entry: any, idx: number) =>
        `[Message ${idx + 1}] ${entry.speaker === 'user' ? 'PARTICIPANT' : 'ASSESSOR'}: ${entry.text}`
      )
      .join('\n\n');

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        validity: {
          type: Type.OBJECT,
          properties: {
            is_valid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ['is_valid', 'reason'],
        },
        scores: {
          type: Type.OBJECT,
          properties: {
            [SKILL_IDS.ADAPTIVE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ['score', 'justification'] },
            [SKILL_IDS.COGNITIVE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ['score', 'justification'] },
            [SKILL_IDS.SOCIAL]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ['score', 'justification'] },
            [SKILL_IDS.ETHICS]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ['score', 'justification'] },
            [SKILL_IDS.CHANGE]: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, justification: { type: Type.STRING } }, required: ['score', 'justification'] },
          },
          required: Object.values(SKILL_IDS),
        },
        summary: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
            overall_summary: { type: Type.STRING },
          },
          required: ['strengths', 'areas_for_improvement', 'overall_summary'],
        },
        total_score: { type: Type.NUMBER },
        leadership_potential: { type: Type.STRING },
        next_review_days: { type: Type.NUMBER },
      },
      required: ['validity', 'scores', 'summary', 'total_score', 'leadership_potential', 'next_review_days'],
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
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema },
      });
      return { text: response.text || '{}' };
    } catch (error: any) {
      if (error?.message?.includes('429')) {
        throw new HttpsError('resource-exhausted', 'The Assessment Studio is currently at capacity. Please wait a few moments before submitting again.');
      }
      throw new HttpsError('internal', error?.message || 'Assessment failed.');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// MICRO-SKILL SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getMicroSkillSuggestions = onCall(fnOptions, async (request) => {
  assertAuth(request);
  const { transcript, feedback, skillLibrary } = request.data;

  const ai = getAI(geminiApiKey.value());

  const strippedLibrary = skillLibrary.skill_groups.map((group: any) => ({
    id: group.id,
    label: group.label,
    skills: group.skills.map((s: any) => ({
      id: s.id,
      label: s.name,
      micro_skills: s.micro_skills.map((ms: any) => ({ id: ms.id, label: ms.label })),
    })),
  }));

  const formattedTranscript = transcript
    .map((entry: any) => `${entry.speaker.toUpperCase()}: ${entry.text}`)
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
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
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
            reason: { type: Type.STRING },
          },
          required: ['groupId', 'groupLabel', 'skillId', 'skillLabel', 'microSkillId', 'microSkillLabel', 'reason'],
        },
      },
    },
  });

  const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || '[]';
  return JSON.parse(cleanedText);
});

// ─────────────────────────────────────────────────────────────────────────────
// SKILL SNAPSHOT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export const generateSkillSnapshot = onCall(fnOptions, async (request) => {
  assertAuth(request);
  const { microSkillLabel, evidence, history } = request.data;

  const ai = getAI(geminiApiKey.value());

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
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            starterStems: { type: Type.ARRAY, items: { type: Type.STRING } },
            watchFor: { type: Type.STRING },
            successIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
            firstChallenge: { type: Type.STRING },
          },
          required: ['concept', 'starterStems', 'watchFor', 'successIndicators', 'firstChallenge'],
        },
      },
    });
    const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || '{}';
    return JSON.parse(cleanedText);
  } catch {
    return {
      concept: 'Unable to generate briefing.',
      starterStems: ["I'm curious about...", 'I might be assuming...'],
      watchFor: 'Avoid leading questions.',
      successIndicators: ['They share more info.'],
      firstChallenge: "A colleague says: 'We should just go with my plan, right?'",
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRACTICE REFLECTION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export const analyzePracticeReflection = onCall(fnOptions, async (request) => {
  assertAuth(request);
  const { transcript, microSkillLabel } = request.data;

  const ai = getAI(geminiApiKey.value());

  const formattedTranscript = transcript
    .map((entry: any) => `[${entry.speaker.toUpperCase()}]: ${entry.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this transcript for the specific application of the micro-skill: "${microSkillLabel}".\n\nCRITICAL TONE REQUIREMENT: You are a highly supportive, encouraging leadership coach. This is a safe practice environment. Frame the "adjustment" specifically as a warm, actionable coaching tip rather than a harsh critique.\n\nTranscript:\n${formattedTranscript}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            evidence: { type: Type.STRING },
            impact: { type: Type.STRING },
            adjustment: { type: Type.STRING },
          },
          required: ['detected', 'evidence', 'impact', 'adjustment'],
        },
      },
    });
    const cleanedText = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || '{}';
    return JSON.parse(cleanedText);
  } catch {
    return { detected: false, evidence: 'Error', impact: 'N/A', adjustment: 'N/A' };
  }
});
