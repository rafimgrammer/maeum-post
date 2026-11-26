/** app/write/page.tsx — 편지 쓰기 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { Stamp } from '@/components/Postal'
import { TopBar } from '@/components/Chrome'
import { Arrow, MagneticButton, Reveal, SplitText } from '@/components/Motion'
import { useFx, useLetter, useTheme } from '@/lib/providers'
import { navigate, prefetch } from '@/lib/router'
import { sfx } from '@/lib/sound'
import { CATS, FONTS } from '@/lib/themes'

const MAX = 300

export default function Write() {
  const { draft, update } = useLetter()
  const { setCat, setMood } = useTheme()
  const fx = useFx()
  const [err, setErr] = useState('')
  const shake = useAnimationControls()
  const ta = useRef<HTMLTextAreaElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const tipIdx = useRef(0)
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!draft.c) {
      navigate('/pick', { replace: true })
      return
    }
    setCat(draft.c)
    setMood('idle')
    fx.setAmbient({ kind: CATS[draft.c].fx, rate: 0.03 })
    prefetch('/seal')
    return () => clearTimeout(typing.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 줄노트 간격(34px)에 맞춰 자동으로 늘어나는 textarea
  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(204, Math.ceil(el.scrollHeight / 34) * 34)}px`
  }, [draft.m, draft.s])

  if (!draft.c) return null
  const k = CATS[draft.c]

  const tip = () => {
    clearTimeout(typing.current)
    const text = k.tips[tipIdx.current++ % k.tips.length]
    let i = 0
    const step = () => {
      update({ m: text.slice(0, ++i) })
      if (i < text.length) typing.current = setTimeout(step, 26)
    }
    step()
    setErr('')
  }

  const submit = () => {
    const t = draft.t.trim()
    const m = draft.m.trim()
    if (!t || !m) {
      setErr(!t ? '받는 사람을 적어 주세요' : '보낼 한마디를 적어 주세요')
      ;(!t ? toRef.current : ta.current)?.focus()
      shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.45 } })
      return
    }
    update({ t, m, f: draft.f.trim() })
    sfx.paper()
    navigate('/seal')
  }

  const pct = draft.m.length / MAX

  return (
    <section className="screen">
      <TopBar step={2} back="/pick" />
      <h2>
        <SplitText text="한마디를 적어 주세요" delay={0.05} stagger={0.03} />
      </h2>

      <motion.div animate={shake} className="paper-wrap">
        <Reveal d={1} className={`paper f${draft.s}`}>
          <motion.button
            className="wstamp"
            onClick={() => navigate('/pick')}
            aria-label="우표 바꾸기"
            initial={{ opacity: 0, y: -50, rotate: -30, scale: 1.4 }}
            animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
            whileHover={{ rotate: 0, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.35 }}
          >
            <Stamp cat={draft.c} />
          </motion.button>
          <span className={`washi washi-${draft.c}`} aria-hidden="true" />
          <label className="row w">
            <span>To.</span>
            <input ref={toRef} value={draft.t} maxLength={20} placeholder="받는 사람" autoComplete="off" onChange={(e) => (update({ t: e.target.value }), setErr(''))} />
          </label>
          <textarea
            ref={ta}
            className="w"
            aria-label="보낼 한마디"
            value={draft.m}
            maxLength={MAX}
            placeholder={k.tips[0].replace('\n', ' ')}
            onChange={(e) => (update({ m: e.target.value }), setErr(''))}
          />
          <label className="row from w">
            <input value={draft.f} maxLength={20} placeholder="보내는 사람" autoComplete="off" onChange={(e) => update({ f: e.target.value })} />
            <span>드림</span>
          </label>
        </Reveal>
      </motion.div>

      <Reveal d={2} className="tools">
        <div className="fonts" role="group" aria-label="글씨체">
          {FONTS.map((f) => (
            <button key={f.id} className={`f${f.id}`} aria-pressed={draft.s === f.id} onClick={() => (sfx.tap(), update({ s: f.id }))}>
              {draft.s === f.id && <motion.span layoutId="font-pill" className="font-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <span className="font-label">{f.label}</span>
            </button>
          ))}
        </div>
        <button className="pill" onClick={tip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
          </svg>
          추천 문구
        </button>
        <span className="cnt" aria-label={`${draft.m.length}자 / ${MAX}자`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" className="cnt-bg" />
            <motion.circle cx="12" cy="12" r="9" pathLength={1} className={`cnt-fg ${pct > 0.9 ? 'warn' : ''}`} animate={{ pathLength: pct }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          </svg>
          {draft.m.length}
        </span>
      </Reveal>

      <p className="err" role="alert">{err}</p>

      <Reveal d={3}>
        <MagneticButton onClick={submit}>
          <span>봉투에 넣고 봉인하기</span>
          <Arrow />
        </MagneticButton>
      </Reveal>
    </section>
  )
}
