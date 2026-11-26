-- ============================================================================
-- LUVEN (luven.my.id) — SUPABASE COMPLETE DATABASE & STORAGE SCHEMA
-- Tempel seluruh isi berkas ini ke Supabase Dashboard -> SQL Editor -> Run.
-- Mencakup: Skema Private, Fungsi Validasi Domain/Username, Tabel, Index,
-- Trigger Keamanan, Row Level Security (RLS) di SEMUA tabel, RPC Analitik &
-- Laporan ber-Rate-Limit (tanpa data pribadi pengunjung), serta Storage Buckets.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 1. SKEMA PRIVATE UNTUK HELPER OTORISASI ADMIN (MENCEGAH REKURSI RLS)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- 2. FUNGSI VALIDASI USERNAME & URL (SERVER-SIDE ENFORCEMENT)
create or replace function public.is_valid_username(u text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  reserved text[] := array[
    'admin', 'administrator', 'root', 'moderator', 'mod', 'support', 'help',
    'studio', 'template', 'templates', 'explore', 'discover', 'search',
    'login', 'signin', 'signup', 'register', 'logout', 'auth', 'onboarding',
    'dashboard', 'settings', 'account', 'profile', 'profiles', 'user', 'users',
    'privacy', 'terms', 'tos', 'dmca', 'contact', 'about', 'faq', 'legal',
    'api', 'assets', 'ffmpeg', 'public', 'static', 'sitemap', 'sitemap.xml',
    'robots', 'robots.txt', 'favicon', 'favicon.svg', 'luven', 'luventemplate',
    'official', 'verified', 'tiktok', 'capcut', 'instagram', 'youtube', 'google',
    'null', 'undefined', 'system', 'me', 'new', 'edit'
  ];
begin
  if u is null then
    return false;
  end if;
  if char_length(u) < 3 or char_length(u) > 24 then
    return false;
  end if;
  if u !~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$' then
    return false;
  end if;
  if u ~ '\.\.' then
    return false;
  end if;
  if u = any(reserved) then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.is_safe_https_url(u text, max_len int default 500)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if u is null or char_length(u) = 0 or char_length(u) > max_len then
    return false;
  end if;
  -- Hanya izinkan https://, tolak javascript:, data:, vbscript:, spasi, atau karakter kontrol
  if u !~ '^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/[^\s<>"]*)?$' then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.is_allowed_tiktok_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.is_safe_https_url(u, 500)
     and u ~* '^https://((www|m|vm|vt)\.)?tiktok\.com/.+';
$$;

create or replace function public.is_allowed_capcut_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.is_safe_https_url(u, 500)
     and u ~* '^https://(([a-z0-9-]+\.)?capcut\.com|([a-z0-9-]+\.)?capcutshare\.com)/.+';
$$;

create or replace function public.is_allowed_instagram_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.is_safe_https_url(u, 500)
     and u ~* '^https://(www\.)?instagram\.com/.+';
$$;

create or replace function public.is_allowed_youtube_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.is_safe_https_url(u, 500)
     and u ~* '^https://((www|m)\.)?(youtube\.com|youtu\.be)/.+';
$$;

-- 3. TABEL UTAMA
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (public.is_valid_username(username)),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text check (avatar_url is null or public.is_safe_https_url(avatar_url, 1000)),
  banner_url text check (banner_url is null or public.is_safe_https_url(banner_url, 1000)),
  tiktok_url text check (tiktok_url is null or public.is_allowed_tiktok_url(tiktok_url)),
  instagram_url text check (instagram_url is null or public.is_allowed_instagram_url(instagram_url)),
  youtube_url text check (youtube_url is null or public.is_allowed_youtube_url(youtube_url)),
  website_url text check (website_url is null or public.is_safe_https_url(website_url, 500)),
  category text not null default 'Transisi' check (char_length(category) between 2 and 40),
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  is_banned boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 200),
  capcut_url text not null check (public.is_allowed_capcut_url(capcut_url)),
  tiktok_url text check (tiktok_url is null or public.is_allowed_tiktok_url(tiktok_url)),
  thumbnail_url text check (thumbnail_url is null or public.is_safe_https_url(thumbnail_url, 1000)),
  tags text[] not null default '{}' check (coalesce(array_length(tags, 1), 0) <= 5),
  song_title text check (song_title is null or char_length(song_title) <= 80),
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel events menyimpan hitungan agregat harian (TANPA IP / user-agent / data pribadi pengunjung)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view', 'template_view', 'capcut_click', 'tiktok_click', 'social_click')),
  event_day date not null default current_date,
  hit_count bigint not null default 1 check (hit_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists events_daily_unique_idx
  on public.events (owner_id, coalesce(template_id, '00000000-0000-0000-0000-000000000000'::uuid), event_type, event_day);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('profile', 'template')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 120),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Tabel internal rate-limit berbasis token anonim acak (bukan IP/data pribadi)
create table if not exists private.rate_buckets (
  bucket_key text not null,
  action_name text not null,
  window_start timestamptz not null default now(),
  hits int not null default 1,
  primary key (bucket_key, action_name)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(btrim(sender_name)) between 2 and 80),
  sender_email text not null check (char_length(btrim(sender_email)) between 5 and 160),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 10 and 1500),
  created_at timestamptz not null default now()
);

-- 4. INDEX PERFORMA
create index if not exists profiles_active_featured_idx
  on public.profiles (is_featured desc, created_at desc)
  where is_banned = false and onboarding_completed = true;

create index if not exists profiles_category_idx
  on public.profiles (category)
  where is_banned = false and onboarding_completed = true;

create index if not exists profiles_search_trgm_idx
  on public.profiles using gin ((username || ' ' || display_name) gin_trgm_ops);

create index if not exists templates_owner_sort_idx
  on public.templates (owner_id, sort_order asc, created_at desc);

create index if not exists templates_active_created_idx
  on public.templates (created_at desc)
  where status = 'active';

create index if not exists templates_tags_gin_idx
  on public.templates using gin (tags);

create index if not exists templates_title_trgm_idx
  on public.templates using gin (title gin_trgm_ops);

create index if not exists events_owner_day_idx
  on public.events (owner_id, event_day desc);

create index if not exists events_template_day_idx
  on public.events (template_id, event_day desc)
  where template_id is not null;

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

-- 5. TRIGGER KEAMANAN & INTEGRITAS KOLOM
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.touch_updated_at();

-- Cegah pengguna biasa memodifikasi kolom milik admin (is_verified, is_featured, is_banned)
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_admin() then
      new.is_verified := false;
      new.is_featured := false;
      new.is_banned := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if not private.is_admin() then
      new.is_verified := old.is_verified;
      new.is_featured := old.is_featured;
      new.is_banned := old.is_banned;
      if old.is_banned then
        raise exception 'Akun ini sedang ditangguhkan oleh moderator.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_columns on public.profiles;
create trigger trg_guard_profile_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- Rate limit pembuatan template & cegah pengguna biasa memulihkan template yang dihapus moderator ('removed')
create or replace function public.guard_template_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count int;
  owner_banned boolean;
begin
  select p.is_banned into owner_banned from public.profiles p where p.id = new.owner_id;
  if coalesce(owner_banned, false) and not private.is_admin() then
    raise exception 'Akun yang ditangguhkan tidak dapat mengelola template.';
  end if;

  if tg_op = 'INSERT' and not private.is_admin() then
    if new.status = 'removed' then
      new.status := 'active';
    end if;
    select count(*) into recent_count
    from public.templates t
    where t.owner_id = new.owner_id
      and t.created_at > now() - interval '1 hour';
    if recent_count >= 25 then
      raise exception 'Batas pembuatan template tercapai (maksimal 25 template per jam). Coba lagi nanti.';
    end if;
  elsif tg_op = 'UPDATE' and not private.is_admin() then
    if old.status = 'removed' then
      raise exception 'Template ini telah dihapus oleh moderator dan tidak dapat diubah.';
    end if;
    if new.status = 'removed' then
      new.status := 'hidden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_template_write on public.templates;
create trigger trg_guard_template_write
  before insert or update on public.templates
  for each row execute function public.guard_template_write();

-- 6. ROW LEVEL SECURITY (RLS) DI SEMUA TABEL PUBLIC
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;
alter table public.contact_messages enable row level security;

-- Kebijakan: admins
drop policy if exists "admins_select_own_or_admin" on public.admins;
create policy "admins_select_own_or_admin"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- Kebijakan: profiles
drop policy if exists "profiles_select_public_or_own_or_admin" on public.profiles;
create policy "profiles_select_public_or_own_or_admin"
  on public.profiles for select
  to anon, authenticated
  using (
    is_banned = false
    or id = (select auth.uid())
    or private.is_admin()
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());

drop policy if exists "profiles_delete_own_or_admin" on public.profiles;
create policy "profiles_delete_own_or_admin"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()) or private.is_admin());

-- Kebijakan: templates
drop policy if exists "templates_select_active_or_owner_or_admin" on public.templates;
create policy "templates_select_active_or_owner_or_admin"
  on public.templates for select
  to anon, authenticated
  using (
    (
      status = 'active'
      and exists (
        select 1 from public.profiles p
        where p.id = templates.owner_id and p.is_banned = false
      )
    )
    or owner_id = (select auth.uid())
    or private.is_admin()
  );

drop policy if exists "templates_insert_owner" on public.templates;
create policy "templates_insert_owner"
  on public.templates for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "templates_update_owner_or_admin" on public.templates;
create policy "templates_update_owner_or_admin"
  on public.templates for update
  to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin())
  with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists "templates_delete_owner_or_admin" on public.templates;
create policy "templates_delete_owner_or_admin"
  on public.templates for delete
  to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

-- Kebijakan: events (pembacaan oleh pemilik profil/admin, atau agregat mingguan publik; penulisan HANYA lewat RPC)
drop policy if exists "events_select_public_stats" on public.events;
create policy "events_select_public_stats"
  on public.events for select
  to anon, authenticated
  using (true);

-- Kebijakan: reports (hanya admin yang boleh membaca & memperbarui; pengiriman lewat RPC)
drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
  on public.reports for select
  to authenticated
  using (private.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Kebijakan: contact_messages (hanya admin yang boleh membaca; pengiriman lewat RPC)
drop policy if exists "contact_select_admin" on public.contact_messages;
create policy "contact_select_admin"
  on public.contact_messages for select
  to authenticated
  using (private.is_admin());

-- 7. FUNGSI RPC BER-VALIDASI & RATE-LIMIT (EVENTS, REPORTS, CONTACT, USERNAME CHECK)
create or replace function private.consume_rate_limit(
  p_bucket text,
  p_action text,
  p_max_hits int,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur record;
  safe_key text := left(coalesce(nullif(btrim(p_bucket), ''), 'anon'), 64);
begin
  select * into cur
  from private.rate_buckets
  where bucket_key = safe_key and action_name = p_action
  for update;

  if not found then
    insert into private.rate_buckets (bucket_key, action_name, window_start, hits)
    values (safe_key, p_action, now(), 1);
    return true;
  end if;

  if cur.window_start + p_window < now() then
    update private.rate_buckets
    set window_start = now(), hits = 1
    where bucket_key = safe_key and action_name = p_action;
    return true;
  end if;

  if cur.hits >= p_max_hits then
    return false;
  end if;

  update private.rate_buckets
  set hits = cur.hits + 1
  where bucket_key = safe_key and action_name = p_action;
  return true;
end;
$$;

revoke all on function private.consume_rate_limit(text, text, int, interval) from public;

-- Cek ketersediaan username secara instan (termasuk aturan reserved username)
create or replace function public.check_username_available(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u text := lower(btrim(coalesce(p_username, '')));
  taken boolean;
begin
  if not public.is_valid_username(u) then
    return jsonb_build_object('available', false, 'reason', 'invalid_or_reserved');
  end if;

  select exists (
    select 1 from public.profiles p
    where p.username = u
      and p.id is distinct from (select auth.uid())
  ) into taken;

  if taken then
    return jsonb_build_object('available', false, 'reason', 'taken');
  end if;

  return jsonb_build_object('available', true, 'reason', null);
end;
$$;

-- Catat event analitik agregat harian (tanpa menyimpan IP atau data pribadi pengunjung)
create or replace function public.record_event(
  p_owner_id uuid,
  p_event_type text,
  p_template_id uuid default null,
  p_client_bucket text default 'anon'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  zero_uuid constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  existing_id uuid;
begin
  if p_event_type not in ('profile_view', 'template_view', 'capcut_click', 'tiktok_click', 'social_click') then
    raise exception 'Tipe event tidak valid.';
  end if;

  -- Batasi 90 event per 10 menit per bucket klien agar tahan spam klik
  if not private.consume_rate_limit(p_client_bucket, 'event:' || p_event_type, 90, interval '10 minutes') then
    return;
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_owner_id and p.is_banned = false) then
    return;
  end if;

  if p_template_id is not null then
    if not exists (
      select 1 from public.templates t
      where t.id = p_template_id and t.owner_id = p_owner_id and t.status = 'active'
    ) then
      return;
    end if;
  end if;

  select e.id into existing_id
  from public.events e
  where e.owner_id = p_owner_id
    and coalesce(e.template_id, zero_uuid) = coalesce(p_template_id, zero_uuid)
    and e.event_type = p_event_type
    and e.event_day = current_date;

  if existing_id is not null then
    update public.events
    set hit_count = hit_count + 1, updated_at = now()
    where id = existing_id;
  else
    insert into public.events (owner_id, template_id, event_type, event_day, hit_count)
    values (p_owner_id, p_template_id, p_event_type, current_date, 1);
  end if;
end;
$$;

-- Kirim laporan penyalahgunaan dengan rate-limit
create or replace function public.submit_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default '',
  p_client_bucket text default 'anon'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  caller uuid := (select auth.uid());
  bucket text := coalesce(caller::text, p_client_bucket);
begin
  if p_target_type not in ('profile', 'template') then
    raise exception 'Target laporan tidak valid.';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Pilih atau isi alasan laporan yang jelas.';
  end if;

  if not private.consume_rate_limit(bucket, 'submit_report', 6, interval '15 minutes') then
    raise exception 'Terlalu banyak laporan dalam waktu singkat. Silakan coba beberapa saat lagi.';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (
    caller,
    p_target_type,
    p_target_id,
    left(btrim(p_reason), 120),
    left(btrim(coalesce(p_details, '')), 500)
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Kirim pesan kontak publik dengan rate-limit & honeypot
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
  p_body text,
  p_honeypot text default '',
  p_client_bucket text default 'anon'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_honeypot, '') <> '' then
    return;
  end if;

  if not private.consume_rate_limit(p_client_bucket, 'contact_form', 4, interval '15 minutes') then
    raise exception 'Terlalu banyak pesan dikirim dalam waktu singkat. Coba lagi nanti.';
  end if;

  insert into public.contact_messages (sender_name, sender_email, subject, body)
  values (
    left(btrim(p_name), 80),
    left(btrim(p_email), 160),
    left(btrim(p_subject), 120),
    left(btrim(p_body), 1500)
  );
end;
$$;

-- Hak akses eksplisit ke role Data API Supabase
grant select on public.profiles, public.templates, public.events to anon, authenticated;
grant insert, update, delete on public.profiles, public.templates to authenticated;
grant select on public.admins, public.reports, public.contact_messages to authenticated;
grant update on public.reports to authenticated;

grant execute on function public.check_username_available(text) to anon, authenticated;
grant execute on function public.record_event(uuid, text, uuid, text) to anon, authenticated;
grant execute on function public.submit_report(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text) to anon, authenticated;

-- 8. STORAGE BUCKETS & KEBIJAKAN RLS (avatars, banners, thumbnails — maks 2 MB, jpg/png/webp)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('thumbnails', 'thumbnails', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "luven_storage_public_read" on storage.objects;
create policy "luven_storage_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('avatars', 'banners', 'thumbnails'));

drop policy if exists "luven_storage_owner_insert" on storage.objects;
create policy "luven_storage_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'banners', 'thumbnails')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "luven_storage_owner_update" on storage.objects;
create policy "luven_storage_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'thumbnails')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'banners', 'thumbnails')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "luven_storage_owner_delete" on storage.objects;
create policy "luven_storage_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'thumbnails')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  );
