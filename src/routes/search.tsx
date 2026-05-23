import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { steamIcon } from '../lib/steam'

const PAGE_SIZE = 10

type ItemStat = {
  id: number
  market_hash_name: string
  item_name: string | null
  wear_name: string | null
  is_stattrak: boolean
  is_souvenir: boolean
  float_min: number | null
  float_max: number | null
  icon_url: string | null
  min_price: number | null
  max_price: number | null
  anomaly_count: number
  premium: number | null
}

const getTopItems = createServerFn({ method: 'GET' })
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

const getWeapons = createServerFn({ method: 'GET' })
  .handler(() => db.items.getWeapons())

const getSkins = createServerFn({ method: 'GET' })
  .inputValidator((defIndex: number) => defIndex)
  .handler(({ data }) => db.items.getByDefIndex(data))

export const Route = createFileRoute('/search')({
  validateSearch: (s: Record<string, unknown>) => ({
    def_index: s.def_index != null ? Number(s.def_index) : undefined as number | undefined,
    browse: (s.browse === '1' || s.browse === true) ? true : undefined as true | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { def_index, browse } }) => {
    if (def_index != null) {
      const skins = await getSkins({ data: def_index })
      return { view: 'skins' as const, skins }
    }
    if (browse) {
      const weapons = await getWeapons()
      return { view: 'weapons' as const, weapons }
    }
    const topItems = await getTopItems({ data: 0 })
    return { view: 'top' as const, topItems }
  },
  component: SearchPage,
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

function SearchPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/search" search={{ def_index: undefined, browse: undefined }} className="hover:text-slate-300 transition-colors">Search</Link>
        {search.browse && (
          <>
            <span>/</span>
            <span className="text-slate-300">Browse weapons</span>
          </>
        )}
        {search.def_index != null && result.view === 'skins' && (
          <>
            <span>/</span>
            <Link to="/search" search={{ def_index: undefined, browse: true }} className="hover:text-slate-300 transition-colors">
              Browse weapons
            </Link>
            <span>/</span>
            <span className="text-slate-300">
              {result.skins[0]?.market_hash_name?.split(' | ')[0] ?? `def ${search.def_index}`}
            </span>
          </>
        )}
      </div>

      {result.view === 'top' && <TopItemsView initialItems={result.topItems} />}
      {result.view === 'weapons' && <WeaponsList weapons={result.weapons} />}
      {result.view === 'skins' && <SkinsList skins={result.skins} defIndex={search.def_index!} />}
    </div>
  )
}

function TopItemsView({ initialItems }: { initialItems: ItemStat[] }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemStat[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialItems.length === PAGE_SIZE)

  const loadMore = async () => {
    setLoading(true)
    const next = await getTopItems({ data: items.length })
    setItems(prev => [...prev, ...next])
    setHasMore(next.length === PAGE_SIZE)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Float Anomalies</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">sorted by anomaly size</span>
          <Link
            to="/search"
            search={{ def_index: undefined, browse: true }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            Browse weapons →
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <p className="text-lg">No skins yet</p>
          <p className="text-sm mt-1">Items will appear once the parser runs</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-700/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/80 text-left border-b border-slate-700/80">
                  <th className="w-[70px]" />
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Skin</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Float</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Min</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Max</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Anomaly</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium text-right">Buckets</th>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-white">{item.item_name ?? item.market_hash_name}</span>
                        {item.is_stattrak && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">ST</span>
                        )}
                        {item.is_souvenir && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">SV</span>
                        )}
                      </div>
                      {item.wear_name && (
                        <div className={`text-xs mt-0.5 ${WEAR_COLOR[item.wear_name] ?? 'text-slate-500'}`}>
                          {item.wear_name}
                        </div>
                      )}
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
                      {item.anomaly_count}
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
        </>
      )}
    </div>
  )
}

function WeaponsList({ weapons }: { weapons: Awaited<ReturnType<typeof db.items.getWeapons>> }) {
  if (weapons.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p className="text-lg">No data yet</p>
        <p className="text-sm mt-1">Skins will appear here once the parser runs</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Browse Weapons</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {weapons.map((w) => (
          <Link
            key={w.def_index}
            to="/search"
            search={{ def_index: w.def_index, browse: undefined }}
            className="block p-4 rounded-lg border border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40 transition-colors"
          >
            <div className="font-semibold text-white text-sm">{w.name}</div>
            <div className="text-xs text-slate-500 mt-1">{w.count} skins</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SkinsList({
  skins,
  defIndex,
}: {
  skins: Awaited<ReturnType<typeof db.items.getByDefIndex>>
  defIndex: number
}) {
  const weaponName = skins[0]?.market_hash_name?.split(' | ')[0] ?? `Weapon #${defIndex}`
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">{weaponName}</h1>
      <div className="overflow-hidden rounded-xl border border-slate-700/80">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/80 text-left border-b border-slate-700/80">
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Skin</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Float range</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">paint_index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {skins.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() =>
                  navigate({
                    to: '/item/$id',
                    params: { id: String(item.id) },
                  })
                }
              >
                <td className="px-4 py-3 text-white font-medium">{item.market_hash_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400 mono text-xs">
                  {item.float_min != null && item.float_max != null
                    ? `${item.float_min} – ${item.float_max}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 mono text-xs">{item.paint_index}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
