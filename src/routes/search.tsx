import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { steamIcon } from '../lib/steam'

const PAGE_SIZE = 18 // 3 cols × 6 rows

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

type FilterParams = {
  offset: number
  wear?: string
  stattrak?: boolean
  def_index?: number
  q?: string
  sort?: string
}

const getItems = createServerFn({ method: 'GET' })
  .inputValidator((p: FilterParams) => p)
  .handler(async ({ data }) => {
    let query = (supabase as any)
      .from('item_stats')
      .select('*')

    if (data.sort === 'date') {
      query = query.order('id', { ascending: false })
    } else {
      query = query.order('premium', { ascending: false, nullsFirst: false })
    }

    if (data.wear) query = query.eq('wear_name', data.wear)
    if (data.stattrak) query = query.eq('is_stattrak', true)
    if (data.def_index != null) query = query.eq('def_index', data.def_index)
    if (data.q) query = query.ilike('market_hash_name', `%${data.q}%`)

    query = query.range(data.offset, data.offset + PAGE_SIZE - 1)
    const { data: rows, error } = await query
    if (error) throw error
    return (rows ?? []) as ItemStat[]
  })

const getWeapons = createServerFn({ method: 'GET' })
  .handler(() => db.items.getWeapons())

export const Route = createFileRoute('/search')({
  validateSearch: (s: Record<string, unknown>) => ({
    def_index: s.def_index != null ? Number(s.def_index) : undefined as number | undefined,
    wear: typeof s.wear === 'string' ? s.wear : undefined as string | undefined,
    stattrak: s.stattrak === '1' || s.stattrak === true ? (true as true) : undefined as true | undefined,
    q: typeof s.q === 'string' && s.q ? s.q : undefined as string | undefined,
    sort: typeof s.sort === 'string' ? s.sort : undefined as string | undefined,
    browse: undefined as true | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { def_index, wear, stattrak, q, sort } }) => {
    const [items, weapons] = await Promise.all([
      getItems({ data: { offset: 0, wear, stattrak: !!stattrak, def_index, q, sort } }),
      getWeapons(),
    ])
    return { items, weapons }
  },
  component: SearchPage,
})

// ─── Wear config ─────────────────────────────────────────────────────────────

const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'] as const

const WEAR_SHORT: Record<string, string> = {
  'Factory New':    'FN',
  'Minimal Wear':   'MW',
  'Field-Tested':   'FT',
  'Well-Worn':      'WW',
  'Battle-Scarred': 'BS',
}

const WEAR_DOT: Record<string, string> = {
  'Factory New':    'bg-cyan-400',
  'Minimal Wear':   'bg-blue-400',
  'Field-Tested':   'bg-yellow-400',
  'Well-Worn':      'bg-orange-400',
  'Battle-Scarred': 'bg-red-400',
}

const WEAR_TEXT: Record<string, string> = {
  'Factory New':    'text-cyan-400',
  'Minimal Wear':   'text-blue-400',
  'Field-Tested':   'text-yellow-400',
  'Well-Worn':      'text-orange-400',
  'Battle-Scarred': 'text-red-400',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SearchPage() {
  const { items: initialItems, weapons } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const filterKey = `${search.q ?? ''}|${search.wear ?? ''}|${search.stattrak ?? ''}|${search.def_index ?? ''}|${search.sort ?? ''}`

  const [inputValue, setInputValue] = useState(search.q ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync input if URL q changes externally (e.g. browser back)
  useEffect(() => {
    setInputValue(search.q ?? '')
  }, [search.q])

  const handleInput = (value: string) => {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        to: '/search',
        search: { ...search, q: value || undefined },
      })
    }, 400)
  }

  const searchInput = (className: string) => (
    <div className={`relative ${className}`}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Search…"
        className="w-full pl-8 pr-7 py-2 rounded-lg bg-slate-900/60 border border-slate-700/80 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
      />
      {inputValue && (
        <button
          type="button"
          onClick={() => handleInput('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Float Radar</p>
        <h1 className="text-2xl font-bold text-white">
          Browse{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Skins
          </span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore float anomalies — find float ranges where buyers pay a premium.
        </p>
      </div>

      {/* ── Mobile filters (hidden on md+) ── */}
      <div className="md:hidden space-y-3">
        {searchInput('')}
        {/* Wear pills — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          <WearPill label="All" active={!search.wear} wear={undefined} />
          {WEARS.map((w) => (
            <WearPill key={w} label={WEAR_SHORT[w]} active={search.wear === w} wear={w} />
          ))}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="flex gap-6 items-start">
        {/* Sidebar (hidden on mobile) */}
        <aside className="hidden md:block w-56 shrink-0 sticky top-20 space-y-5">
          {searchInput('')}

          {/* Wear filter */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2.5">Wear</p>
            <div className="space-y-0.5">
              <WearButton label="All" active={!search.wear} wear={undefined} />
              {WEARS.map((w) => (
                <WearButton key={w} label={w} active={search.wear === w} wear={w} />
              ))}
            </div>
          </div>
        </aside>

        {/* Cards */}
        <div className="flex-1 min-w-0">
          <ItemsGrid
            key={filterKey}
            initialItems={initialItems}
            search={{ wear: search.wear, stattrak: !!search.stattrak, def_index: search.def_index, q: search.q, sort: search.sort }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar controls ────────────────────────────────────────────────────────

function WearPill({ label, active, wear }: { label: string; active: boolean; wear: string | undefined }) {
  const search = Route.useSearch()
  return (
    <Link
      to="/search"
      search={{ ...search, wear }}
      className={[
        'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
        active
          ? 'bg-slate-800 border-slate-600 text-white'
          : 'border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200',
      ].join(' ')}
    >
      {wear ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${WEAR_DOT[wear]}`} />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-600" />
      )}
      {label}
    </Link>
  )
}

function WearButton({ label, active, wear }: { label: string; active: boolean; wear: string | undefined }) {
  const search = Route.useSearch()
  return (
    <Link
      to="/search"
      search={{ ...search, wear }}
      className={[
        'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors',
        active
          ? 'bg-slate-800 text-white'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
      ].join(' ')}
    >
      {wear ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${WEAR_DOT[wear]}`} />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-600" />
      )}
      {label}
    </Link>
  )
}

function StatTrakToggle({ active }: { active: boolean }) {
  const search = Route.useSearch()
  return (
    <Link
      to="/search"
      search={{ ...search, stattrak: active ? undefined : true }}
      className={[
        'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors',
        active
          ? 'bg-orange-950/50 text-orange-300 border border-orange-500/20'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-orange-400' : 'bg-slate-600'}`} />
      StatTrak™ only
    </Link>
  )
}

// ─── Cards grid ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'premium', label: 'Top premium' },
  { value: 'date',    label: 'Newest first' },
]

function SortSelect() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const current = search.sort ?? 'premium'

  return (
    <div className="relative">
      <select
        value={current}
        onChange={(e) =>
          navigate({ to: '/search', search: { ...search, sort: e.target.value === 'premium' ? undefined : e.target.value } })
        }
        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-slate-500 transition-colors cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

function ItemsGrid({
  initialItems,
  search,
}: {
  initialItems: ItemStat[]
  search: { wear?: string; stattrak?: boolean; def_index?: number; q?: string; sort?: string }
}) {
  const [items, setItems] = useState<ItemStat[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(initialItems.length === PAGE_SIZE)

  const loadMore = async () => {
    setLoading(true)
    const next = await getItems({
      data: { offset: items.length, ...search },
    })
    setItems((prev) => [...prev, ...next])
    setHasMore(next.length === PAGE_SIZE)
    setLoading(false)
  }

  const refresh = async () => {
    setRefreshing(true)
    const fresh = await getItems({ data: { offset: 0, ...search } })
    setItems(fresh)
    setHasMore(fresh.length === PAGE_SIZE)
    setRefreshing(false)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <svg className="w-10 h-10 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-base font-medium">No skins found</p>
        <p className="text-sm mt-1">Try adjusting the filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-700/80 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors disabled:opacity-40"
          >
            {refreshing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <SortSelect />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-slate-700/80 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: ItemStat }) {
  const premium = item.premium != null ? Number(item.premium) : null
  const isHot = premium != null && premium >= 50
  const isMid = premium != null && premium >= 20

  const accentBar = isHot ? 'bg-emerald-400' : isMid ? 'bg-cyan-400' : premium != null ? 'bg-blue-600' : 'bg-slate-700'
  const premiumColor = isHot ? 'text-emerald-300' : isMid ? 'text-cyan-300' : 'text-slate-400'
  const premiumBg = isHot ? 'bg-emerald-950/60 border-emerald-500/20' : isMid ? 'bg-cyan-950/60 border-cyan-500/20' : 'bg-slate-800/60 border-slate-700/40'

  return (
    <Link
      to="/item/$id"
      params={{ id: String(item.id) }}
      className="group relative flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-slate-600/80 transition-all overflow-hidden aspect-[4/3]"
    >
      {/* image — fills the card */}
      {steamIcon(item.icon_url) ? (
        <img
          src={steamIcon(item.icon_url)!}
          alt=""
          className="absolute inset-0 w-full h-full object-contain p-6 drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-800/60" />
      )}

      {/* gradient overlay at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* accent bar top */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentBar}`} />

      {/* premium badge — top right */}
      {premium != null && premium > 0 && (
        <div className={`absolute top-2.5 right-2.5 mono text-xs font-bold px-2 py-0.5 rounded-md border ${premiumBg} ${premiumColor} backdrop-blur-sm`}>
          +{premium.toFixed(1)}%
        </div>
      )}

      {/* badges top left */}
      {(item.is_stattrak || item.is_souvenir) && (
        <div className="absolute top-2.5 left-2.5 flex gap-1">
          {item.is_stattrak && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 backdrop-blur-sm">ST</span>
          )}
          {item.is_souvenir && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 backdrop-blur-sm">SV</span>
          )}
        </div>
      )}

      {/* info overlay — bottom */}
      <div className="absolute inset-x-0 bottom-0 px-3 py-2.5">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-1">
          {item.item_name ?? item.market_hash_name}
        </p>
        <div className="flex items-center justify-between mt-1">
          {item.wear_name && (
            <span className={`text-[10px] ${WEAR_TEXT[item.wear_name] ?? 'text-slate-400'}`}>
              {item.wear_name}
            </span>
          )}
          {item.float_min != null && item.float_max != null && (
            <span className="mono text-[9px] text-slate-500">
              {Number(item.float_min).toFixed(2)}–{Number(item.float_max).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
