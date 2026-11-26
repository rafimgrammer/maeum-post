/**
 * 편지에 넣을 사진을 브라우저 안에서만 작게 인화합니다. (서버 업로드·외부 API 없음)
 *  원본 → EXIF 회전 보정 → 정사각형 크롭 → 120px → WebP(안 되면 JPEG) → 4KB 이하가 되도록 품질 조절
 */

import type { PhotoMime } from './codec'

export type { PhotoMime }
export interface PhotoResult { bytes: Uint8Array; mime: PhotoMime }

const MAX_SOURCE = 20 * 1024 * 1024
export const PHOTO_TARGET = 4 * 1024

export class PhotoError extends Error {}

/** 원본 파일을 읽어 회전(EXIF)까지 바로잡은 비트맵으로 */
export async function loadPhoto(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name)) {
    throw new PhotoError('사진 파일만 넣을 수 있어요')
  }
  if (file.size > MAX_SOURCE) throw new PhotoError('20MB가 넘는 사진은 넣을 수 없어요')
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoError('이 사진은 열 수 없어요. JPG나 PNG로 바꿔서 넣어 주세요')
  }
}

/** cropX, cropY: 0(왼쪽·위) ~ 0.5(가운데) ~ 1(오른쪽·아래) */
export function drawSquare(bmp: ImageBitmap, size: number, cropX = 0.5, cropY = 0.5) {
  const side = Math.min(bmp.width, bmp.height)
  const sx = (bmp.width - side) * clamp01(cropX)
  const sy = (bmp.height - side) * clamp01(cropY)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const cx = cv.getContext('2d')!
  cx.imageSmoothingEnabled = true
  cx.imageSmoothingQuality = 'high'
  // 투명한 PNG 가 JPEG 로 바뀌면 까맣게 되므로 폴라로이드 종이색을 먼저 깔아 둠
  cx.fillStyle = '#fdfcf8'
  cx.fillRect(0, 0, size, size)
  cx.drawImage(bmp, sx, sy, side, side, 0, 0, size, size)
  return cv
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const toBlob = (cv: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((r) => cv.toBlob(r, type, q))

let webpOk: boolean | null = null

/** WebP 인코딩을 못 하는 브라우저(Safari 등)는 toBlob 이 PNG 를 돌려주므로 결과 형식을 보고 판단 */
async function encode(cv: HTMLCanvasElement, q: number): Promise<{ blob: Blob; mime: PhotoMime }> {
  if (webpOk !== false) {
    const b = await toBlob(cv, 'image/webp', q)
    if (b && b.type === 'image/webp') {
      webpOk = true
      return { blob: b, mime: 'image/webp' }
    }
    webpOk = false
  }
  const b = await toBlob(cv, 'image/jpeg', q)
  if (!b) throw new PhotoError('사진을 인화하지 못했어요. 다른 사진으로 해 볼까요?')
  return { blob: b, mime: 'image/jpeg' }
}

/** 품질 0.6 → 0.3 (0.05씩), 그래도 크면 100px 로 줄여 다시. 끝까지 크면 가장 작은 결과를 씁니다. */
export async function encodePhoto(bmp: ImageBitmap, cropX = 0.5, cropY = 0.5): Promise<PhotoResult> {
  let best: { blob: Blob; mime: PhotoMime } | null = null
  for (const size of [120, 100]) {
    const cv = drawSquare(bmp, size, cropX, cropY)
    for (let q = 0.6; q >= 0.3 - 1e-9; q -= 0.05) {
      const r = await encode(cv, Math.round(q * 100) / 100)
      if (!best || r.blob.size < best.blob.size) best = r
      if (r.blob.size <= PHOTO_TARGET) return { bytes: new Uint8Array(await r.blob.arrayBuffer()), mime: r.mime }
    }
  }
  return { bytes: new Uint8Array(await best!.blob.arrayBuffer()), mime: best!.mime }
}

/** 파일 하나로 끝까지 (쓰기 화면에서 사용) */
export async function processPhoto(file: File, cropX = 0.5, cropY = 0.5) {
  const bmp = await loadPhoto(file)
  return { bmp, ...(await encodePhoto(bmp, cropX, cropY)) }
}

export const formatKB = (n: number) => `${(n / 1024).toFixed(1)}KB`
