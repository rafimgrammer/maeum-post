export type Cat = 'love' | 'thanks' | 'congrats' | 'cheer' | 'sorry'
export type IconName = 'heart' | 'flower' | 'spark' | 'star' | 'leaf'
export type FxKind = 'heart' | 'petal' | 'confetti' | 'star' | 'drop' | 'dust' | 'crumb'
export type FontId = 0 | 1 | 2

export interface Theme {
  name: string
  en: string
  color: string
  icon: IconName
  fx: FxKind
  desc: string
  /** 받는 화면에서 편지가 열릴 때 울리는 음 (Hz) */
  notes: number[]
  tips: string[]
}

export const ORDER: Cat[] = ['love', 'thanks', 'congrats', 'cheer', 'sorry']

export const CATS: Record<Cat, Theme> = {
  love: {
    name: '사랑', en: 'LOVE', color: '#b33a4a', icon: 'heart', fx: 'heart', desc: '설레는 마음',
    notes: [523.25, 659.25, 783.99, 880],
    tips: ['매일 봐도 또 보고 싶은 사람.\n늘 고맙고, 많이 사랑해.', '너랑 있으면 평범한 날도\n특별한 하루가 돼.', '오늘도 수고했어.\n네가 있어서 내 하루가 따뜻해.'],
  },
  thanks: {
    name: '고마움', en: 'THANKS', color: '#b8731f', icon: 'flower', fx: 'petal', desc: '전하지 못한 감사',
    notes: [349.23, 440, 523.25, 698.46],
    tips: ['그때 건네준 한마디가\n생각보다 큰 힘이 됐어요. 정말 고마워요.', '늘 묵묵히 챙겨줘서 고마워.\n덕분에 잘 버틸 수 있었어.', '말로 다 못 했지만,\n항상 곁에 있어줘서 고마워요.'],
  },
  congrats: {
    name: '축하', en: 'CONGRATS', color: '#2f6c80', icon: 'spark', fx: 'confetti', desc: '함께 기뻐하는 날',
    notes: [523.25, 659.25, 783.99, 1046.5, 1318.51],
    tips: ['합격 진짜 축하해!\n너라면 될 줄 알았어.', '생일 축하해!\n올해는 좋은 일만 가득하길.', '드디어 해냈구나!\n그동안의 노력이 빛나는 날이야.'],
  },
  cheer: {
    name: '응원', en: 'CHEER UP', color: '#4d7d3e', icon: 'star', fx: 'star', desc: '힘을 보태는 말',
    notes: [392, 493.88, 587.33, 783.99],
    tips: ['결과보다 지금까지 버틴 네가 더 대단해.\n끝까지 응원할게!', '긴장되겠지만 너는 이미 충분히 준비됐어.\n잘 다녀와!', '천천히 가도 괜찮아.\n멈추지만 않으면 돼.'],
  },
  sorry: {
    name: '사과', en: 'SORRY', color: '#66578f', icon: 'leaf', fx: 'drop', desc: '용기 내는 진심',
    notes: [659.25, 523.25, 440, 523.25],
    tips: ['그날 내가 너무 날카로웠어.\n진심으로 미안해.', '서운하게 해서 미안해.\n다음엔 더 잘 들을게.', '말로 하기 어려워서 편지로 전해.\n정말 미안했어.'],
  },
}

export const FONTS: { id: FontId; label: string }[] = [
  { id: 0, label: '명조' },
  { id: 1, label: '손글씨' },
  { id: 2, label: '둥근' },
]

export const isCat = (x: unknown): x is Cat => ORDER.includes(x as Cat)

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
