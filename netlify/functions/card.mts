/**
 * 카카오톡 공유용 카드 이미지 (800×800 PNG)
 *   /api/card?c=love&t=받는사람&f=보내는사람
 * 테마 색·아이콘으로 봉투를 그리고 받는/보내는 사람 이름을 넣어 줍니다.
 * 글꼴은 Google Fonts 에서 필요한 글자만 받아 옵니다(text= 서브셋).
 */
import { Resvg } from '@resvg/resvg-js'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type Cat = 'love' | 'thanks' | 'congrats' | 'cheer' | 'sorry'
interface T { en: string; e1: string; e2: string; e3: string; wax: string; wax2: string; a1: string; a2: string; a3: string; icon: string }

const ICONS = {
  heart: '<path d="M12 20.6C6 16.4 2.5 13 2.5 8.9 2.5 6 4.7 3.8 7.4 3.8c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 2.7 0 4.9 2.2 4.9 5.1 0 4.1-3.5 7.5-9.5 11.7z"/>',
  flower: '<circle cx="12" cy="6.3" r="3.6"/><circle cx="17.4" cy="10.2" r="3.6"/><circle cx="15.3" cy="16.6" r="3.6"/><circle cx="8.7" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.2" r="3.6"/>',
  spark: '<path d="M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4z"/><circle cx="19.5" cy="4.5" r="1.6"/><circle cx="4.8" cy="19" r="1.2"/>',
  star: '<path d="M12 2.2l2.95 6.1 6.7.95-4.85 4.7 1.15 6.65L12 17.45 6.05 20.6l1.15-6.65L2.35 9.25l6.7-.95z"/>',
  leaf: '<path d="M12 21.5v-7.3c0-4.6 3.4-8.4 8.5-9.4-.3 6.1-3.6 9.9-8.5 10.3M12 14.2C11.7 9.9 8.8 6.9 3.6 6.4c0 4.9 3.1 8 8.4 7.8"/><path d="M12 21.5v-8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
}

// src/styles/globals.css 의 테마 색과 같음
const THEMES: Record<Cat, T> = {
  love:     { en: 'LOVE',     icon: ICONS.heart,  e1: '#f0d3ce', e2: '#e7bfb8', e3: '#dcaaa2', wax: '#b33a4a', wax2: '#6f1626', a1: '#f6b5c0', a2: '#f3cfd6', a3: '#ffd2c4' },
  thanks:   { en: 'THANKS',   icon: ICONS.flower, e1: '#f2dfb2', e2: '#e9cf96', e3: '#ddbd7c', wax: '#c27b22', wax2: '#7a4708', a1: '#f8d38a', a2: '#f6e3b0', a3: '#ffcf9e' },
  congrats: { en: 'CONGRATS', icon: ICONS.spark,  e1: '#cfe2e5', e2: '#b9d4d9', e3: '#a2c4cb', wax: '#2f6c80', wax2: '#153d4a', a1: '#a9d6e0', a2: '#f7d79a', a3: '#e8c1e0' },
  cheer:    { en: 'CHEER UP', icon: ICONS.star,   e1: '#d8e6c8', e2: '#c4d9af', e3: '#afca96', wax: '#4d7d3e', wax2: '#24461b', a1: '#c4e3a8', a2: '#f6e39a', a3: '#b9e0d0' },
  sorry:    { en: 'SORRY',    icon: ICONS.leaf,   e1: '#e0d9ee', e2: '#cfc5e3', e3: '#bdb1d6', wax: '#66578f', wax2: '#352a5c', a1: '#cbc2ea', a2: '#b8cde8', a3: '#e3d9f2' },
}

const INK = '#3f2d22'
const INK2 = '#7d6450'
const PAPER = '#f3ead8'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
/** 이모지·제어문자 제거, 20자 제한 */
const clean = (s: string | null) => (s ?? '').replace(/[\p{C}\p{Extended_Pictographic}]/gu, '').trim().slice(0, 20)
/** 대략적인 글자 폭(em): 한글 등 전각 1, 그 외 0.6 */
const emWidth = (s: string) => [...s].reduce((w, ch) => w + (/[ᄀ-￿]/.test(ch) ? 1 : 0.6), 0)
const fit = (s: string, size: number, max: number) => Math.min(size, Math.floor(max / Math.max(emWidth(s), 1)))

async function googleFont(family: string, weight: number, text: string): Promise<Buffer> {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`)
  ).text()
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
  if (!url) throw new Error(`font not found: ${family}`)
  return Buffer.from(await (await fetch(url)).arrayBuffer())
}

function svg(cat: Cat, to: string, from: string) {
  const k = THEMES[cat]
  const toSize = fit(to, 68, 600)
  const fromSize = fit(from, 46, 460)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs>
  <radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fcf8ef"/><stop offset=".6" stop-color="${PAPER}"/><stop offset="1" stop-color="${k.a2}"/></radialGradient>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.e1}"/><stop offset="1" stop-color="${k.e2}"/></linearGradient>
  <linearGradient id="flap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.e1}"/><stop offset="1" stop-color="${k.e3}"/></linearGradient>
  <radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${k.wax}" stop-opacity=".75"/><stop offset=".25" stop-color="${k.wax}"/><stop offset="1" stop-color="${k.wax2}"/></radialGradient>
  <linearGradient id="stamp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${k.a1}"/><stop offset="1" stop-color="${k.a3}"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
  <filter id="shadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="22" stdDeviation="20" flood-color="${INK}" flood-opacity=".22"/></filter>
</defs>
<rect width="800" height="800" fill="url(#bg)"/>
<circle cx="560" cy="300" r="190" fill="${k.a1}" opacity=".45" filter="url(#blur)"/>
<circle cx="190" cy="560" r="170" fill="${k.a3}" opacity=".5" filter="url(#blur)"/>

<text x="400" y="98" text-anchor="middle" font-family="Nanum Pen" font-size="58" fill="${INK2}">To.</text>
<text x="400" y="178" text-anchor="middle" font-family="Gowun Batang" font-weight="700" font-size="${toSize}" fill="${INK}">${esc(to)}</text>

<g transform="translate(400 438) rotate(-4) scale(1.55) translate(-165 -113)" filter="url(#shadow)">
  <rect width="330" height="226" rx="12" fill="url(#body)"/>
  <path d="M0 226 L135 112 Q165 92 195 112 L330 226 Z" fill="${k.e2}" opacity=".85"/>
  <path d="M12 0 H318 Q330 0 330 12 L180 128 Q165 139 150 128 L0 12 Q0 0 12 0Z" fill="url(#flap)"/>
  <path d="M0 12 L150 128 Q165 139 180 128 L330 12" fill="none" stroke="${k.e3}" stroke-width="2"/>
  <g transform="translate(262 18) rotate(5)">
    <rect width="50" height="60" fill="#fcf8ef" stroke="${k.e3}" stroke-width="1.4" stroke-dasharray="3 2.2" rx="1"/>
    <rect x="5" y="5" width="40" height="50" rx="2" fill="url(#stamp)"/>
    <g transform="translate(14 19) scale(.9)" fill="${k.wax}" color="${k.wax}" opacity=".8">${k.icon}</g>
  </g>
  <g transform="translate(238 52) rotate(-14)" opacity=".55">
    <circle r="34" fill="none" stroke="${k.wax2}" stroke-width="1.8"/>
    <text y="-3" text-anchor="middle" font-family="Gowun Batang" font-size="10.5" letter-spacing="1.5" fill="${k.wax2}">MAEUM</text>
    <text y="11" text-anchor="middle" font-family="Gowun Batang" font-size="10.5" letter-spacing="1.5" fill="${k.wax2}">POST</text>
  </g>
  <g transform="translate(165 132)">
    <path d="M-33 -4 C-35 -22 -20 -36 -2 -35 C18 -36 35 -22 34 -2 C35 18 20 34 1 34 C-19 35 -34 18 -33 -4Z" fill="url(#wax)"/>
    <circle r="22" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.5"/>
    <g transform="translate(-13.2 -13.2) scale(1.1)" fill="#fff0eb" color="#fff0eb" fill-opacity=".88">${k.icon}</g>
  </g>
</g>

${from ? `<text x="400" y="700" text-anchor="middle" fill="${INK}"><tspan font-family="Nanum Pen" font-size="54" fill="${INK2}">From. </tspan><tspan font-family="Gowun Batang" font-weight="700" font-size="${fromSize}">${esc(from)}</tspan></text>` : ''}
<text x="400" y="764" text-anchor="middle" font-family="Gowun Batang" font-size="17" letter-spacing="5" fill="${k.wax}">마음 우체국 · ${k.en}</text>
</svg>`
}

export async function render(cat: Cat, to: string, from: string) {
  const k = THEMES[cat]
  const [batang, batangBold, pen] = await Promise.all([
    googleFont('Gowun Batang', 400, `마음 우체국 · ${k.en}MAEUMPOST`),
    googleFont('Gowun Batang', 700, to + from),
    googleFont('Nanum Pen Script', 400, 'To.From. '),
  ])
  // Node 판 resvg 는 글꼴을 파일 경로로만 받으므로 임시 폴더에 써 둠
  const dir = await mkdtemp(join(tmpdir(), 'card-'))
  try {
    const files = await Promise.all(
      [batang, batangBold, pen].map(async (buf, i) => {
        const p = join(dir, `${i}.ttf`)
        await writeFile(p, buf)
        return p
      }),
    )
    const r = new Resvg(svg(cat, to, from), {
      font: { fontFiles: files, loadSystemFonts: false, defaultFontFamily: 'Gowun Batang' },
    })
    return r.render().asPng()
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export default async (req: Request) => {
  const q = new URL(req.url).searchParams
  const c = q.get('c') as Cat
  const cat: Cat = c in THEMES ? c : 'love'
  const to = clean(q.get('t')) || '당신'
  const from = clean(q.get('f'))
  try {
    const png = await render(cat, to, from)
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    console.error(e)
    // 글꼴을 못 받아 오는 등 실패하면 기본 썸네일로
    return Response.redirect(new URL('/kakao-default.jpg', req.url).toString(), 302)
  }
}

export const config = { path: '/api/card' }
