-- ============================================================
-- Удаляем старое что больше не нужно
-- ============================================================
drop table if exists float_prices cascade;
drop table if exists subcategories cascade;
drop table if exists categories cascade;

-- ============================================================
-- Приводим таблицу items к финальному виду
-- ============================================================

-- Убираем старые колонки если остались
alter table items drop column if exists subcategory_id;

-- Добавляем новые колонки
alter table items add column if not exists item_name   text;
alter table items add column if not exists def_index   int;
alter table items add column if not exists paint_index int;
alter table items add column if not exists prices      jsonb not null default '{}';

-- Чистим строки без market_hash_name (мусор от тестов)
delete from items where market_hash_name is null;

-- market_hash_name — NOT NULL и уникальный
alter table items alter column market_hash_name set not null;
alter table items drop constraint if exists items_market_hash_name_unique;
alter table items add  constraint items_market_hash_name_unique unique (market_hash_name);

-- Убираем старый unique по (def_index, paint_index) — больше не актуален
alter table items drop constraint if exists items_def_paint_unique;

-- ============================================================
-- Триггер updated_at для items.prices
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- Финальная функция для парсера
-- ============================================================
create or replace function upsert_float_prices(p_entries jsonb)
returns void as $$
declare
  v_entry jsonb;
begin
  for v_entry in select * from jsonb_array_elements(p_entries) loop

    insert into items (market_hash_name, item_name, def_index, paint_index, float_min, float_max)
    values (
      v_entry->>'market_hash_name',
      v_entry->>'item_name',
      (v_entry->>'def_index')::int,
      (v_entry->>'paint_index')::int,
      (v_entry->>'skin_float_min')::numeric,
      (v_entry->>'skin_float_max')::numeric
    )
    on conflict (market_hash_name) do nothing;

    update items
    set prices = prices || jsonb_build_object(
      v_entry->>'float_min',
      (v_entry->>'price')::numeric
    )
    where market_hash_name = v_entry->>'market_hash_name';

  end loop;
end;
$$ language plpgsql;
