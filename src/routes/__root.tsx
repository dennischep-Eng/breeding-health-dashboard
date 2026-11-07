import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { getHerdData } from '../lib/herd.functions'
import { AppShell } from '../components/AppShell'

import '../styles.css'

const siteName = 'Herdbook — Breeding, Calving & Health Records'
const siteDescription =
  'A working herd record for dairy farms: log services, pregnancy checks, calvings and treatments in seconds, and see what needs doing today.'

export const Route = createRootRoute({
  loader: () => getHerdData(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:type', content: 'website' },
      { name: 'theme-color', content: '#234b2b' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Public+Sans:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl">The herd records couldn’t be loaded</h1>
        <p className="mt-2 text-muted">{error.message}</p>
        <button className="btn btn-primary mt-6" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    </AppShell>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
