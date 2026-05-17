/**
 * Extrait un intervalle d'un fichier audio et le retourne en WAV.
 * Utilise la Web Audio API — s'exécute entièrement dans le navigateur.
 *
 * @param file            Fichier audio source
 * @param durationSeconds Durée de l'extrait en secondes (défaut : 30)
 * @param startSeconds    Point de départ en secondes (défaut : 0)
 */
export async function trimAudioToWav(
  file: File,
  durationSeconds = 30,
  startSeconds = 0,
): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const totalSamples = audioBuffer.length;

  const startSample = Math.min(Math.floor(startSeconds * sampleRate), totalSamples);
  const trimLength   = Math.min(Math.floor(durationSeconds * sampleRate), totalSamples - startSample);

  // Build trimmed AudioBuffer from the selected interval
  const trimmed = new OfflineAudioContext(channels, trimLength, sampleRate);
  const buffer = trimmed.createBuffer(channels, trimLength, sampleRate);
  for (let c = 0; c < channels; c++) {
    buffer.copyToChannel(
      audioBuffer.getChannelData(c).subarray(startSample, startSample + trimLength),
      c,
    );
  }

  return audioBufferToWav(buffer, channels, sampleRate, trimLength);
}

function audioBufferToWav(
  buffer: AudioBuffer,
  channels: number,
  sampleRate: number,
  length: number
): Blob {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}
