import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { httpsCallable } from 'firebase/functions';
import { TranscriptEntry } from '../types';
import { downsampleTo16k, base64EncodeAudio, pcmToAudioBuffer, decodeBase64ToBytes } from '../utils/audioUtils';
import { getGlobalFacilitatorContract } from '../services/firebase';
import { functions } from '../firebaseConfig';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error';

interface UseLiveSessionProps {
  voiceName: string;
  systemInstruction: string;
  omitGlobalOS?: boolean;
}

export const useLiveSession = ({ voiceName, systemInstruction, omitGlobalOS = false }: UseLiveSessionProps) => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [volume, setVolume] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

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
    sessionPromiseRef.current = null;
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
    setStatus('idle');
    return transcriptRef.current;
  }, [cleanup]);

  const connect = useCallback(async () => {

    try {
      setStatus('connecting');
      setTranscript([]);
      transcriptRef.current = [];
      userTranscriptBuffer.current = '';
      aiTranscriptBuffer.current = '';

      const globalOS = omitGlobalOS ? '' : await getGlobalFacilitatorContract();

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        console.error("LiveSession: Microphone access denied", err);
        throw err;
      });
      mediaStreamRef.current = stream;

      // Fetch a short-lived ephemeral token from the secure Cloud Function.
      // The real API key never touches the browser.
      const getToken = httpsCallable<void, { token: string }>(functions, 'getGeminiLiveToken');
      const tokenResult = await getToken();
      const ephemeralToken = tokenResult.data.token;

      const ai = new GoogleGenAI({ apiKey: ephemeralToken });

      const combinedInstruction = `
        ${globalOS}

        ${systemInstruction}
        
        The user has just connected to the voice session. Your first action MUST be to greet them warmly, confirm you are ready, and ask them to begin. Do NOT wait for them to speak first.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.debug("LiveSession: Connection opened.");
            setStatus('active');
            // Automatically send an invisible text prompt to kick off the AI's greeting
            sessionPromiseRef.current?.then((session) => {
              try {
                session.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'Hello. I am ready to begin the scenario. Please greet me.' }] }],
                  turnComplete: true
                });
              } catch (e) {
                console.warn("Failed to send initial greeting trigger", e);
              }
            });
          },
          onmessage: (msg) => {
            console.log("[Server] Received message:", msg);
            handleServerMessage(msg);
          },
          onclose: (e) => {
            console.log("LiveSession: Connection closed.", e);
            setStatus('idle');
          },
          onerror: (e) => {
            console.error("LiveSession: Connection error.", e);
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
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, 24000);
        const b64Data = base64EncodeAudio(downsampled);
        sessionPromiseRef.current?.then((session) => {
          // Log if we are getting actual audio levels
          const hasAudio = inputData.some(v => Math.abs(v) > 0.01);
          if (Math.random() < 0.01) {
            console.log("[Audio Flow] Mic status:", hasAudio ? "🔊 Hearing Sound" : "🔇 Silence");
          }
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

    } catch (error) {
      console.error("LiveSession: Error during connection setup", error);
      setStatus('error');
      cleanup();
    }
  }, [voiceName, systemInstruction, omitGlobalOS, cleanup]);

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

  return { status, connect, disconnect, volume, streamingText, transcript: transcriptRef.current };
};