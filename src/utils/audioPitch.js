// 离线分析音频文件的音高曲线
import { PitchDetector } from 'pitchy'

// 解码音频文件 -> AudioBuffer
export async function decodeAudioFile(file) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const arrayBuffer = await file.arrayBuffer()
  const buf = await ctx.decodeAudioData(arrayBuffer)
  ctx.close()
  return buf
}

// 对 AudioBuffer 做分帧音高检测
// hopMs: 每多少毫秒取一帧；windowSize: FFT 窗口大小
export function analyzePitch(audioBuffer, { hopMs = 30, windowSize = 2048, clarityThreshold = 0.85 } = {}) {
  const sr = audioBuffer.sampleRate
  // 取第一通道（如果是立体声，混合两个通道更稳）
  let data
  if (audioBuffer.numberOfChannels >= 2) {
    const c0 = audioBuffer.getChannelData(0)
    const c1 = audioBuffer.getChannelData(1)
    data = new Float32Array(c0.length)
    for (let i = 0; i < c0.length; i++) data[i] = (c0[i] + c1[i]) * 0.5
  } else {
    data = audioBuffer.getChannelData(0).slice()
  }

  const detector = PitchDetector.forFloat32Array(windowSize)
  const hop = Math.floor((hopMs / 1000) * sr)
  const frames = []

  for (let i = 0; i + windowSize <= data.length; i += hop) {
    const frame = data.subarray(i, i + windowSize)
    // RMS
    let sum = 0
    for (let j = 0; j < frame.length; j++) sum += frame[j] * frame[j]
    const rms = Math.sqrt(sum / frame.length)

    let pitch = null
    if (rms > 0.005) {
      const [p, c] = detector.findPitch(frame, sr)
      if (c >= clarityThreshold && p > 60 && p < 1500) pitch = p
    }
    frames.push({ time: i / sr, pitch, rms })
  }
  return { frames, duration: audioBuffer.duration }
}

// 从音频帧中估计 MIDI 范围（带 padding）
export function estimateMidiRange(frames, padding = 4) {
  let min = Infinity, max = -Infinity
  for (const f of frames) {
    if (!f.pitch) continue
    const m = 69 + 12 * Math.log2(f.pitch / 440)
    if (m < min) min = m
    if (m > max) max = m
  }
  if (!isFinite(min)) return { minMidi: 48, maxMidi: 72 }
  return {
    minMidi: Math.floor(min - padding),
    maxMidi: Math.ceil(max + padding)
  }
}
