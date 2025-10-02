insert into users (email, password_hash, role)
values ('admin@example.com', '$2b$12$g0kzG1q4v4cYFq9b8p2VgO3g8J0KpGvZq5Xz8l1Yv2o1o1s3u8t4C', 'admin')
on conflict (email) do nothing;

insert into products (kind, slug, title, subtitle, description, price_cents, published) values
('service','custom-website','Custom Website Build','Full-suite launch support','Bespoke, performance-tuned site.',250000,true),
('course','chatgpt-web-course','Build a Site with ChatGPT','Ship faster with AI workflows','Ship faster with AI.',9900,true),
('product','brand-kit','Brand Kit','Logos, palettes, templates','Logos/palettes/templates.',5900,true)
on conflict (slug) do update set title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price_cents = excluded.price_cents,
  published = excluded.published;

with course_product as (
  select id from products where slug = 'chatgpt-web-course'
)
insert into courses (product_id, intro)
select id, 'A tactical walkthrough of planning, designing, and shipping a production-grade marketing site with ChatGPT as your co-pilot.'
from course_product
on conflict (product_id) do update set intro = excluded.intro, updated_at = now();

with course_product as (
  select id from products where slug = 'chatgpt-web-course'
)
insert into course_videos (course_id, sort_index, title, video_url, duration_seconds, free_preview)
select id, sort_index, title, video_url, duration_seconds, free_preview
from (
  select id,
         1 as sort_index,
         'Framing the project' as title,
         'https://example.com/videos/framing.mp4' as video_url,
         420 as duration_seconds,
         true as free_preview
  from course_product
  union all
  select id, 2, 'Prompting for design systems', 'https://example.com/videos/design-systems.mp4', 540, false from course_product
  union all
  select id, 3, 'Shipping to Vercel + Neon', 'https://example.com/videos/deploy.mp4', 610, false from course_product
) seed
on conflict (course_id, sort_index) do update set
  title = excluded.title,
  video_url = excluded.video_url,
  duration_seconds = excluded.duration_seconds,
  free_preview = excluded.free_preview;

with kit as (
  select id from products where slug = 'brand-kit'
)
insert into product_assets (product_id, sort_index, label, file_key, mime_type, bytes)
select id, 1, 'Brand guidelines PDF', 'https://example.com/downloads/brand-guidelines.pdf', 'application/pdf', 7340032 from kit
on conflict (product_id, sort_index) do update set
  label = excluded.label,
  file_key = excluded.file_key,
  mime_type = excluded.mime_type,
  bytes = excluded.bytes;
