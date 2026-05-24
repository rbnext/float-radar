import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { Breadcrumbs } from "../../lib/breadcrumbs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Bucket = {
  floatMin: number
  floatMax: number
  pct: number
  price: number | null
  hasAnomaly: boolean
  csfloatId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuckets(
  item: Item,
  orderBuckets: { floatBucket: number; price: number; csfloatId: string | null }[]
): Bucket[] {
  const start = Math.floor(Number(item.float_min ?? 0) * 100) / 100;
  const end = Number(item.float_max ?? 1);
  const basePrice = Number(item.base_price ?? 0);

  const priceMap = new Map<number, { price: number; csfloatId: string | null }>();
  for (const b of orderBuckets) {
    const key = Math.round(b.floatBucket * 100) / 100;
    const prev = priceMap.get(key);
    if (prev == null || b.price > prev.price)
      priceMap.set(key, { price: b.price, csfloatId: b.csfloatId });
  }

  const buckets: Bucket[] = [];
  for (let b = start; b < end - 0.001; b = Math.round((b + 0.01) * 100) / 100) {
    const min = Math.round(b * 100) / 100;
    const max = Math.round((min + 0.01) * 100) / 100;
    const entry = priceMap.get(min) ?? null;
    const price = entry?.price ?? null;
    const pct =
      price != null && basePrice > 0
        ? ((price - basePrice) / basePrice) * 100
        : 0;
    buckets.push({
      floatMin: min,
      floatMax: max,
      pct,
      price,
      hasAnomaly: price != null,
      csfloatId: entry?.csfloatId ?? null,
    });
  }
  return buckets;
}

function fmtUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function csfloatUrl(defIndex: number, paintIndex: number, min: number, max: number, marketHashName: string) {
  const params = new URLSearchParams({
    market_hash_name: marketHashName,
    def_index: String(defIndex),
    paint_index: String(paintIndex),
    min_float: min.toFixed(3),
    max_float: max.toFixed(3),
  });
  return `https://csfloat.com/search?${params}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ItemPage() {
  const { item, buckets: orderBuckets } = Route.useLoaderData();
  const floatMin = Number(item.float_min ?? 0);
  const floatMax = Number(item.float_max ?? 1);
  const basePrice = Number(item.base_price ?? 0);
  const buckets = makeBuckets(item, orderBuckets);
  const bucketsWithData = buckets.filter((b) => b.hasAnomaly);

  const [selected, setSelected] = useState<Bucket | null>(bucketsWithData[0] ?? null);

  const [copied, setCopied] = useState(false);
  const copyName = useCallback(() => {
    navigator.clipboard.writeText(item.market_hash_name).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [item.market_hash_name]);

  const pcts = bucketsWithData.map((b) => b.pct);
  const maxPct = pcts.length ? Math.max(...pcts) : null;
  const noData = bucketsWithData.length === 0;
  const emptyHeight = noData ? 1 : Math.max(maxPct! * 0.06, 0.5);

  const chartData = buckets.map((b) => ({
    label: b.floatMin.toFixed(2),
    pct: b.hasAnomaly ? b.pct : emptyHeight,
    price: b.price,
    floatMin: b.floatMin,
    floatMax: b.floatMax,
    hasAnomaly: b.hasAnomaly,
  }));

  return (
    <div className="space-y-5">
      <Breadcrumbs crumbs={[
        { label: "Home", to: "/" },
        { label: "Browse", to: "/search", search: { def_index: undefined, browse: undefined } },
        { label: item.market_hash_name },
      ]} />

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        {steamIcon(item.icon_url) && (
          <img
            src={steamIcon(item.icon_url)!}
            alt=""
            className="h-16 object-contain drop-shadow-lg shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">
            def {item.def_index} · paint {item.paint_index}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white leading-tight">
              {item.item_name ?? item.market_hash_name}
            </h1>
            {item.is_stattrak && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">
                StatTrak™
              </span>
            )}
            {item.is_souvenir && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                Souvenir
              </span>
            )}
            <button
              type="button"
              onClick={copyName}
              title={copied ? "Copied!" : item.market_hash_name}
              className="text-slate-600 hover:text-slate-300 transition-colors"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
              {floatMin.toFixed(2)} – {floatMax.toFixed(2)}
            </span>
            {bucketsWithData.length > 0 && (
              <span className="mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                {bucketsWithData.length} anomaly {bucketsWithData.length === 1 ? "range" : "ranges"}
              </span>
            )}
            {maxPct != null && (
              <span className={`mono text-xs px-2 py-0.5 rounded-md border font-semibold ${
                maxPct >= 50
                  ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
                  : maxPct >= 20
                    ? "bg-cyan-950/50 border-cyan-500/25 text-cyan-300"
                    : "bg-slate-800 border-slate-700/60 text-slate-300"
              }`}>
                up to +{maxPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">

        {/* Left: chart */}
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
            Each bar is a 0.01-wide float range. Height shows how much buyers pay{" "}
            <span className="text-slate-400">above the base market price</span> for skins in that range.
            {!noData && " Click a bar to select a range."}
          </p>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              barCategoryGap="20%"
              onClick={(d) => {
                if (d?.activePayload?.[0]) {
                  const pt = d.activePayload[0].payload;
                  if (pt.hasAnomaly) {
                    const bucket = buckets.find((b) => b.floatMin === pt.floatMin);
                    if (bucket) setSelected(bucket);
                  }
                }
              }}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={noData ? false : { fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
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
                    <div className="bg-[#0d1219] border border-slate-700/80 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
                      <p className="mono text-slate-400">
                        {d.label} – {d.floatMax.toFixed(2)}
                      </p>
                      {d.hasAnomaly ? (
                        <>
                          <p className="mono font-bold text-sm text-emerald-300">+{d.pct?.toFixed(1)}%</p>
                          {d.price != null && basePrice > 0 && (
                            <p className="mono text-slate-500 text-[10px]">
                              {fmtUsd(d.price)} bid · base {fmtUsd(basePrice)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mono font-bold text-sm text-slate-600">no data</p>
                      )}
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

        {/* Right sidebar */}
        <aside className="space-y-3">

          {/* Anomaly ranges list */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Anomaly ranges
            </h3>
            <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
              Float ranges with elevated buy orders. Click to select.
            </p>

            {noData ? (
              <p className="text-xs text-slate-600 italic">No data yet</p>
            ) : (
              <div className="space-y-0.5">
                {bucketsWithData.map((b) => {
                  const isSelected = selected?.floatMin === b.floatMin;
                  return (
                    <button
                      key={b.floatMin}
                      type="button"
                      onClick={() => setSelected(b)}
                      className={[
                        "w-full flex items-center justify-between rounded-lg px-2 py-2 text-left transition-colors gap-2",
                        isSelected ? "bg-cyan-950/50" : "hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      <span className={`mono text-[11px] shrink-0 ${isSelected ? "text-cyan-300" : "text-slate-400"}`}>
                        {b.floatMin.toFixed(2)}–{b.floatMax.toFixed(2)}
                      </span>
                      <span className="mono text-[11px] font-semibold text-emerald-400 shrink-0">
                        +{b.pct.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CSFloat CTA */}
          {selected?.hasAnomaly && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Selected range</p>
                <p className="mono text-sm font-bold text-white">
                  {selected.floatMin.toFixed(2)} – {selected.floatMax.toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="mono text-xs text-emerald-400 font-semibold">
                    +{selected.pct.toFixed(1)}%
                  </span>
                  {selected.price != null && (
                    <span className="mono text-xs text-slate-500">
                      · top bid {fmtUsd(selected.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Float range bar */}
              <div>
                <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-cyan-500/60 rounded-full"
                    style={{
                      left: `${((selected.floatMin - floatMin) / (floatMax - floatMin)) * 100}%`,
                      width: `${(0.01 / (floatMax - floatMin)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mono text-[9px] text-slate-600 mt-1">
                  <span>{floatMin.toFixed(2)}</span>
                  <span>{floatMax.toFixed(2)}</span>
                </div>
              </div>

              <a
                href={csfloatUrl(item.def_index, item.paint_index, selected.floatMin, selected.floatMax, item.market_hash_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
              >
                Find listings on CSFloat
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
