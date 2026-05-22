-- ============================================================
-- Drop legacy
-- ============================================================
alter table items drop column if exists prices;
drop function if exists upsert_float_prices(jsonb);
drop function if exists upsert_float_price(int, int, numeric, numeric);

-- ============================================================
-- items — final shape
-- ============================================================
alter table items alter column market_hash_name set not null;
alter table items drop constraint if exists items_market_hash_name_unique;
alter table items add  constraint items_market_hash_name_unique unique (market_hash_name);
alter table items drop constraint if exists items_def_paint_unique;

-- ============================================================
-- orders
-- ============================================================
create table if not exists orders (
  id          bigint generated always as identity primary key,
  csfloat_id  text not null unique,
  item_id     int references items (id) on delete set null,
  float_value numeric(10, 8) not null,
  price       numeric(14, 2),
  updated_at  timestamptz not null default now()
);

create index if not exists orders_item_id_idx on orders (item_id);
create index if not exists orders_updated_idx  on orders (updated_at);

-- ============================================================
-- Trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before insert or update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- upsert_orders — вызывается из парсера
-- entries: [{ market_hash_name, item_name, def_index, paint_index,
--             skin_float_min, skin_float_max, image_url,
--             csfloat_id, float_value, price }]
-- ============================================================
create or replace function upsert_orders(p_entries jsonb)
returns void as $$
declare
  v_entry  jsonb;
  v_item_id int;
begin
  for v_entry in select * from jsonb_array_elements(p_entries) loop

    -- upsert item metadata
    insert into items (market_hash_name, item_name, def_index, paint_index, float_min, float_max, image_url)
    values (
      v_entry->>'market_hash_name',
      v_entry->>'item_name',
      (v_entry->>'def_index')::int,
      (v_entry->>'paint_index')::int,
      (v_entry->>'skin_float_min')::numeric,
      (v_entry->>'skin_float_max')::numeric,
      v_entry->>'image_url'
    )
    on conflict (market_hash_name) do update set
      item_name   = coalesce(excluded.item_name,   items.item_name),
      def_index   = coalesce(excluded.def_index,   items.def_index),
      paint_index = coalesce(excluded.paint_index, items.paint_index),
      float_min   = coalesce(excluded.float_min,   items.float_min),
      float_max   = coalesce(excluded.float_max,   items.float_max),
      image_url   = coalesce(excluded.image_url,   items.image_url);

    select id into strict v_item_id
    from items where market_hash_name = v_entry->>'market_hash_name';

    -- upsert order
    insert into orders (csfloat_id, item_id, float_value, price)
    values (
      v_entry->>'csfloat_id',
      v_item_id,
      (v_entry->>'float_value')::numeric,
      (v_entry->>'price')::numeric
    )
    on conflict (csfloat_id) do update set
      price    = excluded.price,
      item_id  = excluded.item_id;

  end loop;
end;
$$ language plpgsql;
