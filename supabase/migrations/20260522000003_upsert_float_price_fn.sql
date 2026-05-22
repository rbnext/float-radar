create or replace function upsert_float_price(
  p_market_hash_name text,
  p_float_value       numeric,
  p_price             numeric
) returns void as $$
declare
  v_item_id int;
begin
  insert into items (market_hash_name)
  values (p_market_hash_name)
  on conflict (market_hash_name) do nothing;

  select id into v_item_id
  from items
  where market_hash_name = p_market_hash_name;

  insert into float_prices (item_id, float_value, price)
  values (v_item_id, p_float_value, p_price)
  on conflict (item_id, float_value)
  do update set price = excluded.price;
end;
$$ language plpgsql;
