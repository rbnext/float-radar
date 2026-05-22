alter table items
  add column def_index   int,
  add column paint_index int;

alter table items
  add constraint items_def_paint_unique unique (def_index, paint_index);

create or replace function upsert_float_price(
  p_def_index    int,
  p_paint_index  int,
  p_float_value  numeric,
  p_price        numeric
) returns void as $$
declare
  v_item_id int;
begin
  insert into items (def_index, paint_index)
  values (p_def_index, p_paint_index)
  on conflict (def_index, paint_index) do nothing;

  select id into v_item_id
  from items
  where def_index = p_def_index and paint_index = p_paint_index;

  insert into float_prices (item_id, float_value, price)
  values (v_item_id, p_float_value, p_price)
  on conflict (item_id, float_value)
  do update set price = excluded.price;
end;
$$ language plpgsql;
