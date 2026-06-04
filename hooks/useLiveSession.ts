import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { httpsCallable } from 'firebase/functions';
import { TranscriptEntry } from '../types';
import { downsampleTo16k, base64EncodeAudio, pcmToAudioBuffer, decodeBase64ToBytes } from '../utils/audioUtils';
import { getGlobalFacilitatorContract } from '../services/firebase';
import { functions } from '../firebaseConfig';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error';
export type SessionErrorType = 'connection' | 'limit' | null;

interface UsageStatus {
  count: number;
  limit: number;
  remaining: number;
}

interface UseLiveSessionProps {
  voiceName: string;
  systemInstruction: string;
  omitGlobalOS?: boolean;
  mode?: 'diagnostic' | 'tutorial';
}

export const useLiveSession = ({ voiceName, systemInstruction, omitGlobalOS = false, mode = 'diagnostic' }: UseLiveSessionProps) => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<SessionErrorType>(null);
  const [volume, setVolume] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);

  const statusRef = useRef<SessionStatus>('idle');
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const userTranscriptBuffer = useRef<string>('');
  const aiTranscriptBuffer = useRef<string>('');

  const stopAllAudio = useCallback(() => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const cleanup = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) { }
      sessionPromiseRef.current = null;
    }

    stopAllAudio();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) { }
      }
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setVolume(0);
    setStreamingText('');
  }, [stopAllAudio]);

  const disconnect = useCallback(async () => {
    if (userTranscriptBuffer.current.trim()) {
      const entry: TranscriptEntry = { speaker: 'user', text: userTranscriptBuffer.current.trim() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript(transcriptRef.current);
    }
    if (aiTranscriptBuffer.current.trim()) {
      const entry: TranscriptEntry = { speaker: 'ai', text: aiTranscriptBuffer.current.trim() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript(transcriptRef.current);
    }
    await cleanup();
    statusRef.current = 'idle';
    setStatus('idle');
    return transcriptRef.current;
  }, [cleanup]);

  const connect = useCallback(async () => {

    try {
      setStatus('connecting');
      statusRef.current = 'connecting';
      setErrorMessage(null);
      setErrorType(null);
      setTranscript([]);
      transcriptRef.current = [];
      userTranscriptBuffer.current = '';
      aiTranscriptBuffer.current = '';

      const globalOS = omitGlobalOS ? '' : await getGlobalFacilitatorContract();

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      }).catch(err => {
        console.error("LiveSession: Microphone access denied", err);
        throw err;
      });
      mediaStreamRef.current = stream;

      // Fetch a short-lived ephemeral token from the secure Cloud Function.
      // The real API key never touches the browser.
      const getToken = httpsCallable<{ mode: 'diagnostic' | 'tutorial' }, { token: string; usage?: UsageStatus }>(functions, 'getGeminiLiveToken');
      const tokenResult = await getToken({ mode });
      const ephemeralToken = tokenResult.data.token;
      if (tokenResult.data.usage) {
        setUsageStatus(tokenResult.data.usage);
      }

      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const openingInstruction = mode === 'tutorial'
        ? `The learner has just connected. Welcome them briefly, explain that you will begin with a short practice challenge, and invite them into the first rep.`
        : `The participant has already read the scenario and is ready. Begin the assessment immediately with one neutral, scenario-specific question that probes their reasoning. Do not give a generic greeting, ask whether they are ready, or repeat the scenario.`;

      const initialPrompt = mode === 'tutorial'
        ? 'I am ready to begin the micro-skill practice. Please start the first rep.'
        : 'I have read the scenario and am ready. Begin the assessment with your first scenario-specific question.';

      const combinedInstruction = `
        ${globalOS}

        ${systemInstruction}

        ### SESSION OPENING
        ${openingInstruction}
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log("LiveSession: Connection opened.");
            statusRef.current = 'active';
            setStatus('active');
            setErrorMessage(null);
            // Automatically send an invisible text prompt to kick off the AI's greeting
            sessionPromiseRef.current?.then((session) => {
              try {
                session.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: initialPrompt }] }],
                  turnComplete: true
                });
              } catch (e) {
                console.warn("Failed to send initial greeting trigger", e);
              }
            });
          },
          onmessage: (msg) => handleServerMessage(msg),
          onclose: (e) => {
            const closeReason = e.reason || '';
            const isUnexpectedClose = e.code !== 1000 && e.code !== 1001;
            const isBillingClose = closeReason.toLowerCase().includes('prepayment') || closeReason.toLowerCase().includes('credits');
            console.log(`LiveSession: Connection closed. Code: ${e.code}. Reason: ${closeReason || 'none'}`);
            if (statusRef.current === 'connecting' || (statusRef.current === 'active' && isUnexpectedClose)) {
              statusRef.current = 'error';
              setErrorType('connection');
              setErrorMessage(
                isBillingClose
                  ? 'Gemini Live is blocked because the API project has no available prepaid credit. Please complete the Gemini API billing/prepayment step in Google AI Studio, then try again.'
                  : `Gemini Live closed unexpectedly. Code: ${e.code || 'unknown'}${closeReason ? `: ${closeReason}` : ''}`
              );
              setStatus('error');
            } else {
              statusRef.current = 'idle';
              setStatus('idle');
            }
            cleanup();
          },
          onerror: (e) => {
            console.error("LiveSession: Connection error.", e);
            statusRef.current = 'error';
            setErrorType('connection');
            setErrorMessage('Connection failed. Please check your microphone and try again.');
            setStatus('error');
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: combinedInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });

      sessionPromiseRef.current = sessionPromise;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (statusRef.current !== 'active') return;
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, ctx.sampleRate);
        const b64Data = base64EncodeAudio(downsampled);
        sessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: b64Data } });
        }).catch(err => {
          console.warn("LiveSession: Failed to send realtime input", err);
        });
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(ctx.destination);
      sourceRef.current = source;
      processorRef.current = processor;

    } catch (error: any) {
      console.error("LiveSession: Error during connection setup", error);
      const details = error?.details as UsageStatus | undefined;
      if (details?.limit) {
        setUsageStatus(details);
        statusRef.current = 'error';
        setErrorType('limit');
        setErrorMessage(`Daily ${mode === 'tutorial' ? 'micro-skill tutorial' : 'scenario'} limit reached. You have used ${Math.min(details.count, details.limit)} of ${details.limit} today.`);
      } else {
        statusRef.current = 'error';
        setErrorType('connection');
        setErrorMessage(error?.message || "Connection failed. Please check your internet and try again.");
      }
      setStatus('error');
      cleanup();
    }
  }, [voiceName, systemInstruction, omitGlobalOS, mode, cleanup]);

  const handleServerMessage = async (message: LiveServerMessage) => {
    const ctx = audioContextRef.current;
    if (!ctx || !message.serverContent) return;

    if (message.serverContent.interrupted) stopAllAudio();

    if (message.serverContent.inputTranscription) {
      userTranscriptBuffer.current += message.serverContent.inputTranscription.text || '';
      setStreamingText(userTranscriptBuffer.current);
    }
    if (message.serverContent.outputTranscription) {
      aiTranscriptBuffer.current += message.serverContent.outputTranscription.text || '';
      setStreamingText(aiTranscriptBuffer.current);
    }

    const audioData = message.serverContent.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      if (userTranscriptBuffer.current.trim()) {
        transcriptRef.current = [...transcriptRef.current, { speaker: 'user', text: userTranscriptBuffer.current.trim() }];
        setTranscript(transcriptRef.current);
        userTranscriptBuffer.current = '';
      }
      const bytes = decodeBase64ToBytes(audioData);
      const audioBuffer = pcmToAudioBuffer(bytes, ctx, 24000);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      audioSourcesRef.current.add(source);
      source.onended = () => audioSourcesRef.current.delete(source);
    }

    if (message.serverContent.turnComplete) {
      if (aiTranscriptBuffer.current.trim()) {
        transcriptRef.current = [...transcriptRef.current, { speaker: 'ai', text: aiTranscriptBuffer.current.trim() }];
        setTranscript(transcriptRef.current);
        aiTranscriptBuffer.current = '';
      }
      setStreamingText('');
    }
  };

  useEffect(() => {
    let frame: number;
    const update = () => {
      if (analyserRef.current && status === 'active') {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setVolume(data.reduce((a, b) => a + b, 0) / data.length);
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [status]);

  // Update the processor to check status before sending
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = (e) => {
        if (statusRef.current !== 'active') return; // STOP the spam

        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, audioContextRef.current?.sampleRate || 24000);
        const b64Data = base64EncodeAudio(downsampled);
        
        sessionPromiseRef.current?.then((session) => {
          try {
            session.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: b64Data } });
          } catch (e) {
            console.warn("LiveSession: Failed to send realtime input", e);
          }
        }).catch(err => {
          console.warn("LiveSession: Failed to resolve session promise", err);
        });
      };
    }
  }, [status]);

  return { status, errorMessage, errorType, connect, disconnect, volume, streamingText, transcript: transcriptRef.current, usageStatus };
};
