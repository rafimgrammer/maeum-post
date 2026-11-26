/** app/pick/page.tsx — 우표(마음) 고르기. 우표에 마우스를 올리면 배경 분위기가 미리 바뀝니다. */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Postmark, Stamp } from '@/components/Postal'
import { TopBar } from '@/components/Chrome'
import { Reveal, SplitText } from '@/components/Motion'
import { useFx, useLetter, useTheme } from '@/lib/providers'
import { navigate, prefetch } from '@/lib/router'
import { sfx, vibrate } from '@/lib/sound'
import { CATS, ORDER, type Cat } from '@/lib/themes'

const ROT = [-4, 2, -2, 3, -3]

export default function Pick() {
  const { draft, update } = useLetter()
  const { setCat, setMood } = useTheme()
  const fx = useFx()
  const [picked, setPicked] = useState<Cat | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    setCat(draft.c)
    setMood('idle')
    fx.setAmbient({ kind: 'dust', rate: 0.1 })
    prefetch('/write')
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = (c: Cat, el: HTMLElement) => {
    if (picked) return
    setPicked(c)
    setCat(c)
    update({ c })
    sfx.stamp()
    vibrate(18)
    fx.burstAt(CATS[c].fx, el, 40)
    timer.current = setTimeout(() => navigate('/write'), 900)
  }

  return (
    <section className="screen">
      <TopBar step={1} back="/" />
      <h2>
        <SplitText text="어떤 마음을 보낼까요?" delay={0.05} stagger={0.025} />
      </h2>
      <Reveal d={2}>
        <p className="lead sub">마음에 맞는 우표를 골라 주세요</p>
      </Reveal>
      <div className={`cats ${picked ? 'chosen' : ''}`} role="list">
        {ORDER.map((c, i) => (
          <motion.button
            key={c}
            role="listitem"
            className={`cat ${picked === c ? 'picked' : ''}`}
            style={{ '--rot': `${ROT[i]}deg` } as React.CSSProperties}
            initial={{ opacity: 0, y: 50, rotate: ROT[i] * 4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.25 + i * 0.07 }}
            onPointerEnter={() => !picked && setCat(c)}
            onPointerLeave={() => !picked && setCat(draft.c)}
            onFocus={() => !picked && setCat(c)}
            onClick={(e) => choose(c, e.currentTarget)}
            aria-label={`${CATS[c].name} 우표 고르기`}
          >
            <Stamp cat={c} />
            <span className="desc">{CATS[c].desc}</span>
            {picked === c && (
              <motion.span
                className="ok"
                initial={{ opacity: 0, scale: 1.8, rotate: -30 }}
                animate={{ opacity: 0.85, scale: 1, rotate: -18 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.08 }}
              >
                <Postmark date="접수" />
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </section>
  )
}
