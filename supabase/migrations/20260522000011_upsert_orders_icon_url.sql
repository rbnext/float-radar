create or replace function upsert_orders(p_entries jsonb)
returns void as $$
declare
  v_entry   jsonb;
  v_item_id int;
begin
  for v_entry in select * from jsonb_array_elements(p_entries) loop

    insert into items (market_hash_name, item_name, def_index, paint_index, float_min, float_max, icon_url)
    values (
      v_entry->>'market_hash_name',
      v_entry->>'item_name',
      (v_entry->>'def_index')::int,
      (v_entry->>'paint_index')::int,
      (v_entry->>'skin_float_min')::numeric,
      (v_entry->>'skin_float_max')::numeric,
      v_entry->>'icon_url'
    )
    on conflict (market_hash_name) do update set
      item_name   = coalesce(excluded.item_name,   items.item_name),
      def_index   = coalesce(excluded.def_index,   items.def_index),
      paint_index = coalesce(excluded.paint_index, items.paint_index),
      float_min   = coalesce(excluded.float_min,   items.float_min),
      float_max   = coalesce(excluded.float_max,   items.float_max),
      icon_url    = coalesce(excluded.icon_url,    items.icon_url);

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
