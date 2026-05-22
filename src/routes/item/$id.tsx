import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { db } from '../../lib/db'
import type { Item } from '../../lib/db'
import { steamIcon } from '../../lib/steam'

const getData = createServerFn({ method: 'GET' })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    const item = await db.items.getById(id)
    if (!item) throw notFound()
    const buckets = await db.orders.getBuckets(id)
    return { item, buckets }
  })

export const Route = createFileRoute('/item/$id')({
  component: ItemPage,
  loader: ({ params }) => getData({ data: Number(params.id) }),
})

type Bucket = { floatMin: number; floatMax: number; price: number | null }

function makeBuckets(
  item: Item,
  orderBuckets: { floatBucket: number; price: number }[],
): Bucket[] {
  const start = Math.floor(Number(item.float_min ?? 0) * 100) / 100
  const end = Number(item.float_max ?? 1)
  const priceMap = new Map(orderBuckets.map(b => [b.floatBucket, b.price]))
  const buckets: Bucket[] = []
  for (let b = start; b < end - 0.001; b = Math.round((b + 0.01) * 100) / 100) {
    const min = Math.round(b * 100) / 100
    const max = Math.round((min + 0.01) * 100) / 100
    buckets.push({ floatMin: min, floatMax: max, price: priceMap.get(min) ?? null })
  }
  return buckets
}

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ItemPage() {
  const { item, buckets: orderBuckets } = Route.useLoaderData()
  const floatMin = Number(item.float_min ?? 0)
  const floatMax = Number(item.float_max ?? 1)
  const buckets = makeBuckets(item, orderBuckets)
  const bucketsWithData = buckets.filter(b => b.price != null)
  const [selected, setSelected] = useState<Bucket | null>(bucketsWithData[0] ?? null)

  const prices = bucketsWithData.map(b => b.price!)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
  const premium = minPrice && maxPrice && minPrice > 0
    ? ((maxPrice - minPrice) / minPrice) * 100
    : null

  const chartData = buckets.map(b => ({
    label: b.floatMin.toFixed(2),
    price: b.price != null ? b.price / 100 : null,
    floatMin: b.floatMin,
    floatMax: b.floatMax,
    isEmpty: b.price == null,
  }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {steamIcon(item.icon_url) && (
            <img src={steamIcon(item.icon_url)!} alt="" className="h-16 object-contain drop-shadow-lg" />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">
              def {item.def_index} · paint {item.paint_index}
            </div>
            <h1 className="text-xl font-bold text-white leading-tight">
              {item.item_name ?? item.market_hash_name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {item.wear_name && <span className="mr-2">{item.wear_name}</span>}
              <span className="opacity-50">{item.market_hash_name}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                {floatMin.toFixed(2)} – {floatMax.toFixed(2)}
              </span>
              {premium != null && (
                <span className={`mono text-xs px-2 py-0.5 rounded-md border font-semibold ${
                  premium >= 50 ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300' :
                  premium >= 20 ? 'bg-cyan-950/50 border-cyan-500/25 text-cyan-300' :
                  'bg-slate-800 border-slate-700/60 text-slate-300'
                }`}>
                  +{premium.toFixed(1)}% float premium
                </span>
              )}
            </div>
          </div>
        </div>
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0">← back</Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_240px] gap-5">
        {/* Left: chart + detail */}
        <div className="space-y-4">

          {/* Chart */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price by float bucket</h2>
              <span className="text-[10px] text-slate-500">{bucketsWithData.length} / {buckets.length} buckets</span>
            </div>

            {bucketsWithData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="20%" onClick={(d) => {
                  if (d?.activePayload?.[0]) {
                    const pt = d.activePayload[0].payload
                    setSelected({ floatMin: pt.floatMin, floatMax: pt.floatMax, price: pt.price != null ? pt.price * 100 : null })
                  }
                }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${v}`}
                    width={52}
                  />
                  {avgPrice != null && (
                    <ReferenceLine
                      y={avgPrice / 100}
                      stroke="#334155"
                      strokeDasharray="4 3"
                      label={{ value: 'avg', fill: '#475569', fontSize: 9, fontFamily: 'monospace' }}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      if (d.isEmpty) return null
                      return (
                        <div className="bg-[#0d1219] border border-slate-700/80 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <p className="mono text-slate-400 mb-1">{d.label} – {d.floatMax.toFixed(2)}</p>
                          <p className="mono font-bold text-emerald-300 text-sm">${d.price?.toFixed(2)}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="price" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={
                          entry.isEmpty ? 'transparent' :
                          selected?.floatMin === entry.floatMin ? '#22d3ee' :
                          entry.price != null && maxPrice != null && entry.price / 100 >= maxPrice / 100 * 0.95 ? '#34d399' :
                          '#1e40af'
                        }
                        opacity={entry.isEmpty ? 0 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Selected bucket detail */}
          {selected?.price != null && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-cyan-400/80 mb-1">Selected bucket</div>
                  <div className="mono text-lg font-bold text-white">
                    {selected.floatMin.toFixed(2)} – {selected.floatMax.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 mb-1">price</div>
                  <div className="mono text-2xl font-bold text-emerald-300">{fmt(selected.price)}</div>
                </div>
              </div>
              <div className="px-4 pb-3">
                <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-cyan-500/50 rounded-sm"
                    style={{
                      left: `${((selected.floatMin - floatMin) / (floatMax - floatMin)) * 100}%`,
                      width: `${(0.01 / (floatMax - floatMin)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mono text-[9px] text-slate-600 mt-1">
                  <span>{floatMin.toFixed(2)}</span>
                  <span className="text-cyan-400">{selected.floatMin.toFixed(2)}–{selected.floatMax.toFixed(2)}</span>
                  <span>{floatMax.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* Stats */}
          {minPrice != null && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 space-y-3">
              {[
                { label: 'lowest', value: fmt(minPrice), color: 'text-emerald-300' },
                { label: 'highest', value: fmt(maxPrice!), color: 'text-violet-300' },
                { label: 'average', value: fmt(avgPrice!), color: 'text-slate-300' },
                { label: 'premium', value: premium ? `+${premium.toFixed(1)}%` : '—', color: premium && premium >= 20 ? 'text-cyan-300' : 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                  <span className={`mono text-sm font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bucket list */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">All buckets</h3>
            <div className="space-y-0.5">
              {buckets.map((b) => (
                <button
                  key={b.floatMin}
                  type="button"
                  onClick={() => b.price != null && setSelected(b)}
                  className={[
                    'w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors',
                    selected?.floatMin === b.floatMin ? 'bg-cyan-950/50' :
                    b.price != null ? 'hover:bg-slate-800/50' : 'opacity-30 cursor-default',
                  ].join(' ')}
                >
                  <span className={`mono text-[11px] ${selected?.floatMin === b.floatMin ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {b.floatMin.toFixed(2)}–{b.floatMax.toFixed(2)}
                  </span>
                  <span className={`mono text-[11px] font-medium ${b.price != null ? 'text-emerald-400' : 'text-slate-700'}`}>
                    {b.price != null ? fmt(b.price) : '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
