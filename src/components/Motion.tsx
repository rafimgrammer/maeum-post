/** 공용 모션 컴포넌트: 등장, 글자 단위 리빌, 자석 버튼 */
import { useRef, type ReactNode } from 'react'
import { motion, useSpring } from 'motion/react'

const EASE = [0.2, 0.8, 0.2, 1] as const

export function Reveal({ d = 0, children, className, style }: { d?: number; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 26, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.08 + d * 0.09 }}
    >
      {children}
    </motion.div>
  )
}

/** 한 글자씩 블러에서 또렷하게 떠오르는 텍스트 */
export function SplitText({ text, delay = 0, stagger = 0.035 }: { text: string; delay?: number; stagger?: number }) {
  return (
    <span aria-label={text} role="text">
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="ch"
          initial={{ opacity: 0, y: '0.45em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * stagger, duration: 0.7, ease: EASE }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  )
}

interface MagneticProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  onMouseEnter?: () => void
  ariaLabel?: string
}

/** 커서 쪽으로 살짝 끌려오고, 들어온 지점에서 잉크가 번지는 버튼 */
export function MagneticButton({ children, className = '', onClick, onMouseEnter, ariaLabel }: MagneticProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useSpring(0, { stiffness: 260, damping: 18 })
  const y = useSpring(0, { stiffness: 260, damping: 18 })
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={`btn ${className}`}
      style={{ x, y }}
      whileTap={{ scale: 0.96 }}
      onPointerEnter={(e) => {
        const r = ref.current!.getBoundingClientRect()
        ref.current!.style.setProperty('--bx', `${e.clientX - r.left}px`)
        ref.current!.style.setProperty('--by', `${e.clientY - r.top}px`)
        onMouseEnter?.()
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = ref.current!.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.25)
        y.set((e.clientY - r.top - r.height / 2) * 0.35)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

export const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const Back = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
)
