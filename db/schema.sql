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

create table if not exists product_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  file_key text not null,
  mime_type text,
  bytes bigint check (bytes is null or bytes >= 0),
  sort_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, sort_index)
);

create index if not exists product_assets_product_idx on product_assets(product_id, sort_index, created_at);

create table if not exists courses (
  product_id uuid primary key references products(id) on delete cascade,
  intro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(product_id) on delete cascade,
  title text not null,
  video_url text,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  sort_index int not null default 0,
  free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, sort_index)
);

create index if not exists course_videos_course_idx on course_videos(course_id, sort_index, created_at);

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references products(id) on delete cascade,
  customer_id uuid not null references users(id) on delete cascade,
  title text not null,
  details text,
  price_cents int check (price_cents is null or price_cents >= 0),
  status text not null default 'submitted' check (status in ('submitted','quoted','accepted','paid','delivered','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_customer_idx on service_requests(customer_id, created_at desc);
create index if not exists service_requests_service_idx on service_requests(service_id, created_at desc);

create table if not exists service_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists service_messages_request_idx on service_messages(request_id, created_at);

create table if not exists service_deliverables (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  label text not null,
  file_key text not null,
  mime_type text,
  bytes bigint check (bytes is null or bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists service_deliverables_request_idx on service_deliverables(request_id, created_at);

