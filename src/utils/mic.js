// 麦克风采集 + 实时音高检测
import { PitchDetector } from 'pitchy'

export class MicPitch {
  constructor({ onPitch, fftSize = 2048, clarityThreshold = 0.9, minVolume = 0.01 } = {}) {
    this.onPitch = onPitch
    this.fftSize = fftSize
    this.clarityThreshold = clarityThreshold
    this.minVolume = minVolume
    this.running = false
  }

  async start(externalStream) {
    if (this.running) return
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume()

    if (externalStream) {
      this.stream = externalStream
      this.ownsStream = false
    } else {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      this.ownsStream = true
    }

    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = this.fftSize
    this.source.connect(this.analyser)

    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize)
    this.buffer = new Float32Array(this.detector.inputLength)

    this.running = true
    this._loop()
  }

  _loop = () => {
    if (!this.running) return
    this.analyser.getFloatTimeDomainData(this.buffer)

    // 计算 RMS 音量
    let sum = 0
    for (let i = 0; i < this.buffer.length; i++) sum += this.buffer[i] * this.buffer[i]
    const rms = Math.sqrt(sum / this.buffer.length)

    let pitch = null
    let clarity = 0
    if (rms >= this.minVolume) {
      const [p, c] = this.detector.findPitch(this.buffer, this.audioCtx.sampleRate)
      if (c >= this.clarityThreshold && p > 60 && p < 1500) {
        pitch = p
        clarity = c
      }
    }
    this.onPitch?.({ pitch, clarity, rms, time: this.audioCtx.currentTime })
    this._raf = requestAnimationFrame(this._loop)
  }

  stop() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this.source) try { this.source.disconnect() } catch {}
    if (this.ownsStream && this.stream) this.stream.getTracks().forEach(t => t.stop())
    if (this.audioCtx) this.audioCtx.close()
    this.audioCtx = null
    this.stream = null
  }
}
