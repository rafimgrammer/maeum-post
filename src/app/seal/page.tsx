/** app/seal/page.tsx — 봉인 애니메이션과 링크 공유 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import QRCode from 'qrcode'
import { Envelope } from '@/components/Postal'
import { TopBar } from '@/components/Chrome'
import { draftKey, useFx, useLetter, useTheme, useToast } from '@/lib/providers'
import { linkFor, pack, packPhoto, unb64u } from '@/lib/codec'
import { usePhotoUrl } from '@/components/Polaroid'
import { navigate } from '@/lib/router'
import { kakaoReady, preloadKakao, shareKakao } from '@/lib/kakao'
import { sfx, vibrate } from '@/lib/sound'
import { CATS, today } from '@/lib/themes'

/** 0 편지가 봉투 위 → 1 편지가 들어감 → 2 덮개 닫힘 → 3 왁스·소인 → 4 날아오름 → 5 결과 */
type Phase = 0 | 1 | 2 | 3 | 4 | 5

export default function Seal() {
  const { draft, sealed, setSealed, reset } = useLetter()
  const { setCat, setMood } = useTheme()
  const fx = useFx()
  const toast = useToast()
  const key = draftKey(draft)
  const already = useRef(sealed?.key === key).current
  const [phase, setPhase] = useState<Phase>(already ? 5 : 0)
  const [link, setLink] = useState(already ? sealed!.link : '')
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [sending, setSending] = useState(false)
  const envRef = useRef<HTMLDivElement>(null)
  const ok = !!draft.c && !!draft.m.trim()
  const photoUrl = usePhotoUrl(draft.photo)

  useEffect(() => {
    if (!ok) {
      navigate(draft.c ? '/write' : '/pick', { replace: true })
      return
    }
    setCat(draft.c)
    setMood('idle')
    fx.setAmbient(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 링크 만들기 (편지 데이터 → URL 해시)
  useEffect(() => {
    if (!ok || already) return
    let alive = true
    const cap = draft.photo && draft.cap?.trim() ? { cap: draft.cap.trim().slice(0, 12) } : {}
    pack({ c: draft.c!, t: draft.t, f: draft.f, m: draft.m, s: draft.s, d: today(), ...cap }).then((d) => {
      if (!alive) return
      const ph = draft.photo ? packPhoto(unb64u(draft.photo.b64), draft.photo.mime) : ''
      const l = linkFor(d + ph)
      setLink(l)
      setSealed({ key, link: l })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 봉인 타임라인
  useEffect(() => {
    if (!ok || already) return
    const k = CATS[draft.c!]
    const seal = () => envRef.current?.querySelector('.seal') ?? null
    const T = [
      setTimeout(() => (setPhase(1), sfx.paper()), 700),
      setTimeout(() => (setPhase(2), sfx.whoosh()), 1650),
      setTimeout(() => (fx.crumbsAt(seal()), sfx.stamp(), vibrate(20)), 2650),
      setTimeout(() => setPhase(3), 2900),
      setTimeout(() => (setPhase(4), fx.burstAt(k.fx, envRef.current, 70), sfx.chime(k.notes)), 3450),
      setTimeout(() => setPhase(5), 4300),
    ]
    return () => T.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(preloadKakao, [])

  useEffect(() => {
    if (!link) return
    QRCode.toDataURL(link, { margin: 1, width: 360, errorCorrectionLevel: 'L', color: { dark: '#3f2d22', light: '#fcf8ef' } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [link])

  if (!ok) return null
  const k = CATS[draft.c!]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const i = document.getElementById('link') as HTMLInputElement
      i.select()
      document.execCommand('copy')
    }
    sfx.tap()
    setCopied(true)
    toast('링크를 복사했어요')
    fx.burstAt(k.fx, document.getElementById('copy'), 24)
    setTimeout(() => setCopied(false), 1800)
  }

  const kakao = async () => {
    if (sending) return
    sfx.tap()
    setSending(true)
    fx.burstAt(k.fx, document.getElementById('kakao'), 18)
    try {
      await shareKakao({ data: link.split('#/m/')[1], cat: draft.c!, to: draft.t, from: draft.f })
    } catch {
      toast('카카오톡 공유를 불러오지 못했어요')
    } finally {
      setTimeout(() => setSending(false), 1200)
    }
  }

  const preview = () => navigate(`/m/${link.split('#/m/')[1]}`)
  const fresh = () => {
    reset()
    setSealed(null)
    navigate('/pick')
  }

  return (
    <section className="screen">
      <TopBar step={3} />
      <div className="stage seal-stage">
        <motion.div
          ref={envRef}
          initial={already ? { y: -30, rotate: 3, scale: 0.82 } : false}
          animate={phase >= 4 ? { y: -30, rotate: 3, scale: 0.82 } : { y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          <Envelope
            icon={k.icon}
            open={phase < 2}
            rise={phase < 1}
            stamped={phase >= 3}
            toLine={`To. ${draft.t}`}
            lines={draft.m.split('\n').slice(0, 4).join('\n')}
            addr={draft.t}
            cat={draft.c}
            pm={today()}
            font={draft.s}
            photo={photoUrl}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {phase >= 5 && link && (
          <motion.div className="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>
            <h2>편지가 봉인됐어요</h2>
            <p className="lead sub">
              링크를 보내면 받는 사람이 직접
              <br />
              봉인을 뜯고 편지를 읽을 수 있어요.
            </p>
            {kakaoReady() && (
              <>
                <motion.button
                  id="kakao"
                  className="kakao-share"
                  onClick={kakao}
                  disabled={sending}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3.2C6.36 3.2 1.8 6.79 1.8 11.2c0 2.85 1.9 5.35 4.76 6.77l-.97 3.55c-.09.32.27.58.55.39l4.24-2.8c.53.06 1.07.09 1.62.09 5.64 0 10.2-3.58 10.2-8S17.64 3.2 12 3.2z" />
                  </svg>
                  <span>{sending ? '카카오톡 여는 중…' : '카카오톡으로 편지 보내기'}</span>
                </motion.button>
                <div className="or"><span>또는 링크로 보내기</span></div>
              </>
            )}
            <div className="linkbox">
              <input id="link" value={link} readOnly aria-label="만들어진 링크" onFocus={(e) => e.target.select()} />
              <button id="copy" className="btn small" onClick={copy}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={copied ? 'y' : 'n'} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.18 }}>
                    {copied ? '복사됨 ✓' : '복사'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {draft.photo && (
              <p className="note photo-note">
                {qr
                  ? '사진이 담겨서 링크가 길어졌어요. 메신저에서 잘 안 열리면 QR 우편 라벨로 보내 보세요.'
                  : '사진이 담겨서 링크가 길어졌어요. 메신저에서 잘 안 열리면 위의 링크를 복사해서 보내 보세요.'}
              </p>
            )}
            <div className="btns">
              {'share' in navigator && (
                <button className="pill" onClick={() => navigator.share({ title: '마음 우체국', text: `${draft.t}님에게 편지가 도착했어요`, url: link }).catch(() => {})}>
                  공유하기
                </button>
              )}
              {qr && (
                <button className={`pill ${draft.photo ? 'strong' : ''}`} onClick={() => (sfx.tap(), setShowQr((v) => !v))} aria-expanded={showQr}>
                  QR 우편 라벨
                </button>
              )}
              <button className="pill" onClick={preview}>받는 화면 미리보기</button>
              <button className="pill" onClick={() => navigate('/write')}>고쳐 쓰기</button>
            </div>

            <AnimatePresence>
              {showQr && qr && (
                <motion.div
                  className="qr-label"
                  initial={{ opacity: 0, height: 0, rotateX: -60 }}
                  animate={{ opacity: 1, height: 'auto', rotateX: 0 }}
                  exit={{ opacity: 0, height: 0, rotateX: -60 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                >
                  <div className="qr-card">
                    <div className="qr-head">
                      <span>마음 우체국 · 등기 라벨</span>
                      <span>{today()}</span>
                    </div>
                    <img src={qr} alt="편지 링크 QR 코드" />
                    <div className="qr-foot">
                      <span>TO. {draft.t}</span>
                      <span>{k.name} · {k.en}</span>
                    </div>
                  </div>
                  <p className="note">휴대폰 카메라로 비추면 바로 편지가 열려요</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="ghost" onClick={fresh} style={{ marginTop: 14 }}>
              새 편지 쓰기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
