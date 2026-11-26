/** 우편 소품: 아이콘, 우표, 소인, 봉투 */
import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent } from 'react'
import { CATS, type Cat, type IconName } from '@/lib/themes'

export function CatIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === 'heart' && <path fill="currentColor" d="M12 20.6C6 16.4 2.5 13 2.5 8.9 2.5 6 4.7 3.8 7.4 3.8c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 2.7 0 4.9 2.2 4.9 5.1 0 4.1-3.5 7.5-9.5 11.7z" />}
      {name === 'flower' && (
        <>
          <g fill="currentColor">
            <circle cx="12" cy="6.3" r="3.6" /><circle cx="17.4" cy="10.2" r="3.6" /><circle cx="15.3" cy="16.6" r="3.6" />
            <circle cx="8.7" cy="16.6" r="3.6" /><circle cx="6.6" cy="10.2" r="3.6" />
          </g>
          <circle cx="12" cy="11.6" r="2.6" fill="#fff6ea" opacity=".9" />
        </>
      )}
      {name === 'spark' && (
        <g fill="currentColor">
          <path d="M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4z" />
          <circle cx="19.5" cy="4.5" r="1.6" /><circle cx="4.8" cy="19" r="1.2" />
        </g>
      )}
      {name === 'star' && <path fill="currentColor" d="M12 2.2l2.95 6.1 6.7.95-4.85 4.7 1.15 6.65L12 17.45 6.05 20.6l1.15-6.65L2.35 9.25l6.7-.95z" />}
      {name === 'leaf' && (
        <>
          <path fill="currentColor" d="M12 21.5v-7.3c0-4.6 3.4-8.4 8.5-9.4-.3 6.1-3.6 9.9-8.5 10.3M12 14.2C11.7 9.9 8.8 6.9 3.6 6.4c0 4.9 3.1 8 8.4 7.8" />
          <path d="M12 21.5v-8" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  )
}

/** 톱니 테두리 우표. 마우스를 올리면 홀로그램 빛이 포인터를 따라갑니다. */
export function Stamp({ cat, mini, className = '' }: { cat: Cat; mini?: boolean; className?: string }) {
  const k = CATS[cat]
  const ref = useRef<HTMLSpanElement>(null)
  const move = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    ref.current!.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`)
    ref.current!.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  return (
    <span ref={ref} className={`stamp ${mini ? 'mini' : ''} ${className}`} style={{ '--c': k.color } as CSSProperties} onPointerMove={mini ? undefined : move}>
      <span className="in">
        <span className="val">₩ 마음</span>
        <CatIcon name={k.icon} />
        <b>{k.name}</b>
        <small>{k.en}</small>
        {!mini && <span className="holo" />}
      </span>
    </span>
  )
}

export function Postmark({ date, className = '' }: { date: string; className?: string }) {
  return (
    <svg className={`postmark ${className}`} viewBox="0 0 140 80" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="40" cy="40" r="34" />
        <circle cx="40" cy="40" r="27" strokeWidth="1" />
        <path d="M80 26c8-5 14 5 22 0s14-5 22 0 M80 40c8-5 14 5 22 0s14-5 22 0 M80 54c8-5 14 5 22 0s14-5 22 0" />
      </g>
      <text x="40" y="30" textAnchor="middle" fontSize="8" fill="currentColor" letterSpacing="1">마음 우체국</text>
      <text x="40" y="45" textAnchor="middle" fontSize={date.length > 4 ? 10 : 15} fill="currentColor" fontWeight="700">{date}</text>
      <text x="40" y="57" textAnchor="middle" fontSize="7" fill="currentColor" letterSpacing="2">POST</text>
    </svg>
  )
}

interface EnvelopeProps {
  icon: IconName
  open?: boolean
  rise?: boolean
  stamped?: boolean
  peek?: boolean
  broken?: boolean
  toLine?: string
  lines?: string
  addr?: string
  cat?: Cat | null
  pm?: string
  font?: number
  progress?: number
  sealProps?: HTMLAttributes<HTMLDivElement>
  className?: string
  style?: CSSProperties
}

/** CSS 3D로 접히는 봉투. 덮개(flap)·주머니(pocket)·편지(lt)·왁스 씰로 구성됩니다. */
export function Envelope(p: EnvelopeProps) {
  const cls = ['env', p.open && 'open', p.rise && 'rise', p.stamped && 'stamped', p.peek && 'peek', p.className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={p.style}>
      <div className="back-p" />
      <div className={`lt w f${p.font ?? 0}`}>
        <b>{p.toLine ?? 'To. 소중한 너에게'}</b>
        {p.lines ?? '늘 고마운 마음,\n오늘은 꼭 전하고 싶어서\n짧게 적어 봐요.'}
      </div>
      <div className="pocket" />
      <div className="flap" />
      <div className={`seal ${p.broken ? 'broken' : ''}`} {...p.sealProps}>
        {p.progress != null && (
          <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="47" pathLength={1} style={{ strokeDashoffset: 1 - p.progress }} />
          </svg>
        )}
        <span className="h l"><CatIcon name={p.icon} /></span>
        <span className="h r"><CatIcon name={p.icon} /></span>
      </div>
      {p.addr != null && (
        <div className="addr">
          <small>TO.</small>
          {p.addr}
        </div>
      )}
      {p.cat && (
        <div className="slot">
          <Stamp cat={p.cat} mini />
        </div>
      )}
      {p.pm && (
        <div className="pm">
          <Postmark date={p.pm} />
        </div>
      )}
    </div>
  )
}
