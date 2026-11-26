import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RootLayout from '@/app/layout'
import '@/styles/globals.css'

// 카카오톡 메시지 버튼은 `?m=<편지데이터>[.<사진>]` 로 들어옴 → 해시 라우트 `#/m/...` 로 바꿔 줌
const m = new URLSearchParams(location.search).get('m')
if (m && /^[bz][A-Za-z0-9_-]+(\.[wj][A-Za-z0-9_-]+)?$/.test(m)) history.replaceState(null, '', `${location.pathname}#/m/${m}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootLayout />
  </StrictMode>,
)
