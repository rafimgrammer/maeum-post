/** app/m/[data]/page.tsx — 받는 사람 화면. URL의 [data] 세그먼트에서 편지를 꺼냅니다. */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Loading from '@/app/loading'
import { Envelope, Postmark, Stamp } from '@/components/Postal'
import { Doodle } from '@/components/Chrome'
import { Arrow, MagneticButton, Reveal, SplitText } from '@/components/Motion'
import { unpack, type Letter } from '@/lib/codec'
import { useFx, useLetter, useTheme } from '@/lib/providers'
import { Link, navigate, type PageProps } from '@/lib/router'
import { sfx, vibrate } from '@/lib/sound'
import { CATS } from '@/lib/themes'

type State = { status: 'loading' } | { status: 'bad' } | { status: 'ok'; letter: Letter }

export default function ReadPage({ params }: PageProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    unpack(params.data)
      .then((letter) => alive && setState({ status: 'ok', letter }))
      .catch(() => alive && setState({ status: 'bad' }))
    return () => {
      alive = false
    }
  }, [params.data])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'bad') return <Broken />
  return <LetterView key={nonce} letter={state.letter} onReplay={() => setNonce((n) => n + 1)} />
}

function Broken() {
  return (
    <section className="screen center-screen">
      <div className="nf-mark"><Postmark date="반송" /></div>
      <h2>편지가 훼손되어 열 수 없어요</h2>
      <p className="lead">링크가 중간에 잘렸을 수 있어요. 보낸 사람에게 다시 받아 주세요.</p>
      <Link href="/" className="btn" style={{ marginTop: 26 }}><span>나도 편지 쓰기</span></Link>
    </section>
  )
}

type Stage = 'closed' | 'breaking' | 'open' | 'rise' | 'card'
const HOLD_MS = 900

function LetterView({ letter: L, onReplay }: { letter: Letter; onReplay: () => void }) {
  const k = CATS[L.c]
  const { setCat, setMood } = useTheme()
  const { reset } = useLetter()
  const fx = useFx()
  const [stage, setStage] = useState<Stage>('closed')
  const [progress, setProgress] = useState(0)
  const [typed, setTyped] = useState(0)
  const envRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const hold = useRef({ on: false, p: 0, last: 0, raf: 0 })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const done = typed >= L.m.length && stage === 'card'

  useEffect(() => {
    setCat(L.c)
    setMood('idle')
    fx.setAmbient({ kind: 'dust', rate: 0.12 })
    const t = timers.current
    const h = hold.current
    return () => {
      t.forEach(clearTimeout)
      cancelAnimationFrame(h.raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms))

  const breakSeal = useCallback(() => {
    setStage('breaking')
    sfx.crack()
    vibrate([12, 40, 24])
    fx.crumbsAt(envRef.current?.querySelector('.seal') ?? null)
    later(450, () => (setStage('open'), sfx.paper()))
    later(1150, () => setStage('rise'))
    later(2100, () => {
      setStage('card')
      sfx.chime(k.notes)
      fx.setAmbient({ kind: k.fx, rate: 0.18 })
      later(80, () => fx.burst(k.fx, innerWidth / 2, Math.min(innerHeight * 0.55, (cardRef.current?.getBoundingClientRect().top ?? 200) + 140), 90))
      later(5200, () => fx.setAmbient({ kind: k.fx, rate: 0.05 }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k])

  /* 꾹 누르기: 누르고 있으면 링이 차오르고, 떼면 다시 줄어듭니다 */
  const frame = useCallback(
    (now: number) => {
      const h = hold.current
      const dt = now - (h.last || now)
      h.last = now
      h.p = Math.max(0, Math.min(1, h.p + (h.on ? dt / HOLD_MS : -dt / 400)))
      setProgress(h.p)
      if (h.p >= 1) {
        h.on = false
        breakSeal()
        return
      }
      if (h.on || h.p > 0) h.raf = requestAnimationFrame(frame)
    },
    [breakSeal],
  )
  const press = () => {
    if (stage !== 'closed' || hold.current.on) return
    hold.current.on = true
    hold.current.last = 0
    sfx.tap()
    vibrate(8)
    cancelAnimationFrame(hold.current.raf)
    hold.current.raf = requestAnimationFrame(frame)
  }
  const release = () => {
    hold.current.on = false
  }

  /* 타자기처럼 한 글자씩 */
  useEffect(() => {
    if (stage !== 'card' || typed >= L.m.length) return
    const ch = L.m[typed - 1]
    const t = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 650 : /[.,!?\n]/.test(ch) ? 260 : 45)
    return () => clearTimeout(t)
  }, [stage, typed, L.m])

  useEffect(() => {
    if (done) setMood('opened')
  }, [done, setMood])

  const tilt = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const reply = () => {
    reset({ t: L.f, f: L.t, s: L.s })
    navigate('/pick')
  }

  return (
    <section className="screen reader">
      <Reveal d={0}>
        <div className="brand">마음 우체국</div>
      </Reveal>
      <h2 className="read-title">
        <SplitText text={`${L.t || '당신'}에게 편지가 도착했어요`} delay={0.15} stagger={0.03} />
      </h2>
      <Reveal d={3}>
        <p className="arrive">{L.f ? `${L.f}님이 ${k.name}의 마음을 담아 보냈어요` : `누군가 ${k.name}의 마음을 담아 보냈어요`}</p>
      </Reveal>

      <AnimatePresence mode="wait">
        {stage !== 'card' ? (
          <motion.div
            key="env"
            className={`stage read-stage ${stage === 'closed' ? 'idle' : ''}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60, scale: 0.85, filter: 'blur(4px)' }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div ref={envRef} className="hold-wrap" style={{ '--p': progress } as React.CSSProperties}>
              <Envelope
                icon={k.icon}
                cat={L.c}
                addr={L.t}
                pm={L.d}
                stamped
                font={L.s}
                toLine={`To. ${L.t}`}
                lines={L.m.split('\n').slice(0, 4).join('\n')}
                open={stage === 'open' || stage === 'rise'}
                rise={stage === 'rise'}
                broken={stage !== 'closed'}
                progress={stage === 'closed' ? progress : undefined}
                sealProps={{
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': '봉인을 꾹 눌러 편지 열기',
                  onPointerDown: (e) => {
                    e.preventDefault()
                    // 봉투가 둥실 떠다녀도 손가락을 놓기 전까지는 계속 누르고 있는 것으로 봅니다
                    e.currentTarget.setPointerCapture?.(e.pointerId)
                    press()
                  },
                  onPointerUp: release,
                  onPointerCancel: release,
                  onContextMenu: (e) => e.preventDefault(),
                  onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && (e.preventDefault(), press()),
                  onKeyUp: release,
                }}
              />
            </div>
            {stage === 'closed' && (
              <p className="hint">
                {progress > 0 ? '조금만 더…' : '봉인을 꾹 눌러 뜯어 보세요'}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.article
            key="card"
            ref={cardRef}
            className={`card f${L.s}`}
            initial={{ opacity: 0, y: 80, rotateX: -75, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            onPointerMove={tilt}
            onClick={() => setTyped(L.m.length)}
            aria-live="polite"
          >
            <div className="card-in">
              <span className="glare" aria-hidden="true" />
              <span className={`washi washi-${L.c}`} aria-hidden="true" />
              <div className="cstamp"><Stamp cat={L.c} /></div>
              <div className="cpm"><Postmark date={L.d || '오늘'} /></div>
              <p className="tag">{k.name} · {k.en}</p>
              <p className="w">To. {L.t}</p>
              <div className={`w body ${typed < L.m.length ? 'typing' : ''}`}>{L.m.slice(0, typed)}</div>
              <p className="w from">{L.f || '마음을 담아'} 드림</p>
              <Doodle cat={L.c} play={done} />
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div className="after" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
            <MagneticButton onClick={reply}>
              <span>{L.f ? `${L.f}님에게 답장 쓰기` : '답장 쓰기'}</span>
              <Arrow />
            </MagneticButton>
            <div className="btns" style={{ marginTop: 10 }}>
              <button className="ghost" onClick={onReplay}>다시 열어 보기</button>
              <button className="ghost" onClick={() => (reset(), navigate('/'))}>나도 편지 보내기</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
