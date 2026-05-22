import { supabase } from '../supabase'
import type { Order } from './types'

const STALE_MS = 60 * 60 * 1000 // 1 час

export const orders = {
  // Цены по 0.01 бакетам для айтема (лучшая цена в каждом бакете)
  getBuckets(itemId: number): Promise<{ floatBucket: number; price: number }[]> {
    return supabase
      .from('orders')
      .select('float_value, price')
      .eq('item_id', itemId)
      .not('price', 'is', null)
      .then(({ data, error }) => {
        if (error) throw error
        const buckets = new Map<number, number>()
        for (const row of data ?? []) {
          const bucket = Math.round(Math.floor(Number(row.float_value) * 100) / 100 * 100) / 100
          const existing = buckets.get(bucket)
          const price = Number(row.price)
          if (existing == null || price > existing) buckets.set(bucket, price)
        }
        return Array.from(buckets.entries())
          .map(([floatBucket, price]) => ({ floatBucket, price }))
          .sort((a, b) => a.floatBucket - b.floatBucket)
      })
  },

  // Вернуть csfloat_id которые устарели (нет в базе или старше STALE_MS)
  getStale(csfloatIds: string[]): Promise<string[]> {
    return supabase
      .from('orders')
      .select('csfloat_id, updated_at')
      .in('csfloat_id', csfloatIds)
      .then(({ data, error }) => {
        if (error) throw error
        const fresh = new Set(
          (data ?? [])
            .filter(r => Date.now() - new Date(r.updated_at).getTime() < STALE_MS)
            .map(r => r.csfloat_id)
        )
        return csfloatIds.filter(id => !fresh.has(id))
      })
  },

  upsertMany(rows: { csfloat_id: string; item_id: number; float_value: number; price: number | null }[]): Promise<Order[]> {
    return supabase
      .from('orders')
      .upsert(rows, { onConflict: 'csfloat_id' })
      .select()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },
}
