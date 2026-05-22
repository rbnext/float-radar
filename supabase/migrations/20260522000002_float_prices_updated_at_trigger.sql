create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger float_prices_updated_at
before insert or update on float_prices
for each row execute function set_updated_at();
