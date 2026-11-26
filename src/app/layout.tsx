/** app/layout.tsx — 모든 페이지를 감싸는 루트 레이아웃 (Next.js의 RootLayout 역할) */
import { Atmosphere } from '@/components/Atmosphere'
import { SoundToggle } from '@/components/Chrome'
import { FxProvider, LetterProvider, ThemeProvider, ToastProvider } from '@/lib/providers'
import { RouterView } from '@/lib/router'

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FxProvider>
        <ToastProvider>
          <LetterProvider>
            <Atmosphere />
            <SoundToggle />
            <main className="main">
              <RouterView />
            </main>
          </LetterProvider>
        </ToastProvider>
      </FxProvider>
    </ThemeProvider>
  )
}
