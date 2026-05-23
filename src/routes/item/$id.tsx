import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { db } from "../../lib/db";
import type { Item } from "../../lib/db";
import { steamIcon } from "../../lib/steam";

const getData = createServerFn({ method: "GET" })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    const item = await db.items.getById(id);
    if (!item) throw notFound();
    const buckets = await db.floatPrices.getBuckets(id);
    return { item, buckets };
  });

export const Route = createFileRoute("/item/$id")({
  component: ItemPage,
  loader: ({ params }) => getData({ data: Number(params.id) }),
});

type Bucket = { floatMin: number; floatMax: number; pct: number; hasAnomaly: boolean };

function makeBuckets(
  item: Item,
  orderBuckets: { floatBucket: number; price: number }[]
): Bucket[] {
  const start = Math.floor(Number(item.float_min ?? 0) * 100) / 100;
  const end = Number(item.float_max ?? 1);
  const basePrice = Number(item.base_price ?? 0);

  // Нормализуем ключи до 2 знаков — данные в БД могут хранить точный float (0.07123…),
  // а не границу бакета (0.07). Если несколько записей попадают в один бакет — берём max price.
  const priceMap = new Map<number, number>();
  for (const b of orderBuckets) {
    const key = Math.round(b.floatBucket * 100) / 100;
    const prev = priceMap.get(key);
    if (prev == null || b.price > prev) priceMap.set(key, b.price);
  }

  const buckets: Bucket[] = [];
  for (let b = start; b < end - 0.001; b = Math.round((b + 0.01) * 100) / 100) {
    const min = Math.round(b * 100) / 100;
    const max = Math.round((min + 0.01) * 100) / 100;
    const price = priceMap.get(min) ?? null;
    const pct = price != null && basePrice > 0
      ? ((price - basePrice) / basePrice) * 100
      : 0;
    buckets.push({ floatMin: min, floatMax: max, pct, hasAnomaly: price != null });
  }
  return buckets;
}

function fmtPct(pct: number) {
  return `+${pct.toFixed(1)}%`;
}

function ItemPage() {
  const { item, buckets: orderBuckets } = Route.useLoaderData();
  const floatMin = Number(item.float_min ?? 0);
  const floatMax = Number(item.float_max ?? 1);
  const buckets = makeBuckets(item, orderBuckets);
  const bucketsWithData = buckets.filter((b) => b.hasAnomaly);
  const [selected, setSelected] = useState<Bucket | null>(
    bucketsWithData[0] ?? null
  );

  const pcts = bucketsWithData.map((b) => b.pct);
  const maxPct = pcts.length ? Math.max(...pcts) : null;
  // когда данных совсем нет — рисуем все бары на полную высоту (domain [0,1])
  const noData = bucketsWithData.length === 0;
  // небольшая высота-заглушка для пустых бакетов — ~6% от максимума, минимум 0.5
  const emptyHeight = noData ? 1 : Math.max(maxPct! * 0.06, 0.5);

  const chartData = buckets.map((b) => ({
    label: b.floatMin.toFixed(2),
    pct: b.hasAnomaly ? b.pct : emptyHeight,
    floatMin: b.floatMin,
    floatMax: b.floatMax,
    hasAnomaly: b.hasAnomaly,
    isEmpty: !b.hasAnomaly,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {steamIcon(item.icon_url) && (
            <img
              src={steamIcon(item.icon_url)!}
              alt=""
              className="h-16 object-contain drop-shadow-lg"
            />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">
              def {item.def_index} · paint {item.paint_index}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white leading-tight">
                {item.item_name ?? item.market_hash_name}
              </h1>
              {item.is_stattrak && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">StatTrak™</span>}
              {item.is_souvenir && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">Souvenir</span>}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {item.market_hash_name && (
                <span className="mr-2">{item.wear_name}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                {floatMin.toFixed(2)} – {floatMax.toFixed(2)}
              </span>
              {maxPct != null && (
                <span
                  className={`mono text-xs px-2 py-0.5 rounded-md border font-semibold ${
                    maxPct >= 50
                      ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
                      : maxPct >= 20
                        ? "bg-cyan-950/50 border-cyan-500/25 text-cyan-300"
                        : "bg-slate-800 border-slate-700/60 text-slate-300"
                  }`}
                >
                  up to +{maxPct.toFixed(1)}% anomaly
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          to="/search"
          search={{ def_index: undefined, browse: undefined }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          ← back
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_240px] gap-5">
        {/* Left: chart + detail */}
        <div className="space-y-4">
          {/* Chart */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Float premium chart
              </h2>
              {noData ? (
                <span className="text-[10px] text-slate-600 italic">no pricing data yet</span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  {bucketsWithData.length} / {buckets.length} buckets with data
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Each bar is a 0.01-wide float range. Height shows how much buyers pay
              <span className="text-slate-400"> above the base market price</span> for skins in that range.
              {!noData && " Click a bar to inspect the bucket."}
            </p>

            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={chartData}
                barCategoryGap="20%"
                onClick={(d) => {
                  if (d?.activePayload?.[0]) {
                    const pt = d.activePayload[0].payload;
                    if (pt.hasAnomaly) {
                      setSelected({
                        floatMin: pt.floatMin,
                        floatMax: pt.floatMax,
                        pct: pt.pct,
                        hasAnomaly: pt.hasAnomaly,
                      });
                    }
                  }
                }}
              >
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: "#475569",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={
                    noData
                      ? false
                      : {
                          fill: "#475569",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }
                  }
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `+${v.toFixed(0)}%`}
                  width={noData ? 8 : 52}
                  domain={[0, noData ? 1 : maxPct != null && maxPct > 0 ? "auto" : 20]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0d1219] border border-slate-700/80 rounded-lg px-3 py-2 text-xs shadow-xl">
                        <p className="mono text-slate-400 mb-1">
                          {d.label} – {d.floatMax.toFixed(2)}
                        </p>
                        <p className={`mono font-bold text-sm ${d.hasAnomaly ? "text-emerald-300" : "text-slate-600"}`}>
                          {d.hasAnomaly ? `+${d.pct?.toFixed(1)}%` : "no data"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        !entry.hasAnomaly
                          ? "#1e293b"
                          : selected?.floatMin === entry.floatMin
                            ? "#22d3ee"
                            : maxPct != null && entry.pct >= maxPct * 0.95
                              ? "#34d399"
                              : "#1e40af"
                      }
                      opacity={!entry.hasAnomaly ? 0.5 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/80" />
                high premium (&gt;95% of peak)
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-700/80" />
                anomaly detected
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-700/60" />
                no data
              </span>
            </div>
          </div>

          {/* Selected bucket detail */}
          {selected?.hasAnomaly && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-cyan-400/80 mb-1">
                    Selected bucket
                  </div>
                  <div className="mono text-lg font-bold text-white">
                    {selected.floatMin.toFixed(2)} –{" "}
                    {selected.floatMax.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 mb-1">above base</div>
                  <div className="mono text-2xl font-bold text-emerald-300">
                    +{selected.pct.toFixed(1)}%
                  </div>
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
                  <span className="text-cyan-400">
                    {selected.floatMin.toFixed(2)}–
                    {selected.floatMax.toFixed(2)}
                  </span>
                  <span>{floatMax.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* Bucket list */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Anomaly buckets
            </h3>
            <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
              Float ranges where buy orders exceed the base market price. Higher % = rarer float, more demand.
            </p>
            <div className="space-y-0.5">
              {buckets.map((b) => (
                <button
                  key={b.floatMin}
                  type="button"
                  onClick={() => b.hasAnomaly && setSelected(b)}
                  className={[
                    "w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors",
                    selected?.floatMin === b.floatMin
                      ? "bg-cyan-950/50"
                      : b.hasAnomaly
                        ? "hover:bg-slate-800/50"
                        : "opacity-30 cursor-default",
                  ].join(" ")}
                >
                  <span
                    className={`mono text-[11px] ${selected?.floatMin === b.floatMin ? "text-cyan-300" : "text-slate-400"}`}
                  >
                    {b.floatMin.toFixed(2)}–{b.floatMax.toFixed(2)}
                  </span>
                  <span
                    className={`mono text-[11px] font-medium ${b.hasAnomaly ? "text-emerald-400" : "text-slate-700"}`}
                  >
                    {b.hasAnomaly ? fmtPct(b.pct) : "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
