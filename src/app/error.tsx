/** app/error.tsx — 렌더링 중 오류가 나면 보이는 화면 */
import { navigate } from '@/lib/router'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  if (import.meta.env.DEV) console.error(error)
  return (
    <section className="screen center-screen">
      <div className="big-mark" aria-hidden="true">!</div>
      <h2>편지가 잠깐 구겨졌어요</h2>
      <p className="lead">일시적인 문제예요. 다시 시도해 주세요.</p>
      <div className="btns" style={{ marginTop: 24 }}>
        <button className="pill" onClick={reset}>다시 시도</button>
        <button className="pill" onClick={() => navigate('/')}>처음으로</button>
      </div>
    </section>
  )
}
