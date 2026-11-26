/** 폴라로이드 사진: 인화(쓰기 화면) · 현상(받는 화면) · 흔들어서 현상하기 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type MutableRefObject, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { b64u, unb64u } from '@/lib/codec'
import { PhotoError, drawSquare, encodePhoto, formatKB, loadPhoto } from '@/lib/photo'
import type { DraftPhoto } from '@/lib/providers'
import { sfx, vibrate } from '@/lib/sound'

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 작성 중 사진(base64url) → object URL. 바뀌거나 사라지면 revoke */
export function usePhotoUrl(photo?: DraftPhoto | null) {
  const url = useMemo(() => {
    if (!photo) return null
    try {
      return URL.createObjectURL(new Blob([unb64u(photo.b64)], { type: photo.mime }))
    } catch {
      return null
    }
  }, [photo])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}

/** 은색 종이 클립 */
const Clip = () => (
  <svg className="pclip" viewBox="0 0 22 52" aria-hidden="true">
    <defs>
      <linearGradient id="pclip-g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d929a" />
        <stop offset=".35" stopColor="#f4f6f8" />
        <stop offset=".6" stopColor="#b7bcc3" />
        <stop offset="1" stopColor="#7c818a" />
      </linearGradient>
    </defs>
    <path
      d="M7 40V9a4 4 0 0 1 8 0v34a6 6 0 0 1-12 0V12"
      fill="none"
      stroke="url(#pclip-g)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

/* ---------- 현상 ---------- */
export type DevState = 'raw' | 'developing' | 'done'
const DEV_MS = 4000

const ease = (p: number) => Math.pow(p, 2.2)
/** 하얗게 바랜 막의 불투명도 (어두운 사진도 처음엔 거의 하얗게 보이도록 필터 위에 한 겹 더) */
const devVeil = (p: number) => (p >= 1 ? 0 : 0.78 * (1 - ease(Math.min(1, p * 1.15))))

/** 0→1 진행도를 필터로. ease-in 이라 처음 1초는 거의 하얗고 그다음 윤곽이 떠오릅니다. */
function devFilter(p: number) {
  if (p >= 1) return 'none'
  const e = ease(p)
  return `brightness(${(1.9 - 0.9 * e).toFixed(3)}) saturate(${e.toFixed(3)}) contrast(${(0.45 + 0.55 * e).toFixed(3)}) sepia(${(0.2 - 0.2 * e).toFixed(3)})`
}

interface PolaroidProps {
  src: string
  caption?: string
  /** 'raw' 하얀 상태 · 'developing' 현상 중 · 'done' 다 현상됨 (기본: done) */
  dev?: DevState
  onDeveloped?: () => void
  /** 기기 흔들기 등 바깥에서 더해 주는 '흔들림 에너지' */
  energy?: MutableRefObject<number>
  /** 잡고 흔들 수 있는지 */
  shakeable?: boolean
  size?: number
  onClick?: () => void
  layoutId?: string
  className?: string
  /** 캡션 자리를 직접 채울 때(쓰기 화면의 입력칸) */
  children?: ReactNode
}

export function Polaroid({ src, caption, dev = 'done', onDeveloped, energy, shakeable, size = 92, onClick, layoutId, className = '', children }: PolaroidProps) {
  const img = useRef<HTMLImageElement>(null)
  const veil = useRef<HTMLSpanElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const p = useRef(dev === 'done' ? 1 : 0)
  const shakeE = useRef(0)
  const dragged = useRef(false)
  const cb = useRef(onDeveloped)
  cb.current = onDeveloped
  const [flash, setFlash] = useState(false)

  // 잡고 흔들면 손을 따라 출렁이도록 (가로 이동 → 기울기)
  const x = useMotionValue(0)
  const tilt = useSpring(useTransform(x, [-90, 90], [-16, 16]), { stiffness: 260, damping: 9 })

  useEffect(() => {
    const el = img.current
    if (!el) return
    const setVeil = (v: number) => veil.current && (veil.current.style.opacity = String(v))
    if (dev === 'done' || reduceMotion()) {
      p.current = 1
      el.style.filter = 'none'
      setVeil(0)
      if (dev === 'developing') cb.current?.()
      return
    }
    if (dev === 'raw') {
      p.current = 0
      el.style.filter = devFilter(0)
      setVeil(devVeil(0))
      return
    }
    // developing
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const ext = energy?.current ?? 0
      const boost = 1 + Math.min(7, shakeE.current + ext)
      shakeE.current *= 0.9
      if (energy) energy.current *= 0.9
      p.current = Math.min(1, p.current + (dt / DEV_MS) * boost)
      el.style.filter = devFilter(p.current)
      setVeil(devVeil(p.current))
      if (p.current >= 1) {
        setFlash(true)
        vibrate(10)
        cb.current?.()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dev, energy])

  const alt = caption?.trim() || '함께 보낸 사진'
  const style = { '--ps': `${size}px` } as React.CSSProperties

  return (
    <motion.div layoutId={layoutId} className={`polaroid ${className}`} style={style}>
      <motion.div
        ref={frame}
        className={`pframe ${flash ? 'flash' : ''} ${onClick ? 'clickable' : ''}`}
        style={shakeable ? { x, rotate: tilt } : undefined}
        drag={shakeable ? true : false}
        dragSnapToOrigin
        dragElastic={0.4}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDrag={(_, info) => {
          shakeE.current = Math.min(7, shakeE.current + Math.abs(info.velocity.x) / 2600 + Math.abs(info.velocity.y) / 5200)
        }}
        whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
        onClick={
          onClick &&
          (() => {
            // 흔들다가 손을 뗀 것은 '누르기'가 아님
            if (dragged.current) return void (dragged.current = false)
            onClick()
          })
        }
        onPointerDown={() => (dragged.current = false)}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `사진 크게 보기${caption ? `: ${caption}` : ''}` : undefined}
      >
        <Clip />
        <div className="pphoto">
          <img ref={img} src={src} alt={alt} draggable={false} style={{ filter: dev === 'done' ? 'none' : devFilter(0) }} />
          <span ref={veil} className="pveil" aria-hidden="true" style={{ opacity: dev === 'done' ? 0 : devVeil(0) }} />
        </div>
        <div className="pcap">{children ?? (caption ? <span>{caption}</span> : null)}</div>
      </motion.div>
    </motion.div>
  )
}

/* =========================================================
   쓰기 화면: 사진 한 장 넣기
   ========================================================= */
interface PickerProps {
  photo?: DraftPhoto
  cap?: string
  onPhoto: (p: DraftPhoto | undefined) => void
  onCap: (c: string) => void
}

export function PhotoPicker({ photo, cap, onPhoto, onCap }: PickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const bmp = useRef<ImageBitmap | null>(null)
  const crop = useRef({ x: 0.5, y: 0.5 })
  const dragAt = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [canCrop, setCanCrop] = useState(false)
  const url = usePhotoUrl(photo)
  const bytes = photo ? Math.floor((photo.b64.length * 3) / 4) : 0

  useEffect(() => () => bmp.current?.close(), [])

  const take = async (file?: File | null) => {
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      const b = await loadPhoto(file)
      bmp.current?.close()
      bmp.current = b
      crop.current = { x: 0.5, y: 0.5 }
      const r = await encodePhoto(b)
      onPhoto({ b64: b64u(r.bytes), mime: r.mime })
      setCanCrop(b.width !== b.height)
      sfx.paper()
    } catch (e) {
      setErr(e instanceof PhotoError ? e.message : '사진을 인화하지 못했어요. 다른 사진으로 해 볼까요?')
    } finally {
      setBusy(false)
    }
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    take(e.target.files?.[0])
    e.target.value = ''
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files?.[0])
  }
  const dragProps = {
    onDragOver: (e: DragEvent) => (e.preventDefault(), !over && setOver(true)),
    onDragEnter: (e: DragEvent) => (e.preventDefault(), setOver(true)),
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) setOver(false)
    },
    onDrop,
  }

  const remove = () => {
    sfx.tap()
    bmp.current?.close()
    bmp.current = null
    setCanCrop(false)
    setPreview(null)
    onPhoto(undefined)
    onCap('')
  }

  /* 사진을 끌어 잘리는 위치 옮기기 (원본을 들고 있을 때만) */
  const cropDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!bmp.current || !canCrop) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragAt.current = { x: e.clientX, y: e.clientY, cx: crop.current.x, cy: crop.current.y }
  }
  const cropMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragAt.current
    const b = bmp.current
    if (!d || !b) return
    const w = e.currentTarget.getBoundingClientRect().width || 1
    const side = Math.min(b.width, b.height)
    const kx = b.width > side ? side / (b.width - side) : 0
    const ky = b.height > side ? side / (b.height - side) : 0
    crop.current = {
      x: Math.max(0, Math.min(1, d.cx - ((e.clientX - d.x) / w) * kx)),
      y: Math.max(0, Math.min(1, d.cy - ((e.clientY - d.y) / w) * ky)),
    }
    setPreview(drawSquare(b, 120, crop.current.x, crop.current.y).toDataURL('image/jpeg', 0.85))
  }
  const cropUp = async () => {
    if (!dragAt.current || !bmp.current) return
    dragAt.current = null
    const r = await encodePhoto(bmp.current, crop.current.x, crop.current.y)
    onPhoto({ b64: b64u(r.bytes), mime: r.mime })
    setPreview(null)
  }

  return (
    <div className="photo-slot">
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      <AnimatePresence mode="wait" initial={false}>
        {busy ? (
          <motion.div key="busy" className="photo-busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
            <div className="pframe skel">
              <div className="pphoto" />
              <div className="pcap" />
            </div>
            <span>인화하는 중…</span>
          </motion.div>
        ) : photo && url ? (
          <motion.div
            key={'photo'}
            className="photo-ready"
            initial={{ opacity: 0, y: -70, rotate: -14 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 13 }}
            {...dragProps}
          >
            <div className={`photo-edit ${over ? 'over' : ''}`}>
              <div
                className={`photo-crop ${canCrop ? 'can' : ''}`}
                onPointerDown={cropDown}
                onPointerMove={cropMove}
                onPointerUp={cropUp}
                onPointerCancel={cropUp}
              >
                <Polaroid src={preview ?? url} caption={cap} size={104}>
                  <input
                    className="pcap-input"
                    value={cap ?? ''}
                    maxLength={12}
                    placeholder="26.11 속초"
                    aria-label="사진 캡션 (12자까지)"
                    onChange={(e) => onCap(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                </Polaroid>
              </div>
              <button className="photo-x" onClick={remove} aria-label="사진 빼기">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="photo-meta">
              <p className="photo-size">사진 {formatKB(bytes)} · 링크에 함께 담겨요</p>
              {canCrop && <p className="photo-tip">사진을 끌어 보이는 부분을 옮길 수 있어요</p>}
              <button className="ghost small" onClick={() => (sfx.tap(), input.current?.click())}>다시 고르기</button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            type="button"
            className={`photo-empty ${over ? 'over' : ''}`}
            onClick={() => (sfx.tap(), input.current?.click())}
            aria-label="사진 한 장 넣기 (선택)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: over ? 1.06 : 1, rotate: over ? -4 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            {...dragProps}
          >
            <span className="pframe ghostframe" aria-hidden="true">
              <span className="pphoto">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" />
                  <circle cx="12" cy="13.2" r="3.4" />
                </svg>
              </span>
            </span>
            <span className="photo-empty-txt">
              <b>사진 한 장 넣기</b>
              <small>선택 · 폴라로이드로 인화해 편지에 꽂아 드려요</small>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <p className="photo-err" role="alert">{err}</p>
    </div>
  )
}
