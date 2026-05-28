// 音高相关工具：Hz <-> MIDI <-> 音名，cents 计算

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// MIDI 编号 -> 频率 (A4=69=440Hz)
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// 频率 -> MIDI 浮点
export function freqToMidi(freq) {
  if (!freq || freq <= 0) return null
  return 69 + 12 * Math.log2(freq / 440)
}

// MIDI 编号 -> 音名 (例如 60 -> "C4")
export function midiToNoteName(midi) {
  const m = Math.round(midi)
  const name = NOTE_NAMES[((m % 12) + 12) % 12]
  const octave = Math.floor(m / 12) - 1
  return `${name}${octave}`
}

// 频率 -> { noteName, cents }  cents: -50 ~ +50 (相对最近半音)
export function freqToNote(freq) {
  const midi = freqToMidi(freq)
  if (midi === null) return null
  const nearest = Math.round(midi)
  const cents = (midi - nearest) * 100
  return {
    midi: nearest,
    noteName: midiToNoteName(nearest),
    cents
  }
}

// 比较：用户音高相对参考音高的偏差（cents）
export function centsBetween(userFreq, refFreq) {
  if (!userFreq || !refFreq) return null
  return 1200 * Math.log2(userFreq / refFreq)
}

// 钢琴布局：从 C3 到 C5，两个八度
export function buildPianoKeys(startMidi = 48, endMidi = 72) {
  const keys = []
  for (let m = startMidi; m <= endMidi; m++) {
    const isBlack = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12)
    keys.push({
      midi: m,
      isBlack,
      name: midiToNoteName(m),
      freq: midiToFreq(m)
    })
  }
  return keys
}
