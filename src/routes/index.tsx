import type React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { supabase } from '../lib/supabase'
import { steamIcon } from '../lib/steam'

type ItemStat = {
  id: number
  market_hash_name: string
  item_name: string | null
  wear_name: string | null
  is_stattrak: boolean
  is_souvenir: boolean
  icon_url: string | null
  premium: number | null
  // bucket where the highest price was observed
  peak_bucket: { min: number; max: number } | null
}

type LandingStats = {
  itemCount: number
  orderCount: number
  topItems: ItemStat[]
}

const getStats = createServerFn({ method: 'GET' })
  .handler(async (): Promise<LandingStats> => {
    const [itemsRes, ordersRes, topRes] = await Promise.all([
      (supabase as any).from('items').select('*', { count: 'exact', head: true }),
      (supabase as any).from('float_prices').select('*', { count: 'exact', head: true }),
      (supabase as any)
        .from('item_stats')
        .select('id, market_hash_name, item_name, wear_name, is_stattrak, is_souvenir, icon_url, premium')
        .order('premium', { ascending: false, nullsFirst: false })
        .limit(5),
    ])

    const rawItems: any[] = topRes.data ?? []

    // For each top item, find the float bucket with the highest price
    // float_prices now stores only anomaly buckets — pick the peak one per item
    let peakBuckets: Record<number, { min: number; max: number }> = {}
    if (rawItems.length > 0) {
      const ids = rawItems.map((i) => i.id)
      const { data: fpRows } = await (supabase as any)
        .from('float_prices')
        .select('item_id, float_value, price')
        .in('item_id', ids)

      if (fpRows) {
        const bestPerItem = new Map<number, { float_value: number; price: number }>()
        for (const row of fpRows) {
          const cur = bestPerItem.get(row.item_id)
          if (!cur || Number(row.price) > cur.price) {
            bestPerItem.set(row.item_id, { float_value: Number(row.float_value), price: Number(row.price) })
          }
        }
        for (const [itemId, best] of bestPerItem) {
          const b = Math.floor(best.float_value * 100) / 100
          peakBuckets[itemId] = {
            min: Math.round(b * 100) / 100,
            max: Math.round((b + 0.01) * 100) / 100,
          }
        }
      }
    }

    return {
      itemCount: itemsRes.count ?? 0,
      orderCount: ordersRes.count ?? 0,
      topItems: rawItems.map((item) => ({
        ...item,
        peak_bucket: peakBuckets[item.id] ?? null,
      })),
    }
  })

export const Route = createFileRoute('/')({
  component: LandingPage,
  loader: () => getStats(),
})

function LandingPage() {
  const stats = Route.useLoaderData()
  const navigate = useNavigate()
  const topPremium = stats.topItems[0]?.premium

  return (
    <div className="space-y-14">
      {/* Hero */}
      <div className="text-center pt-14 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Real-time CS2 float tracking
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
          Detect CS2{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Float Anomalies
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto mb-8 leading-relaxed">
          Find skins where a specific float range trades significantly above average — and see exactly how much buyers overpay.
        </p>
        <Link
          to="/search"
          search={{ def_index: undefined, browse: undefined }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0a0e13] font-semibold transition-colors text-sm"
        >
          Explore anomalies
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Skins tracked"
          value={stats.itemCount > 0 ? stats.itemCount.toLocaleString() : '—'}
          icon={<IconCrosshair className="text-violet-400" />}
          accent="violet"
        />
        <StatCard
          label="Anomaly buckets"
          value={stats.orderCount > 0 ? stats.orderCount.toLocaleString() : '—'}
          icon={<IconOrders className="text-blue-400" />}
          accent="blue"
        />
        <StatCard
          label="Largest anomaly"
          value={topPremium != null ? `+${Number(topPremium).toFixed(1)}%` : '—'}
          icon={<IconRadar className="text-cyan-400" />}
          accent="cyan"
        />
      </div>

      {/* Top items */}
      {stats.topItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Biggest Float Anomalies</h2>
            <Link to="/search" search={{ def_index: undefined, browse: undefined }} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View all →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/80 text-left border-b border-slate-700/80">
                  <th className="w-[56px]" />
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Skin</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Float range</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Anomaly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.topItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate({ to: '/item/$id', params: { id: String(item.id) } })}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="pl-3 pr-2 py-2">
                      {steamIcon(item.icon_url) ? (
                        <img src={steamIcon(item.icon_url)!} alt="" className="h-12 w-12 object-contain" />
                      ) : (
                        <div className="h-12 w-12 bg-slate-800/50 rounded" />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-white text-sm">
                          {item.item_name ?? item.market_hash_name}
                        </span>
                        {item.is_stattrak && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">ST</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.wear_name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.peak_bucket ? (
                        <span className="inline-flex items-center gap-1 mono text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                          {item.peak_bucket.min.toFixed(2)}
                          <span className="text-cyan-500/50">–</span>
                          {item.peak_bucket.max.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {item.premium != null && Number(item.premium) > 0 ? (
                        <span className={`mono font-semibold ${Number(item.premium) >= 50 ? 'text-emerald-300' : 'text-cyan-300'}`}>
                          +{Number(item.premium).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const ACCENT_STYLES = {
  violet: {
    border:   'border-slate-700/80',
    topBar:   'bg-violet-500',
    iconRing: 'bg-violet-500/10 border-violet-500/20',
    value:    'text-white',
  },
  blue: {
    border:   'border-slate-700/80',
    topBar:   'bg-blue-500',
    iconRing: 'bg-blue-500/10 border-blue-500/20',
    value:    'text-white',
  },
  cyan: {
    border:   'border-slate-700/80',
    topBar:   'bg-cyan-400',
    iconRing: 'bg-cyan-500/10 border-cyan-500/20',
    value:    'text-cyan-300',
  },
}

function StatCard({
  label,
  value,
  icon,
  accent = 'cyan',
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: keyof typeof ACCENT_STYLES
}) {
  const s = ACCENT_STYLES[accent]
  return (
    <div className={`relative overflow-hidden rounded-xl border ${s.border} bg-slate-900/40`}>
      {/* colored top bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${s.topBar}`} />

      <div className="p-5 pt-6 flex flex-col items-center text-center">
        {/* icon in a ring */}
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${s.iconRing} mb-4`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold mono ${s.value}`}>{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

// Crosshair — skins tracked
function IconCrosshair({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={className}>
      <circle cx="14" cy="14" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      {/* top */}
      <line x1="14" y1="2" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* bottom */}
      <line x1="14" y1="21" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* left */}
      <line x1="2" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* right */}
      <line x1="21" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* corner ticks */}
      <line x1="2" y1="4" x2="5" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="4" y1="2" x2="4" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="23" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="24" y1="2" x2="24" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="2" y1="24" x2="5" y2="24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="4" y1="23" x2="4" y2="26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="23" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="24" y1="23" x2="24" y2="26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

// Order book bars — buy orders
function IconOrders({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={className}>
      {/* bars ascending left to right */}
      <rect x="2"  y="20" width="4" height="6"  rx="1" fill="currentColor" opacity="0.35" />
      <rect x="8"  y="15" width="4" height="11" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="14" y="10" width="4" height="16" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="20" y="4"  width="4" height="22" rx="1" fill="currentColor" />
      {/* baseline */}
      <line x1="1" y1="26.5" x2="27" y2="26.5" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      {/* small tick marks on top of bars */}
      <line x1="4"  y1="19" x2="4"  y2="17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="10" y1="14" x2="10" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="16" y1="9"  x2="16" y2="7"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="22" y1="3"  x2="22" y2="1"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

// Radar sweep — anomaly detector
function IconRadar({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={className}>
      {/* outer rings */}
      <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <circle cx="14" cy="14" r="8"  stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <circle cx="14" cy="14" r="4"  stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {/* center dot */}
      <circle cx="14" cy="14" r="1.2" fill="currentColor" />
      {/* sweep line */}
      <line x1="14" y1="14" x2="24" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
      {/* crosshair guides */}
      <line x1="14" y1="2"  x2="14" y2="4"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="14" y1="24" x2="14" y2="26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="2"  y1="14" x2="4"  y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="24" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* anomaly blip */}
      <circle cx="21" cy="8" r="1.8" fill="currentColor" opacity="0.85" />
      <circle cx="21" cy="8" r="3.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  )
}
