insert into users (email, password_hash, role)
values ('admin@example.com', '$2b$12$g0kzG1q4v4cYFq9b8p2VgO3g8J0KpGvZq5Xz8l1Yv2o1o1s3u8t4C', 'admin')
on conflict (email) do nothing;

insert into products (kind, slug, title, description, price_cents, published) values
('service','custom-website','Custom Website Build','Bespoke, performance-tuned site.',250000,true),
('course','chatgpt-web-course','Build a site with ChatGPT','Ship faster with AI.',9900,true),
('product','brand-kit','Brand Kit','Logos/palettes/templates.',5900,true)
on conflict (slug) do nothing;
