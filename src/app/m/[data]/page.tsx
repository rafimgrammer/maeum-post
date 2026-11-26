/** app/m/[data]/page.tsx — 받는 사람 화면. URL의 [data] 세그먼트에서 편지를 꺼냅니다. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
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

/**
 * 한 번 톡 → 봉인이 갈라짐 → 덮개가 열리고 안쪽에서 빛이 번짐 → 편지가 쑥 올라옴
 * → 편지가 날아올라 커지며 접힌 종이가 펼쳐짐 → 단어가 잉크처럼 번지며 나타남
 */
type Stage = 'closed' | 'breaking' | 'open' | 'rise' | 'card'
const T_OPEN = 200
const T_RISE = 560
const T_CARD = 1120
/** 카드가 펼쳐진 뒤 글자가 나오기 시작하는 시점(s) */
const INK_START = 0.55

function LetterView({ letter: L, onReplay }: { letter: Letter; onReplay: () => void }) {
  const k = CATS[L.c]
  const { setCat, setMood } = useTheme()
  const { reset } = useLetter()
  const fx = useFx()
  const [stage, setStage] = useState<Stage>('closed')
  const [done, setDone] = useState(false)
  const [instant, setInstant] = useState(false)
  const envRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  /* 글을 단어 단위로 쪼개고, 글이 길수록 간격을 좁혀 전체가 1.5초 안에 나오도록 */
  const tokens = useMemo(() => L.m.split(/(\s+)/).filter(Boolean), [L.m])
  const words = tokens.filter((t) => !/^\s+$/.test(t)).length
  const step = Math.min(0.07, 1.5 / Math.max(words, 1))
  const inkEnd = INK_START + words * step + 0.6

  useEffect(() => {
    setCat(L.c)
    setMood('idle')
    fx.setAmbient({ kind: 'dust', rate: 0.12 })
    const t = timers.current
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (done) setMood('opened')
  }, [done, setMood])

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms))

  const open = () => {
    if (stage !== 'closed') return
    setStage('breaking')
    sfx.crack()
    vibrate([10, 30, 18])
    fx.crumbsAt(envRef.current?.querySelector('.seal') ?? null)
    later(T_OPEN, () => (setStage('open'), sfx.paper()))
    later(T_RISE, () => {
      setStage('rise')
      fx.burstAt(k.fx, envRef.current?.querySelector('.lt') ?? envRef.current, 26)
    })
    later(T_CARD, () => {
      setStage('card')
      sfx.whoosh()
      later(260, () => {
        sfx.chime(k.notes)
        vibrate(14)
        const r = cardRef.current?.getBoundingClientRect()
        fx.burst(k.fx, innerWidth / 2, r ? r.top + Math.min(r.height, innerHeight) * 0.35 : innerHeight * 0.4, 80)
        fx.setAmbient({ kind: k.fx, rate: 0.18 })
      })
      later(inkEnd * 1000, () => setDone(true))
      later(6000, () => fx.setAmbient({ kind: k.fx, rate: 0.05 }))
    })
  }

  /* 글이 나오는 도중에 카드를 누르면 바로 전부 보여 줌 */
  const finish = () => {
    if (done) return
    setInstant(true)
    setDone(true)
  }

  const tilt = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const reply = () => {
    reset({ t: L.f, f: L.t, s: L.s })
    navigate('/pick')
  }

  let wi = 0
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

      <AnimatePresence mode="popLayout">
        {stage !== 'card' ? (
          <motion.div
            key="env"
            className={`stage read-stage ${stage}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 140, scale: 0.86, rotate: 4, filter: 'blur(6px)', transition: { duration: 0.6, ease: [0.4, 0, 0.6, 1] } }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className="bloom" aria-hidden="true" />
            <motion.div
              ref={envRef}
              className="tap-env"
              role="button"
              tabIndex={0}
              aria-label="봉투를 눌러 편지 열기"
              onClick={open}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
              whileTap={stage === 'closed' ? { scale: 0.95 } : undefined}
              animate={stage === 'breaking' ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 15 }}
            >
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
              />
            </motion.div>
            <AnimatePresence>
              {stage === 'closed' && (
                <motion.p className="hint" exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}>
                  <span className="tap-dot" aria-hidden="true" />
                  봉투를 톡 눌러 열어 보세요
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.article
            key="card"
            ref={cardRef}
            className={`card f${L.s}`}
            initial={{ opacity: 0, y: 170, scale: 0.56, rotateX: 38, rotateZ: -3, clipPath: 'inset(-60px -60px 64% -60px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, rotateZ: 0, clipPath: 'inset(-60px -60px -12% -60px)' }}
            transition={{
              default: { type: 'spring', stiffness: 85, damping: 15, mass: 0.9 },
              opacity: { duration: 0.25 },
              clipPath: { delay: 0.18, duration: 0.75, ease: [0.65, 0, 0.25, 1] },
            }}
            onPointerMove={tilt}
            onClick={finish}
            aria-live="polite"
          >
            <div className="card-in">
              <span className="glare" aria-hidden="true" />
              <span className="sheen" aria-hidden="true" />
              <span className={`washi washi-${L.c}`} aria-hidden="true" />
              <motion.div
                className="cstamp"
                initial={{ opacity: 0, scale: 1.8, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 5 }}
                transition={{ delay: 0.75, type: 'spring', stiffness: 300, damping: 14 }}
              >
                <Stamp cat={L.c} />
              </motion.div>
              <motion.div
                className="cpm"
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 0.72, scale: 1 }}
                transition={{ delay: 0.95, duration: 0.25, ease: 'easeOut' }}
              >
                <Postmark date={L.d || '오늘'} />
              </motion.div>
              <p className="tag ink-line" style={{ '--d': `${INK_START - 0.2}s` } as CSSProperties}>{k.name} · {k.en}</p>
              <p className="w ink-line" style={{ '--d': `${INK_START - 0.1}s` } as CSSProperties}>To. {L.t}</p>
              <div className={`w body ${instant ? 'instant' : ''}`} aria-label={L.m}>
                {tokens.map((t, i) =>
                  /^\s+$/.test(t) ? (
                    t
                  ) : (
                    <span key={i} className="ink-w" aria-hidden="true" style={{ '--d': `${INK_START + wi++ * step}s` } as CSSProperties}>
                      {t}
                    </span>
                  ),
                )}
              </div>
              <p className={`w from ink-line ${instant ? 'instant' : ''}`} style={{ '--d': `${inkEnd - 0.45}s` } as CSSProperties}>
                {L.f || '마음을 담아'} 드림
              </p>
              <Doodle cat={L.c} play={done} />
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div className="after" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: instant ? 0.1 : 0.4, duration: 0.7 }}>
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
