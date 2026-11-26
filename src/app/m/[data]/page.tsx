/** app/m/[data]/page.tsx — 받는 사람 화면. URL의 [data] 세그먼트에서 편지를 꺼냅니다. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion } from 'motion/react'
import Loading from '@/app/loading'
import { Envelope, Postmark, Stamp } from '@/components/Postal'
import { Doodle } from '@/components/Chrome'
import { Polaroid, type DevState } from '@/components/Polaroid'
import { Arrow, MagneticButton, Reveal, SplitText } from '@/components/Motion'
import { splitData, unpack, unpackPhoto, type Letter } from '@/lib/codec'
import { useFx, useLetter, useTheme } from '@/lib/providers'
import { Link, navigate, type PageProps } from '@/lib/router'
import { sfx, vibrate } from '@/lib/sound'
import { CATS } from '@/lib/themes'

type State = { status: 'loading' } | { status: 'bad' } | { status: 'ok'; letter: Letter; photo: string | null }

export default function ReadPage({ params }: PageProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    let url: string | null = null
    setState({ status: 'loading' })
    // '.' 뒤는 사진. 사진 구간이 깨져 있어도 편지는 그대로 열고 사진만 뺍니다.
    const { letter, photo } = splitData(params.data)
    const blob = photo ? unpackPhoto(photo) : null
    url = blob ? URL.createObjectURL(blob) : null
    unpack(letter)
      .then((l) => alive && setState({ status: 'ok', letter: l, photo: url }))
      .catch(() => alive && setState({ status: 'bad' }))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [params.data])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'bad') return <Broken />
  return <LetterView key={nonce} letter={state.letter} photo={state.photo} onReplay={() => setNonce((n) => n + 1)} />
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
 * 한 번 톡 → 봉인이 갈라짐 → 덮개가 천천히 열리고 안쪽에서 빛이 번짐 → 편지가 입구로 올라옴
 * → 봉투는 아래로 내려가고 편지는 입구 밖으로 완전히 빠져나옴
 * → 빠져나온 그 자리에서 편지가 커지며 접힌 종이가 펼쳐짐 → 단어가 잉크처럼 번지며 나타남
 */
type Stage = 'closed' | 'breaking' | 'open' | 'rise' | 'out' | 'card'
const T_OPEN = 320
const T_RISE = 1020
const T_OUT = 1840
const T_CARD = 2660
/** 카드가 펼쳐진 뒤 글자가 나오기 시작하는 시점(s) */
const INK_START = 0.85

function LetterView({ letter: L, photo: photoSrc, onReplay }: { letter: Letter; photo: string | null; onReplay: () => void }) {
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
  const [photoOk, setPhotoOk] = useState(true)
  const photo = photoOk ? photoSrc : null
  const [dev, setDev] = useState<DevState>('raw')
  const [zoom, setZoom] = useState(false)
  const shakeEnergy = useRef(0)

  /* 글을 단어 단위로 쪼개고, 글이 길수록 간격을 좁혀 전체가 1.5초 안에 나오도록 */
  const tokens = useMemo(() => L.m.split(/(\s+)/).filter(Boolean), [L.m])
  const words = tokens.filter((t) => !/^\s+$/.test(t)).length
  const step = Math.min(0.08, 1.9 / Math.max(words, 1))
  const inkEnd = INK_START + words * step + 0.8
  const ltRect = useRef<DOMRect | null>(null)

  /* 봉투에서 빠져나온 편지 자리에서 카드가 시작되도록 (FLIP) */
  useLayoutEffect(() => {
    const el = cardRef.current
    const l = ltRect.current
    if (stage !== 'card' || !el || !l) return
    const c = el.getBoundingClientRect()
    const s = l.width / c.width
    const dx = l.left + l.width / 2 - (c.left + c.width / 2)
    const dy = l.top - c.top
    const fold = Math.max(0, c.height - l.height / s)
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`
    el.style.clipPath = `inset(0px 0px ${fold}px 0px)`
    animate(el, { x: [dx, 0], y: [dy, 0], scale: [s, 1] }, { type: 'spring', stiffness: 50, damping: 14, mass: 1 })
    animate(el, { clipPath: [`inset(0px 0px ${fold}px 0px)`, 'inset(-90px -90px -90px -90px)'] }, { delay: 0.25, duration: 0.9, ease: [0.6, 0, 0.2, 1] })
  }, [stage])

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

  /* 사진이 실제로 열리는지 확인. 못 열면 사진만 빼고 보여 줌 */
  useEffect(() => {
    if (!photoSrc) return
    const im = new Image()
    im.onerror = () => setPhotoOk(false)
    im.src = photoSrc
  }, [photoSrc])

  /* 글이 다 나오면 현상 시작 */
  useEffect(() => {
    if (done && photo && dev === 'raw') {
      setDev('developing')
      sfx.paper()
    }
  }, [done, photo, dev])

  /* 휴대폰을 흔들어도 현상이 빨라짐 */
  useEffect(() => {
    if (dev !== 'developing') return
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration
      const m = a && a.x != null ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0
      if (m > 9) shakeEnergy.current = Math.min(7, shakeEnergy.current + (m - 9) / 6)
    }
    addEventListener('devicemotion', onMotion)
    return () => removeEventListener('devicemotion', onMotion)
  }, [dev])

  /* 크게 보기: Esc 로 닫기 */
  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(false)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [zoom])

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms))

  const open = () => {
    if (stage !== 'closed') return
    // iOS: 기기 흔들기는 사용자가 처음 누를 때 권한을 물어봐야 함. 거부하면 조용히 넘어감
    const DM = (window as any).DeviceMotionEvent
    if (photo && DM && typeof DM.requestPermission === 'function') DM.requestPermission().catch(() => {})
    setStage('breaking')
    sfx.crack()
    vibrate([10, 30, 18])
    fx.crumbsAt(envRef.current?.querySelector('.seal') ?? null)
    later(T_OPEN, () => (setStage('open'), sfx.paper()))
    later(T_RISE, () => setStage('rise'))
    later(T_OUT, () => {
      setStage('out')
      sfx.whoosh()
      fx.burstAt(k.fx, envRef.current?.querySelector('.lt') ?? envRef.current, 22)
    })
    later(T_CARD, () => {
      ltRect.current = envRef.current?.querySelector('.lt')?.getBoundingClientRect() ?? null
      setStage('card')
      later(550, () => {
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
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
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
              whileTap={stage === 'closed' ? { scale: 0.96 } : undefined}
              animate={{ scale: stage === 'breaking' ? [0.96, 1.04, 1] : 1, y: stage === 'out' ? 130 : 0 }}
              transition={{
                scale: { type: 'spring', stiffness: 260, damping: 14 },
                y: { duration: 0.8, ease: [0.5, 0, 0.25, 1] },
              }}
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
                open={stage === 'open' || stage === 'rise' || stage === 'out'}
                rise={stage === 'rise'}
                broken={stage !== 'closed'}
                className={stage === 'out' ? 'out' : undefined}
                photo={photo}
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
                transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 15 }}
              >
                <Stamp cat={L.c} />
              </motion.div>
              <motion.div
                className="cpm"
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 0.72, scale: 1 }}
                transition={{ delay: 1.32, duration: 0.3, ease: 'easeOut' }}
              >
                <Postmark date={L.d || '오늘'} />
              </motion.div>
              <p className="tag ink-line" style={{ '--d': `${INK_START - 0.2}s` } as CSSProperties}>{k.name} · {k.en}</p>
              <p className="w ink-line" style={{ '--d': `${INK_START - 0.1}s` } as CSSProperties}>To. {L.t}</p>
              {photo && (
                <div className="card-photo" onClick={(e) => e.stopPropagation()}>
                  {zoom ? (
                    <div className="polaroid-ph" aria-hidden="true" />
                  ) : (
                    <Polaroid
                      layoutId="letter-photo"
                      src={photo}
                      caption={L.cap}
                      dev={dev}
                      energy={shakeEnergy}
                      shakeable={dev === 'developing'}
                      onDeveloped={() => setDev('done')}
                      onClick={dev === 'done' ? () => (sfx.tap(), setZoom(true)) : undefined}
                      size={84}
                    />
                  )}
                  <AnimatePresence>
                    {dev === 'developing' && (
                      <motion.p className="shake-hint" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
                        폴라로이드를 흔들어 보세요
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
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

      {/* 현상된 사진 크게 보기 (카드의 transform 영향을 받지 않도록 body 에 띄움) */}
      {photo &&
        createPortal(
          <AnimatePresence>
            {zoom && (
              <motion.div
                key="zoom"
                className="photo-zoom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => setZoom(false)}
                role="dialog"
                aria-modal="true"
                aria-label={L.cap ? `사진: ${L.cap}` : '함께 보낸 사진'}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Polaroid layoutId="letter-photo" src={photo} caption={L.cap} className="big" size={Math.min(innerWidth * 0.68, 300)} />
                </div>
                <button className="zoom-close" onClick={() => setZoom(false)} aria-label="크게 보기 닫기" autoFocus>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  )
}
