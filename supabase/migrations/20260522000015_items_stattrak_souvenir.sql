alter table items
  add column if not exists is_stattrak boolean not null default false,
  add column if not exists is_souvenir boolean not null default false;

create or replace function upsert_orders(p_entries jsonb)
returns void as $$
declare
  v_entry   jsonb;
  v_item_id int;
begin
  for v_entry in select * from jsonb_array_elements(p_entries) loop

    insert into items (market_hash_name, item_name, def_index, paint_index, float_min, float_max, icon_url, wear_name, is_stattrak, is_souvenir)
    values (
      v_entry->>'market_hash_name',
      v_entry->>'item_name',
      (v_entry->>'def_index')::int,
      (v_entry->>'paint_index')::int,
      (v_entry->>'skin_float_min')::numeric,
      (v_entry->>'skin_float_max')::numeric,
      v_entry->>'icon_url',
      (v_entry->>'wear_name')::wear_condition,
      coalesce((v_entry->>'is_stattrak')::boolean, false),
      coalesce((v_entry->>'is_souvenir')::boolean, false)
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
      is_souvenir = excluded.is_souvenir;

    select id into strict v_item_id
    from items where market_hash_name = v_entry->>'market_hash_name';

    insert into orders (csfloat_id, item_id, float_value, price)
    values (
      v_entry->>'csfloat_id',
      v_item_id,
      (v_entry->>'float_value')::numeric,
      (v_entry->>'price')::numeric
    )
    on conflict (csfloat_id) do update set
      price   = excluded.price,
      item_id = excluded.item_id;

  end loop;
end;
$$ language plpgsql;

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
  i.created_at,
  min(o.price)                                               as min_price,
  max(o.price)                                               as max_price,
  count(o.id)                                                as order_count,
  case
    when min(o.price) > 0
    then round(((max(o.price) - min(o.price)) / min(o.price)) * 100, 1)
    else 0
  end                                                        as premium
from items i
left join orders o on o.item_id = i.id
group by i.id;
