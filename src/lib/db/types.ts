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
  def_index: number | null
  paint_index: number | null
  float_min: number | null
  float_max: number | null
  icon_url: string | null
  created_at: string
}

export type Order = {
  id: number
  csfloat_id: string
  item_id: number | null
  float_value: number
  price: number | null
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
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'updated_at'>
        Update: Partial<Omit<Order, 'id'>>
      }
    }
  }
}
