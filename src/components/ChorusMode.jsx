import React, { useEffect, useRef, useState } from 'react'
import { analyzePitch, decodeAudioFile, estimateMidiRange } from '../utils/audioPitch.js'
import { freqToMidi, midiToNoteName } from '../utils/pitch.js'
import { MicPitch } from '../utils/mic.js'

export default function ChorusMode() {
  const [file, setFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [analysis, setAnalysis] = useState(null) // {frames, duration}
  const [analyzing, setAnalyzing] = useState(false)
  const [range, setRange] = useState({ minMidi: 48, maxMidi: 72 })
  const [playing, setPlaying] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const micRef = useRef(null)
  const userTrailRef = useRef([]) // [{time, midi}]
  const liveMidiRef = useRef(null)
  const rafRef = useRef(null)

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    await loadFile(f)
  }

  const loadFile = async (f) => {
    setFile(f)
    setAnalysis(null)
    userTrailRef.current = []
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(URL.createObjectURL(f))

    setAnalyzing(true)
    try {
      const buf = await decodeAudioFile(f)
      const result = analyzePitch(buf, { hopMs: 30 })
      const r = estimateMidiRange(result.frames, 5)
      setAnalysis(result)
      setRange(r)
    } catch (err) {
      alert('音频解析失败：' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // 主可视化循环
  useEffect(() => {
    const draw = () => {
      drawViz(canvasRef.current, {
        analysis,
        range,
        currentTime,
        userTrail: userTrailRef.current,
        liveMidi: liveMidiRef.current,
        playing
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analysis, range, currentTime, playing])

  // 音频时间更新
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrentTime(a.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnd)
    }
  }, [audioUrl])

  const toggleMic = async () => {
    if (micOn) {
      micRef.current?.stop()
      micRef.current = null
      setMicOn(false)
      liveMidiRef.current = null
      return
    }
    const mic = new MicPitch({
      onPitch: ({ pitch }) => {
        if (pitch) {
          const midi = freqToMidi(pitch)
          liveMidiRef.current = midi
          if (audioRef.current && !audioRef.current.paused) {
            const t = audioRef.current.currentTime
            const trail = userTrailRef.current
            if (!trail.length || t - trail[trail.length - 1].time > 0.03) {
              trail.push({ time: t, midi })
              if (trail.length > 5000) trail.splice(0, trail.length - 5000)
            }
          }
        } else {
          liveMidiRef.current = null
        }
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

  const togglePlay = async () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      userTrailRef.current = []
      await a.play()
    } else {
      a.pause()
    }
  }

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    userTrailRef.current = []
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="btn ghost" style={{ cursor: 'pointer' }}>
          选择音频文件
          <input type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {analyzing && <span className="status">分析音高中…</span>}
        {analysis && <span className="status">已识别 {analysis.frames.filter(f => f.pitch).length} 个有效帧</span>}
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} style={{ width: '100%', marginBottom: 12 }} controls />
      )}

      <canvas ref={canvasRef} className="viz" width={1080} height={260} />

      <div className="legend">
        <span><span className="dot" style={{ background: '#5b6cff' }} />原音音高</span>
        <span><span className="dot" style={{ background: '#ffd166' }} />你的音高</span>
        <span><span className="dot" style={{ background: '#4cffaf' }} />当前位置</span>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={togglePlay} disabled={!analysis}>
          {playing ? '暂停' : '播放'}
        </button>
        <button className={`btn ${micOn ? 'danger' : 'ghost'}`} onClick={toggleMic}>
          {micOn ? '停止跟唱' : '开始跟唱'}
        </button>
        <button className="btn ghost" onClick={reset} disabled={!analysis}>重置</button>
      </div>
      <div className="status" style={{ marginTop: 8 }}>
        {analysis ? `时长 ${analysis.duration.toFixed(1)}s · 当前 ${currentTime.toFixed(1)}s` : '请先导入音频'}
      </div>
    </div>
  )
}

// ====== 可视化 ======
function drawViz(canvas, { analysis, range, currentTime, userTrail, liveMidi, playing }) {
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  ctx.fillStyle = '#0a0c1a'
  ctx.fillRect(0, 0, cssW, cssH)

  if (!analysis) {
    ctx.fillStyle = '#555'
    ctx.font = '14px sans-serif'
    ctx.fillText('导入音频后将在此显示音高曲线', 20, cssH / 2)
    return
  }

  const { minMidi, maxMidi } = range
  const duration = analysis.duration
  const padLeft = 40
  const padRight = 10
  const padTop = 10
  const padBottom = 10
  const w = cssW - padLeft - padRight
  const h = cssH - padTop - padBottom

  const xOf = (t) => padLeft + (t / duration) * w
  const yOf = (midi) => padTop + (1 - (midi - minMidi) / (maxMidi - minMidi)) * h

  ctx.font = '10px sans-serif'
  for (let m = Math.ceil(minMidi); m <= maxMidi; m++) {
    const y = yOf(m)
    const semitone = ((m % 12) + 12) % 12
    const isC = semitone === 0
    ctx.strokeStyle = isC ? '#2a2f55' : '#171a30'
    ctx.beginPath()
    ctx.moveTo(padLeft, y)
    ctx.lineTo(cssW - padRight, y)
    ctx.stroke()
    if (isC || semitone === 7) {
      ctx.fillStyle = '#6b6f96'
      ctx.fillText(midiToNoteName(m), 4, y + 3)
    }
  }

  // 原音高曲线（蓝）
  ctx.strokeStyle = '#5b6cff'
  ctx.lineWidth = 2
  ctx.beginPath()
  let pen = false
  for (const f of analysis.frames) {
    if (!f.pitch) { pen = false; continue }
    const m = freqToMidi(f.pitch)
    const x = xOf(f.time)
    const y = yOf(m)
    if (!pen) { ctx.moveTo(x, y); pen = true }
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 用户轨迹（黄）
  if (userTrail && userTrail.length) {
    ctx.strokeStyle = '#ffd166'
    ctx.lineWidth = 2
    ctx.beginPath()
    let p = false
    for (const pt of userTrail) {
      if (pt.midi == null) { p = false; continue }
      const x = xOf(pt.time)
      const y = yOf(pt.midi)
      if (!p) { ctx.moveTo(x, y); p = true }
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 当前实时点
  if (playing && liveMidi != null) {
    const x = xOf(currentTime)
    const y = yOf(liveMidi)
    ctx.fillStyle = '#ffd166'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 播放位置竖线
  const px = xOf(currentTime)
  ctx.strokeStyle = '#4cffaf'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(px, padTop)
  ctx.lineTo(px, padTop + h)
  ctx.stroke()
}
