-- ============================================================
-- 0. Ensure float_prices exists (may not be present on remote)
-- ============================================================
create table if not exists float_prices (
  id          bigint generated always as identity primary key,
  item_id     int not null references items (id) on delete cascade,
  float_value numeric(10, 8) not null,
  price       numeric(14, 2) not null,
  updated_at  timestamptz not null default now(),
  unique (item_id, float_value)
);

create index if not exists float_prices_item_idx on float_prices (item_id);

create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists float_prices_updated_at on float_prices;
create trigger float_prices_updated_at
  before insert or update on float_prices
  for each row execute function set_updated_at();

-- ============================================================
-- 1. Add base_price to items
--    base_price = best buy order without float filter (reference price)
-- ============================================================
alter table items add column if not exists base_price numeric(14, 2);

-- ============================================================
-- 2. Drop orders table — no longer needed
--    float_prices now stores only anomaly buckets (price > base_price)
-- ============================================================
drop trigger if exists orders_updated_at on orders;
drop table  if exists orders cascade;
drop function if exists upsert_orders(jsonb);

-- ============================================================
-- 3. Recreate item_stats view
--    premium = (peak_price - base_price) / base_price × 100
-- ============================================================
drop view if exists item_stats;
create view item_stats as
select
  i.id,
  i.market_hash_name,
  i.item_name,
  i.wear_name,
  i.is_stattrak,
  i.is_souvenir,
  i.def_index,
  i.paint_index,
  i.float_min,
  i.float_max,
  i.icon_url,
  i.base_price,
  i.created_at,
  count(fp.id)                                                          as anomaly_count,
  max(fp.price)                                                         as peak_price,
  case
    when i.base_price > 0 and max(fp.price) is not null
    then round(((max(fp.price) - i.base_price) / i.base_price) * 100, 1)
    else null
  end                                                                   as premium
from items i
left join float_prices fp on fp.item_id = i.id
group by i.id;

-- ============================================================
-- 4. New upsert function
--    p_entry: {
--      market_hash_name, item_name, def_index, paint_index,
--      skin_float_min, skin_float_max, icon_url, wear_name,
--      is_stattrak, is_souvenir,
--      base_price,
--      buckets: [{ float_value, price }]   -- only anomalous buckets
--    }
-- ============================================================
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
    insert into float_prices (item_id, float_value, price)
    values (
      v_item_id,
      (v_bucket->>'float_value')::numeric,
      (v_bucket->>'price')::numeric
    )
    on conflict (item_id, float_value) do update set
      price = excluded.price;
  end loop;
end;
$$ language plpgsql;
