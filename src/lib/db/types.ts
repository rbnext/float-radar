export type WearName =
  | 'Factory New'
  | 'Minimal Wear'
  | 'Field-Tested'
  | 'Well-Worn'
  | 'Battle-Scarred'

export type Item = {
  id: number
  market_hash_name: string
  item_name: string | null
  wear_name: WearName | null
  is_stattrak: boolean
  is_souvenir: boolean
  def_index: number | null
  paint_index: number | null
  float_min: number | null
  float_max: number | null
  icon_url: string | null
  base_price: number | null
  created_at: string
}

export type FloatPrice = {
  id: number
  item_id: number
  float_value: number
  price: number
  csfloat_id: string | null
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'created_at'>
        Update: Partial<Omit<Item, 'id' | 'created_at'>>
      }
      float_prices: {
        Row: FloatPrice
        Insert: Omit<FloatPrice, 'id' | 'updated_at'>
        Update: Partial<Omit<FloatPrice, 'id'>>
      }
    }
  }
}
