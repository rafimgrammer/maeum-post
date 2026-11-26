/**
 * 테마별 배경 분위기 레이어. 튀지 않게, 종이 위에 은은하게 깔리도록 설계했습니다.
 *  공통   — 천천히 흐르는 오로라 빛 + 커서를 따라오는 부드러운 스포트라이트
 *  사랑   — 심장 박동처럼 두근(lub-dub)거리는 분홍빛
 *  고마움 — 오후 햇살이 창으로 비쳐 드는 빛줄기
 *  축하   — 군데군데 반짝이는 별빛
 *  응원   — 새벽 노을과 가끔 지나가는 별똥별
 *  사과   — 잔잔한 비, 편지를 다 읽으면 비가 그치고 무지개
 */
import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTheme, type Mood } from '@/lib/providers'
import type { Cat } from '@/lib/themes'

const seeded = (n: number, salt: number) => {
  const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Sparkles() {
  const items = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ l: seeded(i, 1) * 100, t: seeded(i, 2) * 100, s: 8 + seeded(i, 3) * 14, d: seeded(i, 4) * 4 })),
    [],
  )
  return (
    <>
      {items.map((it, i) => (
        <svg key={i} className="twinkle" viewBox="0 0 24 24" style={{ left: `${it.l}%`, top: `${it.t}%`, width: it.s, animationDelay: `${-it.d}s` }}>
          <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
        </svg>
      ))}
    </>
  )
}

function Rain() {
  const drops = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({ l: seeded(i, 5) * 100, d: 0.7 + seeded(i, 6) * 0.8, delay: seeded(i, 7) * 2, h: 40 + seeded(i, 8) * 50 })),
    [],
  )
  return (
    <>
      {drops.map((r, i) => (
        <span key={i} className="raindrop" style={{ left: `${r.l}%`, height: r.h, animationDuration: `${r.d}s`, animationDelay: `${-r.delay}s` }} />
      ))}
    </>
  )
}

function Layer({ cat, mood }: { cat: Cat; mood: Mood }) {
  switch (cat) {
    case 'love':
      return <div className="beat" />
    case 'thanks':
      return (
        <>
          <div className="rays" />
          <div className="rays r2" />
        </>
      )
    case 'congrats':
      return <Sparkles />
    case 'cheer':
      return (
        <>
          <div className="dawn" />
          <span className="shoot" style={{ top: '12%', left: '70%' }} />
          <span className="shoot" style={{ top: '30%', left: '95%', animationDelay: '-3.2s' }} />
          <span className="shoot" style={{ top: '4%', left: '40%', animationDelay: '-5.6s' }} />
        </>
      )
    case 'sorry':
      return (
        <AnimatePresence>
          {mood === 'opened' ? (
            <motion.div key="bow" className="rainbow" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} />
          ) : (
            <motion.div key="rain" className="rain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }}>
              <Rain />
            </motion.div>
          )}
        </AnimatePresence>
      )
  }
}

export function Atmosphere() {
  const { cat, mood } = useTheme()

  // 커서/기울기 → CSS 변수 (스포트라이트, 3D 틸트에 사용)
  useEffect(() => {
    const root = document.documentElement.style
    const onMove = (e: PointerEvent) => {
      root.setProperty('--cx', `${e.clientX}px`)
      root.setProperty('--cy', `${e.clientY}px`)
      root.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3))
      root.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3))
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      root.setProperty('--mx', Math.max(-1, Math.min(1, e.gamma / 30)).toFixed(3))
      root.setProperty('--my', Math.max(-1, Math.min(1, (e.beta - 45) / 30)).toFixed(3))
    }
    addEventListener('pointermove', onMove)
    addEventListener('deviceorientation', onTilt)
    return () => {
      removeEventListener('pointermove', onMove)
      removeEventListener('deviceorientation', onTilt)
    }
  }, [])

  return (
    <div className="atmo" aria-hidden="true">
      <div className="aura a" />
      <div className="aura b" />
      <div className="aura c" />
      <AnimatePresence>
        {cat && (
          <motion.div key={cat} className={`layer layer-${cat}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <Layer cat={cat} mood={mood} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="spot" />
    </div>
  )
}
