/** app/loading.tsx — 라우트 코드나 편지를 불러오는 동안 보이는 화면 */
export default function Loading() {
  return (
    <section className="screen loading" aria-busy="true">
      <div className="skel-env">
        <span className="skel-flap" />
      </div>
      <p className="lead">편지를 가져오는 중이에요…</p>
    </section>
  )
}
