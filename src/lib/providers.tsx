import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FxEngine, type Ambient } from './fx'
import type { Cat, FontId, FxKind } from './themes'

/* =========================================================
   Theme — 현재 마음(카테고리)과 분위기 상태
   ========================================================= */
export type Mood = 'idle' | 'opened'
interface ThemeCtx { cat: Cat | null; setCat: (c: Cat | null) => void; mood: Mood; setMood: (m: Mood) => void }
const ThemeContext = createContext<ThemeCtx>(null!)
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [cat, setCat] = useState<Cat | null>(null)
  const [mood, setMood] = useState<Mood>('idle')
  useEffect(() => {
    if (cat) document.body.dataset.cat = cat
    else delete document.body.dataset.cat
  }, [cat])
  const value = useMemo(() => ({ cat, setCat, mood, setMood }), [cat, mood])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/* =========================================================
   Fx — 파티클 캔버스
   ========================================================= */
interface FxCtx {
  burst: (kind: FxKind, x: number, y: number, n?: number) => void
  burstAt: (kind: FxKind, el: Element | null, n?: number) => void
  crumbsAt: (el: Element | null) => void
  setAmbient: (a: Ambient | null) => void
}
const FxContext = createContext<FxCtx>(null!)
export const useFx = () => useContext(FxContext)

export function FxProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const eng = useRef<FxEngine | null>(null)
  useEffect(() => {
    eng.current = new FxEngine(ref.current!)
    return () => eng.current?.destroy()
  }, [])
  const api = useMemo<FxCtx>(() => {
    const center = (el: Element | null) => {
      const r = el?.getBoundingClientRect()
      return r ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth / 2, innerHeight / 2]
    }
    return {
      burst: (k, x, y, n) => eng.current?.burst(k, x, y, n),
      burstAt: (k, el, n) => {
        const [x, y] = center(el)
        eng.current?.burst(k, x, y, n)
      },
      crumbsAt: (el) => {
        const [x, y] = center(el)
        eng.current?.crumbs(x, y, getComputedStyle(document.body).getPropertyValue('--wax').trim() || '#a8323e')
      },
      setAmbient: (a) => {
        if (eng.current) eng.current.ambient = a
      },
    }
  }, [])
  return (
    <FxContext.Provider value={api}>
      <canvas ref={ref} className="fx" aria-hidden="true" />
      {children}
    </FxContext.Provider>
  )
}

/* =========================================================
   Letter — 작성 중인 편지 (새로고침해도 유지되도록 sessionStorage)
   ========================================================= */
export interface DraftPhoto { b64: string; mime: 'image/webp' | 'image/jpeg' }
export interface Draft { c: Cat | null; t: string; f: string; m: string; s: FontId; photo?: DraftPhoto; cap?: string }
const EMPTY: Draft = { c: null, t: '', f: '', m: '', s: 0 }
interface LetterCtx {
  draft: Draft
  update: (p: Partial<Draft>) => void
  reset: (p?: Partial<Draft>) => void
  sealed: { key: string; link: string } | null
  setSealed: (s: { key: string; link: string } | null) => void
}
const LetterContext = createContext<LetterCtx>(null!)
export const useLetter = () => useContext(LetterContext)
/** 내용(사진·캡션 포함)이 바뀌면 키가 달라져 다시 봉인합니다 */
export const draftKey = (d: Draft) => JSON.stringify([d.c, d.t, d.f, d.m, d.s, d.photo?.b64 ?? '', d.cap ?? ''])

export function LetterProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return { ...EMPTY, ...JSON.parse(sessionStorage.getItem('mp-draft') || '{}') }
    } catch {
      return EMPTY
    }
  })
  const [sealed, setSealed] = useState<LetterCtx['sealed']>(null)
  useEffect(() => {
    try {
      sessionStorage.setItem('mp-draft', JSON.stringify(draft))
    } catch {
      /* 저장 공간이 꽉 차도 작성은 계속 */
    }
  }, [draft])
  const update = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), [])
  const reset = useCallback((p: Partial<Draft> = {}) => setDraft({ ...EMPTY, ...p }), [])
  const value = useMemo(() => ({ draft, update, reset, sealed, setSealed }), [draft, update, reset, sealed])
  return <LetterContext.Provider value={value}>{children}</LetterContext.Provider>
}

/* =========================================================
   Toast
   ========================================================= */
const ToastContext = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((text: string) => {
    setMsg({ id: Date.now(), text })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        <AnimatePresence>
          {msg && (
            <motion.div
              key={msg.id}
              className="toast"
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            >
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
