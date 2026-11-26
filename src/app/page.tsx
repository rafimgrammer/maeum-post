/** app/page.tsx — 첫 화면 */
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Envelope, Stamp } from '@/components/Postal'
import { Arrow, MagneticButton, Reveal, SplitText } from '@/components/Motion'
import { useFx, useLetter, useTheme } from '@/lib/providers'
import { navigate, prefetch } from '@/lib/router'
import { sfx } from '@/lib/sound'
import { CATS, ORDER } from '@/lib/themes'

const FLOATERS = [
  { l: '2%', t: '6%', r: -12 },
  { l: '80%', t: '0%', r: 10 },
  { l: '-3%', t: '60%', r: 8 },
  { l: '84%', t: '56%', r: -8 },
  { l: '43%', t: '-8%', r: 4 },
]
const SAMPLES = ORDER.flatMap((c) => CATS[c].tips.slice(0, 2).map((t) => ({ c, t: t.replace('\n', ' ') })))

export default function Home() {
  const { setCat, setMood } = useTheme()
  const { draft } = useLetter()
  const fx = useFx()
  useEffect(() => {
    setCat(null)
    setMood('idle')
    fx.setAmbient({ kind: 'dust', rate: 0.12 })
  }, [setCat, setMood, fx])

  const start = () => {
    sfx.tap()
    navigate(draft.c ? '/write' : '/pick')
  }

  return (
    <section className="screen home">
      <Reveal d={0}>
        <div className="brand">마음 우체국</div>
      </Reveal>
      <h1 className="title">
        <SplitText text="짧은 한마디를" delay={0.15} />
        <br />
        <em className="mark">
          <SplitText text="봉투" delay={0.5} />
        </em>
        <SplitText text="에 담아 보내요" delay={0.58} />
      </h1>
      <Reveal d={4}>
        <p className="lead">
          사랑 · 고마움 · 축하 · 응원 · 사과
          <br />
          어떤 마음이든, 링크 하나로 전해 드릴게요.
        </p>
      </Reveal>

      <Reveal d={5} className="hero">
        <Envelope icon="heart" open peek />
        {ORDER.map((c, i) => (
          <motion.div
            key={c}
            className="floater"
            style={{ left: FLOATERS[i].l, top: FLOATERS[i].t }}
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.2, rotate: 0, zIndex: 10 }}
            whileHover={{ scale: 1.08 }}
            onDragStart={() => sfx.tap()}
            title="끌어 보세요"
          >
            <div className="floater-in" style={{ '--r': `${FLOATERS[i].r}deg`, '--dl': `${-i * 1.1}s` } as React.CSSProperties}>
              <Stamp cat={c} mini />
            </div>
          </motion.div>
        ))}
      </Reveal>

      <Reveal d={6}>
        <MagneticButton onClick={start} onMouseEnter={() => prefetch('/pick')}>
          <span>{draft.c && draft.m ? '쓰던 편지 이어 쓰기' : '편지 쓰러 가기'}</span>
          <Arrow />
        </MagneticButton>
      </Reveal>

      <Reveal d={7} className="how">
        <span><b>1</b>우표 고르기</span><i />
        <span><b>2</b>한마디 쓰기</span><i />
        <span><b>3</b>링크 보내기</span>
      </Reveal>

      <Reveal d={8} className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...SAMPLES, ...SAMPLES].map((s, i) => (
            <span key={i} className="mq-item">
              <i style={{ background: CATS[s.c].color }} />
              {s.t}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal d={9}>
        <p className="foot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          쓴 글은 서버에 저장되지 않고 링크 안에만 담겨요
        </p>
      </Reveal>
    </section>
  )
}
