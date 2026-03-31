create table if not exists public.clothing_items (
    id bigint primary key,
    user_id bigint null,
    name text not null,
    category text not null,
    slot text not null,
    color text not null,
    brand text null,
    image_url text null,
    processed_image_url text null,
    image_backup_url text null,
    processed_image_backup_url text null,
    tags jsonb not null default '[]'::jsonb,
    occasions jsonb not null default '[]'::jsonb,
    style_notes text null,
    created_at timestamptz not null,
    synced_at timestamptz not null default timezone('utc', now())
);

create index if not exists clothing_items_category_idx on public.clothing_items (category);
create index if not exists clothing_items_created_at_idx on public.clothing_items (created_at desc);

alter table public.clothing_items disable row level security;
