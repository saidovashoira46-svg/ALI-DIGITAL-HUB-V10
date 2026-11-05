-- Supabase SQL Editor oynasida bir marta ishga tushiring.
-- BU JADVALLAR PUBLIC YOZISHGA OCHIQ EMAS. Service role kaliti faqat Node serverga beriladi.
create table if not exists public.orders (
  id text primary key,
  name text not null,
  contact text not null,
  details text not null,
  service_id text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create table if not exists public.partners (
  id text primary key,
  name text not null,
  contact text not null,
  details text not null,
  specialization text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
alter table public.partners enable row level security;
-- Hech qanday anon policy yaratilmaydi. Public tashrifchilar bazaga bevosita kira olmaydi.
-- Node backend SUPABASE_SERVICE_ROLE_KEY orqali xavfsiz so'rov yuboradi.

-- Har qanday umumiy savol va xizmat bo‘yicha murojaat.
create table if not exists public.inquiries (
  id text primary key,
  name text not null,
  contact text not null,
  details text not null,
  topic text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.inquiries enable row level security;
