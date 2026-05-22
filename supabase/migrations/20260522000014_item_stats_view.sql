create or replace view item_stats as
select
  i.id,
  i.market_hash_name,
  i.item_name,
  i.wear_name,
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
