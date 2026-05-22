drop table if exists listings;

create table orders (
  id          bigint generated always as identity primary key,
  csfloat_id  text not null unique,
  item_id     int references items (id) on delete set null,
  float_value numeric(10, 8) not null,
  price       numeric(14, 2),
  updated_at  timestamptz not null default now()
);

create index orders_item_id_idx on orders (item_id);
create index orders_updated_idx on orders (updated_at);

create trigger orders_updated_at
before insert or update on orders
for each row execute function set_updated_at();
