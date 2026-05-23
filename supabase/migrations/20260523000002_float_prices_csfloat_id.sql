-- Add csfloat_id to float_prices
-- Stores the CSFloat listing ID of the best (highest) order in this bucket.
-- Used by the parser to check https://csfloat.com/item/{csfloat_id} directly
-- on the next run instead of re-scanning all orders for the skin.

alter table float_prices
  add column if not exists csfloat_id text;

-- Update upsert_item_anomalies to accept csfloat_id per bucket
-- bucket shape: { float_value, price, csfloat_id }
create or replace function upsert_item_anomalies(p_entry jsonb)
returns void as $$
declare
  v_item_id int;
  v_bucket  jsonb;
begin
  -- upsert item metadata + base_price
  insert into items (
    market_hash_name, item_name, def_index, paint_index,
    float_min, float_max, icon_url, wear_name,
    is_stattrak, is_souvenir, base_price
  )
  values (
    p_entry->>'market_hash_name',
    p_entry->>'item_name',
    (p_entry->>'def_index')::int,
    (p_entry->>'paint_index')::int,
    (p_entry->>'skin_float_min')::numeric,
    (p_entry->>'skin_float_max')::numeric,
    p_entry->>'icon_url',
    (p_entry->>'wear_name')::wear_condition,
    coalesce((p_entry->>'is_stattrak')::boolean, false),
    coalesce((p_entry->>'is_souvenir')::boolean, false),
    (p_entry->>'base_price')::numeric
  )
  on conflict (market_hash_name) do update set
    item_name   = coalesce(excluded.item_name,   items.item_name),
    def_index   = coalesce(excluded.def_index,   items.def_index),
    paint_index = coalesce(excluded.paint_index, items.paint_index),
    float_min   = coalesce(excluded.float_min,   items.float_min),
    float_max   = coalesce(excluded.float_max,   items.float_max),
    icon_url    = coalesce(excluded.icon_url,    items.icon_url),
    wear_name   = coalesce(excluded.wear_name,   items.wear_name),
    is_stattrak = excluded.is_stattrak,
    is_souvenir = excluded.is_souvenir,
    base_price  = excluded.base_price;

  select id into strict v_item_id
  from items where market_hash_name = p_entry->>'market_hash_name';

  -- replace all anomaly buckets for this item (full refresh)
  delete from float_prices where item_id = v_item_id;

  -- insert fresh anomaly buckets
  for v_bucket in select * from jsonb_array_elements(p_entry->'buckets') loop
    insert into float_prices (item_id, float_value, price, csfloat_id)
    values (
      v_item_id,
      (v_bucket->>'float_value')::numeric,
      (v_bucket->>'price')::numeric,
      v_bucket->>'csfloat_id'
    )
    on conflict (item_id, float_value) do update set
      price      = excluded.price,
      csfloat_id = excluded.csfloat_id;
  end loop;
end;
$$ language plpgsql;
