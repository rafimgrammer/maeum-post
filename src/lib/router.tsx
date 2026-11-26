/**
 * Next.js App Router 흉내를 낸 아주 작은 해시 라우터.
 *  - app/ 폴더 구조 (page.tsx, loading.tsx, error.tsx, not-found.tsx)
 *  - 동적 세그먼트 /m/[data]
 *  - 라우트별 코드 스플리팅(lazy) + Suspense 로딩 화면
 *  - <Link>에 마우스를 올리면 미리 불러오기(prefetch), 유휴 시간에 전체 prefetch
 *  - 라우트별 metadata(title/description/og) 자동 반영
 *  - 에러 바운더리(error.tsx)와 404(not-found.tsx)
 * 해시(#/...)를 쓰기 때문에 서버 설정 없이 정적 호스팅에서 그대로 동작합니다.
 */
import {
  Component, Suspense, lazy, useEffect, useSyncExternalStore,
  type AnchorHTMLAttributes, type ComponentType, type LazyExoticComponent, type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Loading from '@/app/loading'
import ErrorPage from '@/app/error'
import NotFound from '@/app/not-found'

export type Params = Record<string, string>
export interface PageProps { params: Params }
export interface Metadata { title: string; description?: string }

interface RouteDef {
  segment: string
  pattern: RegExp
  keys: string[]
  load: () => Promise<{ default: ComponentType<PageProps> }>
  metadata: (params: Params) => Metadata
}

const SITE = '마음 우체국'

function defineRoute(segment: string, load: RouteDef['load'], metadata: RouteDef['metadata']): RouteDef {
  const keys: string[] = []
  const src = segment.replace(/\[(\w+)\]/g, (_, k) => (keys.push(k), '([^/]+)'))
  return { segment, pattern: new RegExp(`^${src}$`), keys, load, metadata }
}

export const routes: RouteDef[] = [
  defineRoute('/', () => import('@/app/page'), () => ({ title: `${SITE} — 한마디를 봉투에 담아`, description: '사랑 · 고마움 · 축하 · 응원 · 사과, 어떤 마음이든 링크 하나로' })),
  defineRoute('/pick', () => import('@/app/pick/page'), () => ({ title: `우표 고르기 · ${SITE}` })),
  defineRoute('/write', () => import('@/app/write/page'), () => ({ title: `편지 쓰기 · ${SITE}` })),
  defineRoute('/seal', () => import('@/app/seal/page'), () => ({ title: `봉인 완료 · ${SITE}` })),
  defineRoute('/m/[data]', () => import('@/app/m/[data]/page'), () => ({ title: `편지가 도착했어요 · ${SITE}`, description: '봉인을 뜯어 편지를 열어 보세요' })),
]

const lazies = new Map<RouteDef, LazyExoticComponent<ComponentType<PageProps>>>()
const pageOf = (r: RouteDef) => {
  if (!lazies.has(r)) lazies.set(r, lazy(r.load))
  return lazies.get(r)!
}

export function matchRoute(path: string) {
  for (const route of routes) {
    const m = path.match(route.pattern)
    if (m) {
      const params: Params = {}
      route.keys.forEach((k, i) => (params[k] = m[i + 1]))
      return { route, params }
    }
  }
  return null
}

/* ---------- pathname ---------- */
const getPath = () => location.hash.replace(/^#/, '') || '/'
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}
export const usePathname = () => useSyncExternalStore(subscribe, getPath)

export function navigate(to: string, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', `#${to}`)
    dispatchEvent(new HashChangeEvent('hashchange'))
  } else location.hash = to
}

export function prefetch(href: string) {
  const m = matchRoute(href)
  m?.route.load()
}

export function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={`#${href}`} onMouseEnter={() => prefetch(href)} onFocus={() => prefetch(href)} {...rest}>
      {children}
    </a>
  )
}

/* ---------- metadata ---------- */
function setMeta(attr: 'name' | 'property', key: string, value?: string) {
  if (!value) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}
function useMetadata(meta: Metadata) {
  useEffect(() => {
    document.title = meta.title
    setMeta('name', 'description', meta.description)
    setMeta('property', 'og:title', meta.title)
    setMeta('property', 'og:description', meta.description)
  }, [meta.title, meta.description])
}

/* ---------- error boundary (error.tsx) ---------- */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) return <ErrorPage error={this.state.error} reset={() => this.setState({ error: null })} />
    return this.props.children
  }
}

/* ---------- view ---------- */
export function RouterView() {
  const path = usePathname()
  const match = matchRoute(path)
  useMetadata(match ? match.route.metadata(match.params) : { title: `길을 잃었어요 · ${SITE}` })

  useEffect(() => {
    scrollTo({ top: 0 })
  }, [path])

  // 유휴 시간에 나머지 라우트 코드를 미리 받아 둡니다 (Next의 자동 prefetch처럼)
  useEffect(() => {
    const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1200))
    idle(() => routes.forEach((r) => r.load()))
  }, [])

  const Page = match ? pageOf(match.route) : null
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={match ? match.route.segment : '404'}
        className="page"
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {Page && match ? (
          <ErrorBoundary key={path}>
            <Suspense fallback={<Loading />}>
              <Page params={match.params} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <NotFound />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
