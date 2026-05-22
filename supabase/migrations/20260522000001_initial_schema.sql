create table categories (
  id   smallint generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

create table subcategories (
  id          smallint generated always as identity primary key,
  category_id smallint not null references categories (id) on delete cascade,
  name        text not null,
  slug        text not null,
  unique (category_id, slug)
);

create table items (
  id               int generated always as identity primary key,
  market_hash_name text not null unique,
  subcategory_id   smallint references subcategories (id) on delete set null,
  float_min        numeric(10, 8),
  float_max        numeric(10, 8),
  image_url        text,
  created_at       timestamptz not null default now()
);

create index items_subcategory_idx on items (subcategory_id);

create table float_prices (
  id          bigint generated always as identity primary key,
  item_id     int not null references items (id) on delete cascade,
  float_value numeric(10, 8) not null,
  price       numeric(14, 2) not null,
  updated_at  timestamptz not null default now(),
  unique (item_id, float_value)
);

create index float_prices_item_idx on float_prices (item_id);
