import { supabase } from '../supabase'

export const floatPrices = {
  // All anomaly buckets for an item — used for the price chart.
  // Возвращаем данные, сгруппированные по бакету (округление до 2 знаков),
  // с max price — так точные float-значения (0.07123…) правильно попадают в бакет 0.07.
  getBuckets(itemId: number): Promise<{ floatBucket: number; price: number }[]> {
    return (supabase as any)
      .from('float_prices')
      .select('float_value, price')
      .eq('item_id', itemId)
      .order('float_value')
      .then(({ data, error }: any) => {
        if (error) throw error
        const map = new Map<number, number>()
        for (const row of data ?? []) {
          const key = Math.round(Number(row.float_value) * 100) / 100
          const prev = map.get(key)
          if (prev == null || Number(row.price) > prev) map.set(key, Number(row.price))
        }
        return Array.from(map.entries())
          .sort(([a], [b]) => a - b)
          .map(([floatBucket, price]) => ({ floatBucket, price }))
      })
  },
}
