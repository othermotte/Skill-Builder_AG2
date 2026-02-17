
/**
 * Audio processing utilities for the Gemini Live API.
 * Handles PCM conversion, downsampling, and buffer management.
 */

export function downsampleTo16k(buffer: Float32Array, sampleRate: number): Int16Array {
  if (sampleRate === 16000) {
    const output = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }
  const ratio = sampleRate / 16000;
  const newLength = Math.floor(buffer.length / ratio);
  const output = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const inputIndex = Math.floor(i * ratio);
    const s = Math.max(-1, Math.min(1, buffer[inputIndex]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

export function base64EncodeAudio(int16Array: Int16Array): string {
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function pcmToAudioBuffer(pcmData: Uint8Array, ctx: AudioContext, sampleRate = 24000): AudioBuffer {
  const numChannels = 1;
  const frameCount = pcmData.length / 2;

  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  const dataView = new DataView(pcmData.buffer);

  for (let i = 0; i < frameCount; i++) {
    // Convert 16-bit PCM to Float32 (-1.0 to 1.0)
    const int16 = dataView.getInt16(i * 2, true);
    channelData[i] = int16 / 32768.0;
  }
  return buffer;
}

export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
