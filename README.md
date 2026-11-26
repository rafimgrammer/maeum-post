# 마음 우체국 (React)

짧은 한마디를 봉투에 담아 링크로 보내는 메시지 카드입니다. 쓴 글은 서버에 저장되지 않고 링크의 `#` 뒤에만 담깁니다.

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 에 정적 파일 생성 → Netlify 등에 그대로 업로드
```

## 폴더 구조 (Next.js App Router 스타일)
```
src/app/layout.tsx          루트 레이아웃 (배경 분위기, 파티클, 사운드 토글)
src/app/page.tsx            첫 화면                 #/
src/app/pick/page.tsx       우표 고르기             #/pick
src/app/write/page.tsx      편지 쓰기               #/write
src/app/seal/page.tsx       봉인 + 링크/QR          #/seal
src/app/m/[data]/page.tsx   받는 사람 화면          #/m/<편지데이터>
src/app/loading.tsx         로딩 화면 (Suspense)
src/app/error.tsx           오류 화면 (Error Boundary)
src/app/not-found.tsx       404
src/lib/router.tsx          해시 라우터: 동적 세그먼트, lazy 코드 스플리팅, prefetch, metadata
src/lib/codec.ts            편지 ↔ 링크 (deflate 압축 + base64url)
src/lib/fx.ts               캔버스 파티클 엔진
src/lib/sound.ts            Web Audio 합성 효과음, 진동
src/components/             봉투·우표·소인, 모션 컴포넌트, 테마 분위기 레이어
```
