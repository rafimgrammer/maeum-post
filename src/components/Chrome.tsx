/** 화면 공통 UI: 상단 진행 바, 사운드 토글, 테마별 손그림 낙서 */
import { motion } from 'motion/react'
import { navigate } from '@/lib/router'
import { sound, useSound } from '@/lib/sound'
import type { Cat } from '@/lib/themes'
import { Back } from './Motion'

export function TopBar({ step, back }: { step: number; back?: string }) {
  return (
    <div className="top">
      {back ? (
        <button className="back" onClick={() => navigate(back)} aria-label="뒤로">
          <Back />
        </button>
      ) : (
        <span className="back-ph" />
      )}
      <div className="steps" aria-label={`3단계 중 ${step}단계`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className="stp">
            {i <= step && <motion.i layoutId={i === step ? 'step-active' : undefined} className="on" />}
          </span>
        ))}
      </div>
      <span className="back-ph" />
    </div>
  )
}

export function SoundToggle() {
  const on = useSound()
  return (
    <button className="sound" onClick={sound.toggle} aria-label={on ? '소리 끄기' : '소리 켜기'} aria-pressed={on}>
      <span className={`eq ${on ? 'on' : ''}`}>
        <i /><i /><i /><i />
      </span>
      <span className="sound-label">{on ? 'SOUND ON' : 'SOUND OFF'}</span>
    </button>
  )
}

/** 편지 모서리에 펜으로 그려지는 테마별 낙서 */
const DOODLES: Record<Cat, string[]> = {
  love: [
    'M30 58 C 8 42, 10 18, 28 24 C 32 12, 54 12, 50 32 C 48 44, 40 52, 30 58 Z',
    'M58 50 q 8 -12 16 0 t 16 0 t 16 0',
    'M100 22 c -3 -6 -11 -3 -8 3 l 8 8 l 8 -8 c 3 -6 -5 -9 -8 -3',
  ],
  thanks: [
    'M12 70 C 36 52, 64 40, 108 18',
    'M38 56 c -12 -6 -14 -18 -6 -24 c 6 8 8 16 6 24',
    'M60 44 c -4 -14 2 -24 12 -24 c 0 10 -4 18 -12 24',
    'M62 46 c 12 4 22 0 28 -8 c -10 -4 -20 0 -28 8',
    'M86 30 c -2 -10 4 -16 12 -16 c -1 8 -5 13 -12 16',
  ],
  congrats: [
    'M8 64 c 14 -26 30 6 46 -14 s 22 -16 30 -4 s 18 6 26 -20',
    'M94 6 l 3 8 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 z',
    'M20 22 l 2 5 5 1 -4 3 1 5 -4 -2 -4 2 1 -5 -4 -3 5 -1 z',
  ],
  cheer: [
    'M24 10 l 6 14 15 2 -11 10 3 15 -13 -7 -13 7 3 -15 -11 -10 15 -2 z',
    'M52 60 C 70 52, 94 52, 114 58',
    'M104 48 l 10 10 -12 6',
  ],
  sorry: [
    'M8 52 L 44 44 L 60 12 L 58 42 L 96 30 L 64 50 L 40 62 Z',
    'M44 44 L 58 42 L 64 50',
    'M100 20 q 8 -10 16 -4',
  ],
}

export function Doodle({ cat, play }: { cat: Cat; play: boolean }) {
  return (
    <svg className={`doodle doodle-${cat}`} viewBox="0 0 120 80" aria-hidden="true">
      {DOODLES[cat].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={play ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 0.9, delay: i * 0.35, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  )
}
