import { isCat, type Cat, type FontId } from './themes'

/** 링크(#/m/...) 안에만 담기는 편지 데이터. 서버로는 아무것도 전송되지 않습니다. */
export interface Letter {
  c: Cat
  t: string
  f: string
  m: string
  s: FontId
  d: string
}

const b64u = (bytes: Uint8Array) => {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64u = (s: string) => {
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
  }
}

export const linkFor = (data: string) => `${location.href.split('#')[0]}#/m/${data}`
