create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','editor','customer')),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('product','course','service')),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  price_cents int not null check (price_cents >= 0),
  badge text,
  media jsonb default '[]'::jsonb,
  published boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_kind_published_idx on products(kind, published);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  total_cents int not null,
  status text not null check (status in ('pending','paid','failed','refunded')) default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  unit_price_cents int not null,
  qty int not null check (qty > 0)
);

create table if not exists entitlements (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
