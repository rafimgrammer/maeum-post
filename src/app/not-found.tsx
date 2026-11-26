/** app/not-found.tsx — 없는 주소일 때 */
import { Link } from '@/lib/router'
import { Postmark } from '@/components/Postal'

export default function NotFound() {
  return (
    <section className="screen center-screen">
      <div className="nf-mark"><Postmark date="404" /></div>
      <h2>주소를 찾을 수 없어요</h2>
      <p className="lead">수취인 불명으로 반송된 편지예요.</p>
      <Link href="/" className="btn" style={{ marginTop: 26 }}><span>마음 우체국으로</span></Link>
    </section>
  )
}
