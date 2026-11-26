/** 카카오톡 공유 (Kakao Developers 메시지 템플릿 사용) */
import { SITE_URL } from './codec'

// 카카오 디벨로퍼스 > 내 애플리케이션 > 앱 키 > JavaScript 키 (공개돼도 되는 키, 등록한 도메인에서만 동작)
export const KAKAO_JS_KEY = 'dd61a88500bcfbcc35915d0d1a7c900b'
// 카카오 디벨로퍼스 > 메시지 템플릿 > 만든 템플릿의 ID
export const KAKAO_TEMPLATE_ID = 139347

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js'

declare global {
  interface Window {
    Kakao?: {
      init(key: string): void
      isInitialized(): boolean
      Share: { sendCustom(o: { templateId: number; templateArgs?: Record<string, string> }): void }
    }
  }
}

export const kakaoReady = () => !!KAKAO_JS_KEY && !!KAKAO_TEMPLATE_ID

type KakaoSDK = NonNullable<Window['Kakao']>
let loading: Promise<KakaoSDK> | null = null
function load(): Promise<KakaoSDK> {
  if (!loading) {
    loading = new Promise<KakaoSDK>((resolve, reject) => {
      if (window.Kakao) return resolve(window.Kakao)
      const s = document.createElement('script')
      s.src = SDK_URL
      s.crossOrigin = 'anonymous'
      s.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('Kakao SDK missing')))
      s.onerror = () => {
        loading = null
        reject(new Error('Kakao SDK load failed'))
      }
      document.head.appendChild(s)
    }).then((K) => {
      if (!K.isInitialized()) K.init(KAKAO_JS_KEY)
      return K
    })
  }
  return loading
}

/** 미리 불러두기 (버튼을 누를 때 바로 열리도록) */
export const preloadKakao = () => {
  if (kakaoReady()) load().catch(() => {})
}

/** 테마 색·이름이 들어간 카드 이미지 (netlify/functions/card.mts 가 그림) */
export const cardImageUrl = (cat: string, to: string, from: string) =>
  `${SITE_URL}api/card?${new URLSearchParams({ c: cat, t: to, f: from })}`

/**
 * 템플릿 변수:
 *  ${img}  카드 이미지 주소 → 이미지 영역에 사용
 *  ${data} 편지 데이터 → 버튼 링크 경로에 `?m=${data}` 로 사용
 *  ${to}   받는 사람
 *  ${from} 보내는 사람
 */
export async function shareKakao(args: { data: string; cat: string; to: string; from: string }) {
  const K = await load()
  K.Share.sendCustom({
    templateId: KAKAO_TEMPLATE_ID,
    templateArgs: {
      img: cardImageUrl(args.cat, args.to, args.from),
      data: args.data,
      to: args.to || '당신',
      from: args.from || '누군가',
    },
  })
}
