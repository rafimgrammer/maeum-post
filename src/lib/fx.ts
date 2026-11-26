import type { FxKind } from './themes'

/** 캔버스 하나로 돌리는 가벼운 파티클 엔진 */
const PAL: Record<Exclude<FxKind, 'crumb'>, string[]> = {
  heart: ['#d94a64', '#f08aa0', '#b33a4a', '#f6b8c4', '#e86a7f'],
  petal: ['#f2c14e', '#f29e4c', '#f7dc8b', '#e9b872', '#fff1c9'],
  confetti: ['#2f6c80', '#e4572e', '#f3a712', '#76b041', '#a5668b', '#29a3b8', '#f6d8ae', '#d4af37'],
  star: ['#f3c64b', '#7fb069', '#e9d16b', '#4d7d3e', '#fff2b3'],
  drop: ['#9c8fc9', '#b7acd9', '#8fb3d9', '#cfc6e8', '#ffffff'],
  dust: ['#c9a876', '#d8bf94', '#e8d6b4'],
}

interface P {
  kind: FxKind; x: number; y: number; vx: number; vy: number; g: number; r: number; vr: number
  s: number; life: number; decay: number; drag: number; sway: number; ph: number; a: number; col: string
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export interface Ambient { kind: FxKind; rate: number }

export class FxEngine {
  private parts: P[] = []
  private cx: CanvasRenderingContext2D
  private W = 0
  private H = 0
  private raf = 0
  private tick = 0
  ambient: Ambient | null = null
  reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor(private cv: HTMLCanvasElement) {
    this.cx = cv.getContext('2d')!
    this.resize()
    addEventListener('resize', this.resize)
    this.loop()
  }
  destroy() {
    cancelAnimationFrame(this.raf)
    removeEventListener('resize', this.resize)
  }
  private dpr = 1
  private dirty = false
  private resize = () => {
    this.dpr = Math.min(2, devicePixelRatio || 1)
    this.W = innerWidth
    this.H = innerHeight
    this.cv.width = this.W * this.dpr
    this.cv.height = this.H * this.dpr
    this.cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }
  private add(p: Partial<P>) {
    this.parts.push({ kind: 'dust', x: 0, y: 0, vx: 0, vy: 0, g: 0, r: rnd(0, 6), vr: rnd(-0.05, 0.05), s: 8, life: 1, decay: 0.006, drag: 1, sway: 0, ph: rnd(0, 6.28), a: 1, col: '#000', ...p })
  }
  burst(kind: FxKind, x: number, y: number, n = 60) {
    if (this.reduce || kind === 'crumb') return
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + rnd(-1, 1) * Math.PI * 0.75
      const sp = rnd(4, 12)
      this.add({ kind, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.18, drag: 0.965, s: rnd(7, 15), vr: rnd(-0.25, 0.25), decay: rnd(0.005, 0.011), col: pick(PAL[kind]), sway: kind === 'confetti' ? 0 : 0.3 })
    }
  }
  crumbs(x: number, y: number, col: string) {
    if (this.reduce) return
    for (let i = 0; i < 24; i++) {
      const ang = rnd(0, Math.PI * 2)
      const sp = rnd(1.5, 5)
      this.add({ kind: 'crumb', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, g: 0.25, drag: 0.97, s: rnd(2, 5), decay: rnd(0.015, 0.03), col })
    }
  }
  private spawnAmbient() {
    const a = this.ambient
    if (!a || this.reduce || Math.random() > a.rate || a.kind === 'crumb') return
    if (a.kind === 'dust') this.add({ kind: 'dust', x: rnd(0, this.W), y: this.H + 10, vx: rnd(-0.2, 0.2), vy: rnd(-0.6, -0.25), s: rnd(1.5, 3.5), sway: 0.4, decay: 0.0025, col: pick(PAL.dust), a: 0.55 })
    else this.add({ kind: a.kind, x: rnd(0, this.W), y: -20, vx: rnd(-0.4, 0.4), vy: rnd(0.8, 1.8), s: rnd(8, 15), sway: 1, decay: 0.0018, col: pick(PAL[a.kind]), vr: rnd(-0.03, 0.03), a: a.kind === 'drop' ? 0.6 : 0.9 })
  }
  private shape(p: P) {
    const { cx } = this
    const s = p.s
    cx.fillStyle = p.col
    switch (p.kind) {
      case 'heart':
        cx.scale(s / 12, s / 12)
        cx.beginPath(); cx.moveTo(0, 5)
        cx.bezierCurveTo(-9, -1, -5, -10, 0, -4)
        cx.bezierCurveTo(5, -10, 9, -1, 0, 5)
        cx.fill(); break
      case 'petal':
        cx.beginPath(); cx.ellipse(0, 0, s * 0.55, s * 0.28, 0, 0, Math.PI * 2); cx.fill()
        cx.fillStyle = 'rgba(255,255,255,.35)'
        cx.beginPath(); cx.ellipse(-s * 0.12, -s * 0.05, s * 0.25, s * 0.08, 0, 0, Math.PI * 2); cx.fill(); break
      case 'confetti':
        cx.scale(1, Math.cos(p.ph * 3)); cx.fillRect(-s / 2, -s / 4, s, s / 2); break
      case 'star':
        cx.beginPath()
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * 0.22 : s * 0.55
          const a = (i * Math.PI) / 5 - Math.PI / 2
          cx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        cx.closePath(); cx.fill(); break
      case 'drop':
        cx.globalAlpha *= 0.7
        cx.beginPath(); cx.arc(0, 0, s * 0.35, 0, Math.PI * 2); cx.fill()
        cx.globalAlpha *= 0.4
        cx.beginPath(); cx.arc(0, 0, s * 0.7, 0, Math.PI * 2); cx.fill(); break
      default:
        cx.beginPath(); cx.arc(0, 0, s / 2, 0, Math.PI * 2); cx.fill()
    }
  }
  private loop = () => {
    const { cx } = this
    this.raf = requestAnimationFrame(this.loop)
    this.tick++
    this.spawnAmbient()
    // 그릴 것이 없으면 캔버스를 건드리지 않음 (빈 화면을 매 프레임 지우고 다시 합성하지 않도록)
    if (!this.parts.length) {
      if (this.dirty) {
        cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        cx.clearRect(0, 0, this.W, this.H)
        this.dirty = false
      }
      return
    }
    this.dirty = true
    cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    cx.clearRect(0, 0, this.W, this.H)
    const d = this.dpr
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      p.vx *= p.drag
      p.vy = p.vy * p.drag + p.g
      p.ph += 0.05
      p.x += p.vx + (p.sway ? Math.sin(this.tick * 0.02 + p.ph * 4) * p.sway * 0.6 : 0)
      p.y += p.vy
      p.r += p.vr
      p.life -= p.decay
      if (p.life <= 0 || p.y > this.H + 40 || (p.y < -60 && p.vy < 0)) {
        this.parts.splice(i, 1)
        continue
      }
      // save/restore 대신 변환 행렬을 직접 지정 (같은 결과, 훨씬 가벼움)
      const cos = Math.cos(p.r) * d
      const sin = Math.sin(p.r) * d
      cx.setTransform(cos, sin, -sin, cos, p.x * d, p.y * d)
      cx.globalAlpha = Math.min(1, p.life * 2.5) * p.a
      this.shape(p)
    }
    cx.globalAlpha = 1
  }
}
