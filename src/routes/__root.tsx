/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Float Radar' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#0a0e13] text-slate-100 min-h-screen antialiased">
        <nav className="border-b border-slate-800/80 bg-[#0d1219]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-600/30 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-300">FR</div>
            <Link to="/" className="text-sm font-semibold text-white hover:text-cyan-300 transition-colors">
              Float Radar
            </Link>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
        <Scripts />
      </body>
    </html>
  )
}
