import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

initializeApp();

// The real API key is stored in Firebase Secret Manager.
// It is NEVER visible in source code, logs, or the browser.
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const DAILY_DIAGNOSTIC_SESSION_LIMIT = 5;
const DAILY_TUTORIAL_SESSION_LIMIT = 3;
const DAILY_HELPER_AI_LIMIT = 12;
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const ANALYSIS_MODEL = 'gemini-3.5-flash';

// Shared function options
const fnOptions = {
  region: 'europe-west1' as const,
  secrets: [geminiApiKey],
};

// Helper to get authenticated AI client
function getAI(secretValue: string) {
  return new GoogleGenAI({ apiKey: secretValue });
}

function getLiveAI(secretValue: string) {
  return new GoogleGenAI({
    apiKey: secretValue,
    httpOptions: { apiVersion: 'v1alpha' },
  });
}

// Helper to assert authenticated caller
function assertAuth(request: any) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  if (request.auth.token.email_verified === false) {
    throw new HttpsError('permission-denied', 'You must verify your email before using AI practice.');
  }
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function usageDocId(uid: string, action: string, date = new Date()) {
  return `${uid}_${action}_${dayKey(date)}`;
}

async function recordGeminiUsage(
  request: any,
  action: 'diagnostic_session' | 'tutorial_session' | 'assessment' | 'micro_skill_suggestions' | 'skill_snapshot' | 'practice_reflection',
  limit: number
) {
  assertAuth(request);

  const db = getFirestore();
  const uid = request.auth.uid;
  const email = request.auth.token.email || null;
  const today = dayKey();
  const usageRef = db.collection('geminiUsageDaily').doc(usageDocId(uid, action));

  const count = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(usageRef);
    const currentCount = snap.exists ? Number(snap.data()?.count || 0) : 0;
    const nextCount = currentCount + 1;

    if (nextCount > limit) {
      return nextCount;
    }

    transaction.set(usageRef, {
      uid,
      email,
      action,
      day: today,
      count: nextCount,
      limit,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists ? snap.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    }, { merge: true });

    return nextCount;
  });

  await db.collection('geminiUsageLogs').add({
    uid,
    email,
    action,
    day: today,
    count,
    limit,
    allowed: count <= limit,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (count >= limit) {
    await db.collection('geminiUsageAlerts').add({
      uid,
      email,
      action,
      day: today,
      count,
      limit,
      severity: count > limit ? 'blocked' : 'limit_reached',
      message: `${email || uid} ${count > limit ? 'exceeded' : 'reached'} the daily ${action} limit.`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  if (count > limit) {
    throw new HttpsError(
      'resource-exhausted',
      `Daily AI practice limit reached. Please try again tomorrow.`,
      { count, limit, remaining: 0 }
    );
  }

  return { count, limit, remaining: Math.max(limit - count, 0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE: Ephemeral Live API Token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getGeminiLiveToken
 *
 * Creates a short-lived, single-use Gemini Live auth token for the browser.
 * The permanent API key stays in Secret Manager and is only used server-side.
 */
export const getGeminiLiveToken = onCall(fnOptions, async (request) => {
  const sessionMode = request.data?.mode === 'tutorial' ? 'tutorial' : 'diagnostic';
  const systemInstruction = String(request.data?.systemInstruction || '').trim();
  const requestedVoiceName = String(request.data?.voiceName || 'Kore').trim();
  const voiceName = /^[A-Za-z0-9_-]{1,32}$/.test(requestedVoiceName) ? requestedVoiceName : 'Kore';

  if (!systemInstruction) {
    throw new HttpsError('invalid-argument', 'Live session instructions are required.');
  }

  if (systemInstruction.length > 30000) {
    throw new HttpsError('invalid-argument', 'Live session instructions are too long.');
  }

  const usage = await recordGeminiUsage(
    request,
    sessionMode === 'tutorial' ? 'tutorial_session' : 'diagnostic_session',
    sessionMode === 'tutorial' ? DAILY_TUTORIAL_SESSION_LIMIT : DAILY_DIAGNOSTIC_SESSION_LIMIT
  );

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError('internal', 'API key not configured.');
  }

  const ai = getLiveAI(apiKey);
  const now = Date.now();
  const newSessionExpireTime = new Date(now + 60 * 1000).toISOString();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      newSessionExpireTime,
      expireTime,
      liveConnectConstraints: {
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      },
      httpOptions: { apiVersion: 'v1alpha' },
    },
  });

  if (!token.name) {
    throw new HttpsError('internal', 'Unable to create Gemini Live token.');
  }

  return { token: token.name, usage };
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
        model: ANALYSIS_MODEL,
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
  await recordGeminiUsage(request, 'micro_skill_suggestions', DAILY_HELPER_AI_LIMIT);
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
    model: ANALYSIS_MODEL,
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
  await recordGeminiUsage(request, 'skill_snapshot', DAILY_HELPER_AI_LIMIT);
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
      model: ANALYSIS_MODEL,
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
  await recordGeminiUsage(request, 'practice_reflection', DAILY_HELPER_AI_LIMIT);
  const { transcript, microSkillLabel } = request.data;

  const ai = getAI(geminiApiKey.value());

  const formattedTranscript = transcript
    .map((entry: any) => `[${entry.speaker.toUpperCase()}]: ${entry.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
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
