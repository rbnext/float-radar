import { supabase } from '../supabase'
import type { Item } from './types'

type ItemUpsert = {
  def_index: number
  paint_index: number
  market_hash_name?: string | null
  float_min?: number | null
  float_max?: number | null
  icon_url?: string | null
}

export type Weapon = {
  def_index: number
  name: string
  count: number
}

export const items = {
  getWeapons(): Promise<Weapon[]> {
    return supabase
      .from('items')
      .select('def_index, market_hash_name')
      .not('def_index', 'is', null)
      .then(({ data, error }) => {
        if (error) throw error
        const map = new Map<number, { name: string; count: number }>()
        for (const row of data ?? []) {
          if (row.def_index == null) continue
          const weaponName = row.market_hash_name?.split(' | ')[0] ?? `Weapon #${row.def_index}`
          const existing = map.get(row.def_index)
          if (existing) existing.count++
          else map.set(row.def_index, { name: weaponName, count: 1 })
        }
        return Array.from(map.entries())
          .map(([def_index, { name, count }]) => ({ def_index, name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))
      })
  },

  getById(id: number): Promise<Item | null> {
    return supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  getByDefIndex(defIndex: number): Promise<Item[]> {
    return supabase
      .from('items')
      .select('*')
      .eq('def_index', defIndex)
      .order('market_hash_name')
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  getByDefPaint(defIndex: number, paintIndex: number): Promise<Item | null> {
    return supabase
      .from('items')
      .select('*')
      .eq('def_index', defIndex)
      .eq('paint_index', paintIndex)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  upsert(data: ItemUpsert): Promise<Item> {
    return supabase
      .from('items')
      .upsert(data, { onConflict: 'def_index,paint_index' })
      .select()
      .single()
      .then(({ data: row, error }) => {
        if (error) throw error
        return row
      })
  },
}
