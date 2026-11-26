import { isCat, type Cat, type FontId } from './themes'

/** 링크(#/m/...) 안에만 담기는 편지 데이터. 서버로는 아무것도 전송되지 않습니다. */
export interface Letter {
  c: Cat
  t: string
  f: string
  m: string
  s: FontId
  d: string
  /** 사진 캡션 (최대 12자) */
  cap?: string
}

export const b64u = (bytes: Uint8Array) => {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const unb64u = (s: string) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

/** JSON → (가능하면 deflate 압축) → base64url. 더 짧은 쪽을 고릅니다. */
export async function pack(letter: Letter): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, ...letter }))
  let best = 'b' + b64u(raw)
  if ('CompressionStream' in window) {
    try {
      const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))
      const z = 'z' + b64u(new Uint8Array(await new Response(stream).arrayBuffer()))
      if (z.length < best.length) best = z
    } catch {
      /* 압축을 못 하면 그냥 base64 */
    }
  }
  return best
}

export async function unpack(s: string): Promise<Letter> {
  const kind = s[0]
  const bytes = unb64u(s.slice(1))
  let json: string
  if (kind === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    json = await new Response(stream).text()
  } else if (kind === 'b') {
    json = new TextDecoder().decode(bytes)
  } else throw new Error('unknown format')

  const o = JSON.parse(json)
  if (!isCat(o.c) || typeof o.m !== 'string' || !o.m.trim()) throw new Error('invalid letter')
  return {
    c: o.c,
    t: String(o.t ?? '').slice(0, 20),
    f: String(o.f ?? '').slice(0, 20),
    m: o.m.slice(0, 300),
    s: [0, 1, 2].includes(o.s) ? o.s : 0,
    d: String(o.d ?? '').slice(0, 10),
    ...(o.cap ? { cap: String(o.cap).slice(0, 12) } : {}),
  }
}

/* ---------- 사진 ----------
 * 사진 바이트는 JSON 에 넣지 않고(base64 가 두 번 붙어 길어짐) 해시에 따로 붙입니다.
 *   #/m/<편지데이터>.<w|j><사진 base64url>
 * base64url 에는 '.' 이 없으므로 구분자로 안전하고, '.' 이 없으면 사진 없는 예전 링크입니다.
 */
const PHOTO_KIND = { 'image/webp': 'w', 'image/jpeg': 'j' } as const
export type PhotoMime = keyof typeof PHOTO_KIND

export const packPhoto = (bytes: Uint8Array, mime: PhotoMime) => `.${PHOTO_KIND[mime]}${b64u(bytes)}`

/** 깨진 사진 구간이면 null (편지는 그대로 열리도록) */
export function unpackPhoto(seg: string): Blob | null {
  try {
    const mime = seg[0] === 'w' ? 'image/webp' : seg[0] === 'j' ? 'image/jpeg' : null
    if (!mime || seg.length < 16) return null
    const bytes = unb64u(seg.slice(1))
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
    if ((mime === 'image/webp' && !isWebp) || (mime === 'image/jpeg' && !isJpeg)) return null
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

/** URL 의 [data] → 편지 부분과 사진 부분 */
export function splitData(data: string) {
  const i = data.indexOf('.')
  return i < 0 ? { letter: data, photo: null } : { letter: data.slice(0, i), photo: data.slice(i + 1) }
}

export const SITE_URL = 'https://maeum-post.netlify.app/'
export const linkFor = (data: string) => `${SITE_URL}#/m/${data}`
