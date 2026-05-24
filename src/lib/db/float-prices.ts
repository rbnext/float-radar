import { supabase } from '../supabase'

export const floatPrices = {
  // All anomaly buckets for an item — used for the price chart.
  // Возвращаем данные, сгруппированные по бакету (округление до 2 знаков),
  // с max price — так точные float-значения (0.07123…) правильно попадают в бакет 0.07.
  getBuckets(itemId: number): Promise<{ floatBucket: number; price: number; csfloatId: string | null }[]> {
    return (supabase as any)
      .from('float_prices')
      .select('float_value, price, csfloat_id')
      .eq('item_id', itemId)
      .order('float_value')
      .then(({ data, error }: any) => {
        if (error) throw error
        const map = new Map<number, { price: number; csfloatId: string | null }>()
        for (const row of data ?? []) {
          const key = Math.round(Number(row.float_value) * 100) / 100
          const prev = map.get(key)
          if (prev == null || Number(row.price) > prev.price) {
            map.set(key, { price: Number(row.price), csfloatId: row.csfloat_id ?? null })
          }
        }
        return Array.from(map.entries())
          .sort(([a], [b]) => a - b)
          .map(([floatBucket, { price, csfloatId }]) => ({ floatBucket, price, csfloatId }))
      })
  },
}
