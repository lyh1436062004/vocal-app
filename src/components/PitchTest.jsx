import React, { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { buildPianoKeys, centsBetween, freqToNote } from '../utils/pitch.js'
import { MicPitch } from '../utils/mic.js'

const KEYS = buildPianoKeys(48, 72) // C3 ~ C5
const WHITE_KEYS = KEYS.filter(k => !k.isBlack)

export default function PitchTest() {
  const [activeKey, setActiveKey] = useState(null)   // {midi, freq, name}
  const [micOn, setMicOn] = useState(false)
  const [userPitch, setUserPitch] = useState(null)
  const [userClarity, setUserClarity] = useState(0)
  const synthRef = useRef(null)
  const micRef = useRef(null)

  // 初始化合成器
  useEffect(() => {
    synthRef.current = new Tone.Sampler({
      urls: {
        A3: 'A3.mp3',
        A4: 'A4.mp3',
        A5: 'A5.mp3'
      },
      release: 1,
      baseUrl: 'https://tonejs.github.io/audio/salamander/'
    }).toDestination()
    return () => synthRef.current?.dispose()
  }, [])

  const playKey = async (key) => {
    await Tone.start()
    setActiveKey(key)
    try {
      synthRef.current.triggerAttackRelease(key.name, 1.2)
    } catch {
      // sampler 还没加载完成，先用 Synth 兜底
      const fallback = new Tone.Synth().toDestination()
      fallback.triggerAttackRelease(key.freq, 1)
      setTimeout(() => fallback.dispose(), 1500)
    }
    setTimeout(() => setActiveKey(prev => (prev?.midi === key.midi ? prev : prev)), 0)
  }

  const toggleMic = async () => {
    if (micOn) {
      micRef.current?.stop()
      micRef.current = null
      setMicOn(false)
      setUserPitch(null)
      return
    }
    const mic = new MicPitch({
      onPitch: ({ pitch, clarity }) => {
        setUserPitch(pitch)
        setUserClarity(clarity)
      }
    })
    try {
      await mic.start()
      micRef.current = mic
      setMicOn(true)
    } catch (e) {
      alert('无法访问麦克风：' + e.message)
    }
  }

  // 计算偏差
  const ref = activeKey
  const cents = ref && userPitch ? centsBetween(userPitch, ref.freq) : null
  const userNote = userPitch ? freqToNote(userPitch) : null

  let verdict = null
  if (cents !== null) {
    const abs = Math.abs(cents)
    if (abs < 15) verdict = { text: '✓ 准！', cls: 'ok' }
    else if (cents > 0) verdict = { text: `↑ 高了 ${cents.toFixed(0)} 音分`, cls: 'high' }
    else verdict = { text: `↓ 低了 ${(-cents).toFixed(0)} 音分`, cls: 'low' }
  }

  // 指针位置：[-50, +50] cents 映射到 [0, 100]%
  const needle = cents !== null ? Math.max(-50, Math.min(50, cents)) + 50 : 50

  // 渲染钢琴：先白键，再绝对定位黑键
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn ${micOn ? 'danger' : ''}`} onClick={toggleMic}>
          {micOn ? '停止录音' : '开启麦克风'}
        </button>
        <span className="status">点击钢琴键播放参考音，然后跟唱</span>
      </div>

      <Piano
        keys={KEYS}
        activeMidi={activeKey?.midi}
        onKey={playKey}
      />

      <div className="pitch-feedback">
        <div className="pitch-box">
          <div className="label">参考音</div>
          <div className="value">{ref ? ref.name : '—'}</div>
          <div className="label">{ref ? `${ref.freq.toFixed(1)} Hz` : ''}</div>
        </div>
        <div className="pitch-box">
          <div className="label">你的音高</div>
          <div className="value">{userNote ? userNote.noteName : '—'}</div>
          <div className="label">{userPitch ? `${userPitch.toFixed(1)} Hz` : (micOn ? '请发声…' : '麦克风未开启')}</div>
        </div>
        <div className="pitch-box">
          <div className="label">判定</div>
          <div className="value" style={{ fontSize: 22 }}>
            {verdict ? <span className={verdict.cls}>{verdict.text}</span> : '—'}
          </div>
          <div className="label">
            清晰度 {(userClarity * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="gauge">
        <div className="scale">
          <span>低 -50</span><span>0</span><span>+50 高</span>
        </div>
        <div className="center-line" />
        <div className="needle" style={{ left: `calc(${needle}% - 2px)` }} />
      </div>
    </div>
  )
}

function Piano({ keys, activeMidi, onKey }) {
  const whites = keys.filter(k => !k.isBlack)
  const whiteCount = whites.length

  return (
    <div className="piano">
      {whites.map(k => (
        <div
          key={k.midi}
          className={`white-key ${activeMidi === k.midi ? 'active' : ''}`}
          onClick={() => onKey(k)}
        >
          {k.name}
        </div>
      ))}
      {keys.filter(k => k.isBlack).map(k => {
        // 找到该黑键左侧最近的白键索引
        const leftWhiteIndex = whites.findIndex(w => w.midi === k.midi - 1)
        if (leftWhiteIndex < 0) return null
        // 黑键中心位于左白键的右边界
        const leftPct = ((leftWhiteIndex + 1) / whiteCount) * 100
        return (
          <div
            key={k.midi}
            className={`black-key ${activeMidi === k.midi ? 'active' : ''}`}
            style={{ left: `calc(${leftPct}% - 2%)` }}
            onClick={() => onKey(k)}
          >
            {k.name}
          </div>
        )
      })}
    </div>
  )
}
