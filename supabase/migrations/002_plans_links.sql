-- ============================================================================
-- LUVEN (luven.my.id) — MIGRASI 002: LINK-IN-BIO, PAKET FREE/PRO & LANGGANAN
-- Idempoten: aman dijalankan berulang kali di Supabase SQL Editor.
-- ============================================================================

-- 1. PERLUASAN TABEL PROFILES (plan, plan_expires_at, theme, settings, referred_by)
alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro')),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists theme jsonb not null default '{}'::jsonb,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists referred_by text check (referred_by is null or char_length(referred_by) between 3 and 24);

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by)
  where referred_by is not null;

-- Helper penentu paket efektif (otomatis kembali 'free' jika plan_expires_at sudah lewat)
create or replace function public.effective_plan(p_plan text, p_expires_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_plan = 'pro' and (p_expires_at is null or p_expires_at > now()) then 'pro'
    else 'free'
  end;
$$;

-- Perbarui trigger guard_profile_privileged_columns agar user biasa tidak bisa mengubah plan/plan_expires_at
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eff_plan text;
  preset_id text;
begin
  if tg_op = 'INSERT' then
    if not private.is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      new.is_verified := false;
      new.is_featured := false;
      new.is_banned := false;
      new.plan := 'free';
      new.plan_expires_at := null;
    end if;
    if new.referred_by is not null then
      new.referred_by := lower(btrim(new.referred_by));
      if new.referred_by = new.username then
        new.referred_by := null;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if not private.is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      new.is_verified := old.is_verified;
      new.is_featured := old.is_featured;
      new.is_banned := old.is_banned;
      new.plan := old.plan;
      new.plan_expires_at := old.plan_expires_at;
      new.referred_by := old.referred_by;
      if old.is_banned then
        raise exception 'Akun ini sedang ditangguhkan oleh moderator.';
      end if;
    end if;
  end if;

  eff_plan := public.effective_plan(new.plan, new.plan_expires_at);
  if eff_plan = 'free' then
    preset_id := coalesce(new.theme ->> 'presetId', 'free-obsidian');
    if preset_id not in ('free-obsidian', 'free-paper', 'free-slate') then
      preset_id := 'free-obsidian';
    end if;
    new.theme := jsonb_build_object('presetId', preset_id);
    if coalesce((new.settings ->> 'hideLuvenBranding')::boolean, false) then
      new.settings := jsonb_set(coalesce(new.settings, '{}'::jsonb), '{hideLuvenBranding}', 'false'::jsonb, true);
    end if;
  end if;

  return new;
end;
$$;

-- 2. TABEL BARU: LINKS (Link-in-Bio Items, Headings, Announcements, Embeds)
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'link' check (
    type in (
      'link', 'capcut', 'tiktok', 'youtube', 'instagram', 'whatsapp',
      'website', 'heading', 'announcement', 'embed_tiktok', 'embed_youtube'
    )
  ),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text check (url is null or public.is_safe_https_url(url, 600)),
  thumbnail_url text check (thumbnail_url is null or public.is_safe_https_url(thumbnail_url, 1000)),
  position integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  group_id text check (group_id is null or char_length(group_id) <= 60),
  schedule_start timestamptz,
  schedule_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists links_owner_position_idx
  on public.links (owner_id, position asc, created_at asc);

drop trigger if exists trg_links_updated_at on public.links;
create trigger trg_links_updated_at
  before update on public.links
  for each row execute function public.touch_updated_at();

-- Penegakan batas paket FREE (maks 8 link non-heading aktif) & rate-limit di database
create or replace function public.guard_link_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_plan text;
  owner_exp timestamptz;
  owner_banned boolean;
  eff_plan text;
  active_link_count int;
  recent_count int;
begin
  select p.plan, p.plan_expires_at, p.is_banned
    into owner_plan, owner_exp, owner_banned
  from public.profiles p
  where p.id = new.owner_id;

  if not found then
    raise exception 'Profil pemilik tidak ditemukan.';
  end if;

  if coalesce(owner_banned, false) and not private.is_admin() then
    raise exception 'Akun yang ditangguhkan tidak dapat mengelola link.';
  end if;

  if new.type <> 'heading' and new.type <> 'announcement' and (new.url is null or btrim(new.url) = '') then
    raise exception 'Tautan HTTPS wajib diisi untuk tipe link ini.';
  end if;

  eff_plan := public.effective_plan(owner_plan, owner_exp);

  if tg_op = 'INSERT' and not private.is_admin() then
    select count(*) into recent_count
    from public.links l
    where l.owner_id = new.owner_id
      and l.created_at > now() - interval '1 hour';
    if recent_count >= 60 then
      raise exception 'Batas penambahan link per jam tercapai (maks. 60). Coba lagi nanti.';
    end if;
  end if;

  if eff_plan = 'free' and not private.is_admin() then
    if new.type in ('embed_tiktok', 'embed_youtube', 'announcement') then
      raise exception 'Tipe blok ini hanya tersedia pada paket Pro.';
    end if;
    new.is_featured := false;
    new.schedule_start := null;
    new.schedule_end := null;
    new.group_id := null;
    if new.type <> 'capcut' then
      new.thumbnail_url := null;
    end if;

    if new.type <> 'heading' and new.is_active then
      select count(*) into active_link_count
      from public.links l
      where l.owner_id = new.owner_id
        and l.type <> 'heading'
        and l.is_active = true
        and l.id is distinct from new.id;

      if active_link_count >= 8 then
        raise exception 'Paket Free dibatasi maksimal 8 link aktif (tidak termasuk judul bagian). Upgrade ke Pro untuk link tanpa batas.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_link_write on public.links;
create trigger trg_guard_link_write
  before insert or update on public.links
  for each row execute function public.guard_link_write();

alter table public.links enable row level security;

drop policy if exists "links_select_public_or_owner_or_admin" on public.links;
create policy "links_select_public_or_owner_or_admin"
  on public.links for select
  to anon, authenticated
  using (
    (
      is_active = true
      and (schedule_start is null or schedule_start <= now())
      and (schedule_end is null or schedule_end >= now())
      and exists (
        select 1 from public.profiles p
        where p.id = links.owner_id and p.is_banned = false
      )
    )
    or owner_id = (select auth.uid())
    or private.is_admin()
  );

drop policy if exists "links_insert_owner" on public.links;
create policy "links_insert_owner"
  on public.links for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "links_update_owner_or_admin" on public.links;
create policy "links_update_owner_or_admin"
  on public.links for update
  to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin())
  with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists "links_delete_owner_or_admin" on public.links;
create policy "links_delete_owner_or_admin"
  on public.links for delete
  to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

grant select on public.links to anon, authenticated;
grant insert, update, delete on public.links to authenticated;

-- 3. TABEL SUBSCRIPTIONS (Riwayat Pembayaran & Status Pro)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro')),
  status text not null default 'pending' check (status in ('active', 'pending', 'expired', 'cancelled', 'revoked')),
  amount integer not null default 0 check (amount >= 0),
  provider text not null default 'manual_admin',
  provider_ref text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_created_idx
  on public.subscriptions (user_id, created_at desc);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

grant select on public.subscriptions to authenticated;

-- RPC Admin untuk mengaktifkan/mencabut paket Pro secara manual (Mode A)
create or replace function public.admin_set_user_plan(
  p_user_id uuid,
  p_plan text,
  p_expires_at timestamptz default null,
  p_amount integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Hanya administrator yang diizinkan mengubah paket akun.';
  end if;
  if p_plan not in ('free', 'pro') then
    raise exception 'Paket tidak valid.';
  end if;

  update public.profiles
  set plan = p_plan,
      plan_expires_at = case when p_plan = 'pro' then p_expires_at else null end
  where id = p_user_id;

  insert into public.subscriptions (user_id, plan, status, amount, provider, expires_at)
  values (
    p_user_id,
    p_plan,
    case when p_plan = 'pro' then 'active' else 'revoked' end,
    greatest(0, coalesce(p_amount, 0)),
    'manual_admin',
    case when p_plan = 'pro' then p_expires_at else now() end
  );
end;
$$;

grant execute on function public.admin_set_user_plan(uuid, text, timestamptz, integer) to authenticated;

-- 4. PERLUASAN TABEL EVENTS UNTUK ANALITIK PRO (Tetap Agregat Anonim, Tanpa PII)
alter table public.events
  add column if not exists link_id uuid references public.links(id) on delete cascade,
  add column if not exists referrer_host text not null default '',
  add column if not exists device_type text not null default 'mobile' check (device_type in ('mobile', 'desktop')),
  add column if not exists event_hour smallint not null default 0 check (event_hour between 0 and 23);

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events
  add constraint events_event_type_check
  check (event_type in ('profile_view', 'template_view', 'capcut_click', 'tiktok_click', 'social_click', 'link_click'));

drop index if exists public.events_daily_unique_idx;
create unique index if not exists events_daily_unique_idx
  on public.events (
    owner_id,
    coalesce(template_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid),
    event_type,
    event_day,
    referrer_host,
    device_type,
    event_hour
  );

create or replace function public.record_event(
  p_owner_id uuid,
  p_event_type text,
  p_template_id uuid default null,
  p_client_bucket text default 'anon',
  p_link_id uuid default null,
  p_referrer_host text default '',
  p_device_type text default 'mobile',
  p_event_hour int default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  zero_uuid constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  safe_ref text := left(regexp_replace(lower(coalesce(p_referrer_host, '')), '[^a-z0-9.-]', '', 'g'), 64);
  safe_dev text := case when p_device_type = 'desktop' then 'desktop' else 'mobile' end;
  safe_hr smallint := greatest(0, least(23, coalesce(p_event_hour, 0)))::smallint;
  existing_id uuid;
begin
  if p_event_type not in ('profile_view', 'template_view', 'capcut_click', 'tiktok_click', 'social_click', 'link_click') then
    raise exception 'Tipe event tidak valid.';
  end if;

  if not private.consume_rate_limit(p_client_bucket, 'event:' || p_event_type, 90, interval '10 minutes') then
    return;
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_owner_id and p.is_banned = false) then
    return;
  end if;

  select e.id into existing_id
  from public.events e
  where e.owner_id = p_owner_id
    and coalesce(e.template_id, zero_uuid) = coalesce(p_template_id, zero_uuid)
    and coalesce(e.link_id, zero_uuid) = coalesce(p_link_id, zero_uuid)
    and e.event_type = p_event_type
    and e.event_day = current_date
    and e.referrer_host = safe_ref
    and e.device_type = safe_dev
    and e.event_hour = safe_hr;

  if existing_id is not null then
    update public.events
    set hit_count = hit_count + 1, updated_at = now()
    where id = existing_id;
  else
    insert into public.events (
      owner_id, template_id, link_id, event_type, event_day, referrer_host, device_type, event_hour, hit_count
    )
    values (
      p_owner_id, p_template_id, p_link_id, p_event_type, current_date, safe_ref, safe_dev, safe_hr, 1
    );
  end if;
end;
$$;

grant execute on function public.record_event(uuid, text, uuid, text, uuid, text, text, int) to anon, authenticated;
