import { useSyncExternalStore } from 'react'

/** 오디오 파일 없이 Web Audio로 직접 합성하는 효과음 */
const KEY = 'mp-sound'
let enabled = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) !== 'off' : true
let ctx: AudioContext | null = null
let master: GainNode | null = null
const listeners = new Set<() => void>()

function ac() {
  if (!enabled) return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    // 아주 짧은 에코로 공간감
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.18
    const fb = ctx.createGain()
    fb.gain.value = 0.22
    master.connect(ctx.destination)
    master.connect(delay)
    delay.connect(fb).connect(delay)
    delay.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.06) {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null
function noise(at: number, dur: number, opt: { type: BiquadFilterType; freq: number; q?: number; vol?: number }) {
  const c = ac()
  if (!c || !master) return
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = c.currentTime + at
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = opt.type
  f.frequency.value = opt.freq
  f.Q.value = opt.q ?? 1
  const g = c.createGain()
  g.gain.setValueAtTime(opt.vol ?? 0.1, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

export const sfx = {
  tap: () => tone(1046, 0, 0.07, 'sine', 0.025),
  stamp: () => {
    noise(0, 0.12, { type: 'lowpass', freq: 700, vol: 0.35 })
    tone(90, 0, 0.18, 'sine', 0.12)
  },
  paper: () => {
    for (let i = 0; i < 4; i++) noise(i * 0.06, 0.16, { type: 'bandpass', freq: 2200 + Math.random() * 2500, q: 0.8, vol: 0.05 })
  },
  crack: () => {
    noise(0, 0.07, { type: 'highpass', freq: 2500, vol: 0.25 })
    noise(0.04, 0.22, { type: 'lowpass', freq: 500, vol: 0.25 })
    tone(140, 0.02, 0.2, 'triangle', 0.06)
  },
  whoosh: () => noise(0, 0.5, { type: 'bandpass', freq: 900, q: 0.5, vol: 0.06 }),
  chime: (notes: number[]) =>
    notes.forEach((f, i) => {
      tone(f, i * 0.12, 1.6, 'sine', 0.045)
      tone(f * 2, i * 0.12, 0.9, 'triangle', 0.01)
    }),
}

export const sound = {
  get: () => enabled,
  toggle() {
    enabled = !enabled
    localStorage.setItem(KEY, enabled ? 'on' : 'off')
    if (enabled) sfx.tap()
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export const useSound = () => useSyncExternalStore(sound.subscribe, sound.get)

export const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* 지원 안 하는 기기 */
  }
}
