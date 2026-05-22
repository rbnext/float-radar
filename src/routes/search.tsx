import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '../lib/db'

const getWeapons = createServerFn({ method: 'GET' })
  .handler(() => db.items.getWeapons())

const getSkins = createServerFn({ method: 'GET' })
  .inputValidator((defIndex: number) => defIndex)
  .handler(({ data }) => db.items.getByDefIndex(data))

export const Route = createFileRoute('/search')({
  validateSearch: (s: Record<string, unknown>) => ({
    def_index: s.def_index != null ? Number(s.def_index) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { def_index } }) => {
    if (def_index != null) {
      const skins = await getSkins({ data: def_index })
      return { view: 'skins' as const, skins }
    }
    const weapons = await getWeapons()
    return { view: 'weapons' as const, weapons }
  },
  component: SearchPage,
})

function SearchPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/search" className="hover:text-gray-300 transition-colors">Search</Link>
        {search.def_index != null && result.view === 'skins' && (
          <>
            <span>/</span>
            <span className="text-gray-300">
              {result.skins[0]?.market_hash_name?.split(' | ')[0] ?? `def ${search.def_index}`}
            </span>
          </>
        )}
      </div>

      {result.view === 'weapons' && <WeaponsList weapons={result.weapons} />}
      {result.view === 'skins' && <SkinsList skins={result.skins} defIndex={search.def_index!} />}
    </div>
  )
}

function WeaponsList({ weapons }: { weapons: Awaited<ReturnType<typeof db.items.getWeapons>> }) {
  if (weapons.length === 0) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p className="text-lg">No data yet</p>
        <p className="text-sm mt-1">Skins will appear here once the parser runs</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Weapons</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {weapons.map((w) => (
          <Link
            key={w.def_index}
            to="/search"
            search={{ def_index: w.def_index }}
            className="block p-4 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800 transition-colors"
          >
            <div className="font-semibold text-white">{w.name}</div>
            <div className="text-xs text-gray-500 mt-1">{w.count} skins · def {w.def_index}</div>
          </Link>
        ))}
      </div>
    </>
  )
}

function SkinsList({ skins, defIndex }: { skins: Awaited<ReturnType<typeof db.items.getByDefIndex>>; defIndex: number }) {
  const weaponName = skins[0]?.market_hash_name?.split(' | ')[0] ?? `Weapon #${defIndex}`
  const navigate = useNavigate()

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{weaponName}</h1>
      <div className="overflow-hidden rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Skin</th>
              <th className="px-4 py-3 font-medium">Float range</th>
              <th className="px-4 py-3 font-medium">paint_index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {skins.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-900 transition-colors cursor-pointer"
                onClick={() =>
                  navigate({
                    to: '/item/$defIndex/$paintIndex',
                    params: {
                      defIndex: String(item.def_index),
                      paintIndex: String(item.paint_index),
                    },
                  })
                }
              >
                <td className="px-4 py-3 text-white font-medium">{item.market_hash_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 tabular-nums">
                  {item.float_min != null && item.float_max != null
                    ? `${item.float_min} – ${item.float_max}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{item.paint_index}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
