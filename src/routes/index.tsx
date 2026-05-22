import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { steamIcon } from '../lib/steam'

const PAGE_SIZE = 10

type ItemStat = {
  id: number
  market_hash_name: string
  item_name: string | null
  wear_name: string | null
  float_min: number | null
  float_max: number | null
  icon_url: string | null
  min_price: number | null
  max_price: number | null
  order_count: number
  premium: number | null
}

const getItems = createServerFn({ method: 'GET' })
  .inputValidator((offset: number) => offset)
  .handler(async ({ data: offset }) => {
    const { data, error } = await (supabase as any)
      .from('item_stats')
      .select('*')
      .order('premium', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    return data as ItemStat[]
  })

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => getItems({ data: 0 }),
})

function fmt(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

const WEAR_COLOR: Record<string, string> = {
  'Factory New':    'text-cyan-400',
  'Minimal Wear':   'text-blue-400',
  'Field-Tested':   'text-yellow-400',
  'Well-Worn':      'text-orange-400',
  'Battle-Scarred': 'text-red-400',
}

function PremiumBadge({ premium }: { premium: number }) {
  const color = premium >= 50 ? 'text-emerald-300' : premium >= 20 ? 'text-cyan-300' : 'text-slate-400'
  return <span className={`mono font-semibold ${color}`}>+{premium.toFixed(1)}%</span>
}

function Home() {
  const initial = Route.useLoaderData()
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemStat[]>(initial)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE)

  const loadMore = async () => {
    setLoading(true)
    const next = await getItems({ data: items.length })
    setItems(prev => [...prev, ...next])
    setHasMore(next.length === PAGE_SIZE)
    setLoading(false)
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p className="text-lg">No skins yet</p>
        <p className="text-sm mt-1">Items will appear once the parser runs</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Skins</h1>
        <span className="text-xs text-slate-500">sorted by float premium</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/80">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/80 text-left border-b border-slate-700/80">
              <th className="w-[70px]"></th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Skin</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Float</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Min</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Max</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Premium</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => navigate({ to: '/item/$id', params: { id: String(item.id) } })}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td className="pl-3 pr-2 py-1.5">
                  {steamIcon(item.icon_url) ? (
                    <img src={steamIcon(item.icon_url)!} alt="" className="h-[100px] w-[100px] object-contain" />
                  ) : (
                    <div className="h-[100px] w-[100px] bg-slate-800/50 rounded" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-white">{item.item_name ?? item.market_hash_name}</div>
                  <div className="text-[10px] text-slate-600 mono">def {item.def_index} · paint {item.paint_index}</div>
                </td>
                <td className="px-4 py-2.5 mono text-xs text-slate-400">
                  {item.float_min != null && item.float_max != null
                    ? `${Number(item.float_min).toFixed(2)} – ${Number(item.float_max).toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-right mono text-sm text-slate-300">
                  {item.min_price != null ? fmt(Number(item.min_price)) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right mono text-sm text-slate-300">
                  {item.max_price != null ? fmt(Number(item.max_price)) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {item.premium != null && Number(item.premium) > 0
                    ? <PremiumBadge premium={Number(item.premium)} />
                    : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right mono text-xs text-slate-500">
                  {item.order_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2.5 rounded-lg border border-slate-700/80 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
