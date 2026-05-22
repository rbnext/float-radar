import { supabase } from '../supabase'
import type { FloatPrice } from './types'

type UpsertOne = { itemId: number; floatValue: number; price: number }

export const floatPrices = {
  get(itemId: number): Promise<FloatPrice[]> {
    return supabase
      .from('float_prices')
      .select('*')
      .eq('item_id', itemId)
      .order('float_value')
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  upsert(itemId: number, floatValue: number, price: number): Promise<FloatPrice> {
    return supabase
      .from('float_prices')
      .upsert(
        { item_id: itemId, float_value: floatValue, price },
        { onConflict: 'item_id,float_value' },
      )
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  upsertMany(prices: UpsertOne[]): Promise<FloatPrice[]> {
    const rows = prices.map(({ itemId, floatValue, price }) => ({
      item_id: itemId,
      float_value: floatValue,
      price,
    }))

    return supabase
      .from('float_prices')
      .upsert(rows, { onConflict: 'item_id,float_value' })
      .select()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  },

  delete(itemId: number, floatValue: number): Promise<void> {
    return supabase
      .from('float_prices')
      .delete()
      .eq('item_id', itemId)
      .eq('float_value', floatValue)
      .then(({ error }) => {
        if (error) throw error
      })
  },
}
