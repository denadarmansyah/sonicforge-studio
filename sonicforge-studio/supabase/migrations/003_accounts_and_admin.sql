-- ============================================================================
-- LUVEN (luven.my.id) — MIGRASI 003: SATU AKUN SATU USERNAME, GERBANG ADMIN & PANEL ADMIN LENGKAP
-- Idempoten & aman untuk data produksi yang sudah ada (termasuk akun Google lama).
-- Jalankan di Supabase Dashboard -> SQL Editor setelah schema.sql dan 002_plans_links.sql.
-- ============================================================================

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. DETEKSI AMAN USERNAME DUPLIKAT (CASE-INSENSITIVE) & NORMALISASI DATA LAMA
-- ============================================================================
do $$
declare
  dup_report text;
begin
  select string_agg(
    format('@%s (jumlah=%s, ids=%s)', d.uname, d.cnt, d.ids),
    '; '
  )
  into dup_report
  from (
    select
      lower(btrim(p.username)) as uname,
      count(*) as cnt,
      string_agg(p.id::text, ',' order by p.created_at asc) as ids
    from public.profiles p
    group by lower(btrim(p.username))
    having count(*) > 1
  ) d;

  if dup_report is not null then
    raise exception
      'MIGRASI DIHENTIKAN DEMI KEAMANAN DATA: ditemukan username duplikat secara case-insensitive di public.profiles -> %. '
      'Cara menyelesaikan tanpa kehilangan data: buka SQL Editor, ubah salah satu username duplikat dengan '
      'UPDATE public.profiles SET username = ''<username_unik_baru>'' WHERE id = ''<uuid_akun_kedua>''; lalu jalankan ulang migrasi 003 ini.',
      dup_report;
  end if;
end;
$$;

-- Pastikan semua profil lama yang sudah punya username ditandai onboarding_completed = true
-- sehingga akun lama tidak pernah diminta onboarding ulang.
do $$
begin
  perform set_config('luven.admin_override', 'on', true);
  update public.profiles
  set username = lower(btrim(username)),
      onboarding_completed = true
  where username is not null
    and char_length(btrim(username)) >= 3
    and (username <> lower(btrim(username)) or onboarding_completed = false);
end;
$$;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

-- Kolom tambahan pada public.profiles untuk alasan ban & pengurutan Kreator Pilihan
alter table public.profiles
  add column if not exists ban_reason text not null default '',
  add column if not exists featured_order integer not null default 0;

create index if not exists profiles_featured_order_idx
  on public.profiles (is_featured desc, featured_order asc, created_at desc)
  where is_banned = false and onboarding_completed = true;

-- Perluas status & catatan admin pada public.reports
alter table public.reports
  add column if not exists admin_note text not null default '',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null;

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
  check (status in ('open', 'reviewed', 'resolved', 'dismissed'));

-- ============================================================================
-- 2. TABEL KATA CADANGAN USERNAME (public.reserved_usernames)
-- ============================================================================
create table if not exists public.reserved_usernames (
  word text primary key check (word = lower(btrim(word)) and char_length(word) between 1 and 40),
  reason text not null default 'Sistem / rute aplikasi',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.reserved_usernames (word, reason)
values
  ('admin', 'Rute & peran sistem'),
  ('administrator', 'Peran sistem'),
  ('root', 'Peran sistem'),
  ('moderator', 'Peran sistem'),
  ('mod', 'Peran sistem'),
  ('support', 'Dukungan resmi'),
  ('help', 'Dukungan resmi'),
  ('studio', 'Rute editor audio'),
  ('soundlab', 'Fitur situs'),
  ('template', 'Rute situs'),
  ('templates', 'Rute situs'),
  ('explore', 'Rute jelajah'),
  ('discover', 'Rute jelajah'),
  ('search', 'Rute pencarian'),
  ('pricing', 'Rute harga'),
  ('pro', 'Nama paket'),
  ('free', 'Nama paket'),
  ('login', 'Rute autentikasi'),
  ('signin', 'Rute autentikasi'),
  ('signup', 'Rute autentikasi'),
  ('register', 'Rute autentikasi'),
  ('logout', 'Rute autentikasi'),
  ('auth', 'Rute autentikasi'),
  ('forgot-password', 'Rute autentikasi'),
  ('onboarding', 'Rute klaim username'),
  ('dashboard', 'Rute dasbor kreator'),
  ('settings', 'Rute pengaturan akun'),
  ('account', 'Rute akun'),
  ('profile', 'Rute profil'),
  ('profiles', 'Rute profil'),
  ('user', 'Rute sistem'),
  ('users', 'Rute sistem'),
  ('privacy', 'Halaman legal'),
  ('terms', 'Halaman legal'),
  ('tos', 'Halaman legal'),
  ('dmca', 'Halaman legal'),
  ('contact', 'Halaman kontak'),
  ('about', 'Halaman informasi'),
  ('faq', 'Halaman informasi'),
  ('legal', 'Halaman legal'),
  ('api', 'Endpoint server'),
  ('assets', 'Aset statis'),
  ('images', 'Aset gambar'),
  ('brand', 'Aset merek'),
  ('ffmpeg', 'Aset wasm'),
  ('public', 'Aset publik'),
  ('static', 'Aset statis'),
  ('sitemap', 'Peta situs'),
  ('sitemap.xml', 'Peta situs'),
  ('robots', 'Berkas crawler'),
  ('robots.txt', 'Berkas crawler'),
  ('favicon', 'Ikon situs'),
  ('favicon.svg', 'Ikon situs'),
  ('luven', 'Merek resmi Luven'),
  ('luventemplate', 'Merek resmi Luven'),
  ('luvenindonesia', 'Akun resmi Luven'),
  ('luvenofficial', 'Merek resmi Luven'),
  ('official', 'Merek terproteksi'),
  ('verified', 'Status verifikasi'),
  ('tiktok', 'Merek pihak ketiga'),
  ('capcut', 'Merek pihak ketiga'),
  ('instagram', 'Merek pihak ketiga'),
  ('youtube', 'Merek pihak ketiga'),
  ('whatsapp', 'Merek pihak ketiga'),
  ('google', 'Merek pihak ketiga'),
  ('null', 'Kata kunci teknis'),
  ('undefined', 'Kata kunci teknis'),
  ('system', 'Peran sistem'),
  ('me', 'Alias pengguna'),
  ('new', 'Rute aksi'),
  ('edit', 'Rute aksi')
on conflict (word) do nothing;

-- ============================================================================
-- 3. TABEL ADMIN, ADMIN_SECRETS (MIGRASI AMAN), AUDIT LOG & PENGATURAN SITUS
-- ============================================================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  is_primary boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admins
  add column if not exists note text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists added_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- Tambahkan admin utama secara idempoten bila akunnya sudah terdaftar di auth.users
insert into public.admins (user_id, note, is_primary)
select u.id, 'Admin Utama Luven', true
from auth.users u
where lower(u.email) = 'denadarmansyahgm@gmail.com'
on conflict (user_id) do update
  set is_primary = true,
      note = coalesce(public.admins.note, excluded.note);

-- Buat atau perbarui public.admin_secrets tanpa merusak tabel yang mungkin sudah ada
create table if not exists public.admin_secrets (
  user_id uuid primary key references public.admins(user_id) on delete cascade,
  passphrase_hash text not null,
  must_change boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  unlocked_until timestamptz,
  updated_at timestamptz not null default now()
);

do $$
declare
  col_rec record;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_secrets' and column_name = 'user_id'
  ) then
    alter table public.admin_secrets
      add column user_id uuid references auth.users(id) on delete cascade;
  end if;

  alter table public.admin_secrets
    add column if not exists passphrase_hash text,
    add column if not exists must_change boolean not null default true,
    add column if not exists failed_attempts integer not null default 0,
    add column if not exists locked_until timestamptz,
    add column if not exists unlocked_until timestamptz,
    add column if not exists updated_at timestamptz not null default now();

  -- Jika tabel lama memiliki kolom hash dengan nama lain (mis. secret_hash / password_hash),
  -- salin nilainya ke passphrase_hash dan longgarkan NOT NULL pada kolom lama agar upsert aman.
  for col_rec in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_secrets'
      and column_name in ('secret_hash', 'password_hash', 'hash')
  loop
    execute format(
      'update public.admin_secrets set passphrase_hash = coalesce(passphrase_hash, %I) where passphrase_hash is null',
      col_rec.column_name
    );
    execute format(
      'alter table public.admin_secrets alter column %I drop not null',
      col_rec.column_name
    );
  end loop;
end;
$$;

create unique index if not exists admin_secrets_user_id_uidx
  on public.admin_secrets (user_id);

alter table public.admin_secrets enable row level security;
-- Sengaja TIDAK ada policy SELECT/INSERT/UPDATE/DELETE untuk anon/authenticated pada admin_secrets.
revoke all on public.admin_secrets from public, anon, authenticated;

-- Tabel Log Audit Admin (append-only, tidak bisa diubah atau dihapus)
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action, created_at desc);

create or replace function private.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Log aktivitas admin bersifat permanen dan tidak dapat diubah atau dihapus.';
end;
$$;

drop trigger if exists trg_audit_log_immutable on public.admin_audit_log;
create trigger trg_audit_log_immutable
  before update or delete on public.admin_audit_log
  for each row execute function private.prevent_audit_log_mutation();

alter table public.admin_audit_log enable row level security;
revoke insert, update, delete on public.admin_audit_log from public, anon, authenticated;

-- Tabel Pengaturan Situs Global (pengumuman opsional & mode pemeliharaan)
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  announcement_text text not null default '',
  announcement_active boolean not null default false,
  maintenance_mode boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, announcement_text, announcement_active, maintenance_mode)
values (1, '', false, false)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;
revoke insert, update, delete on public.site_settings from public, anon, authenticated;
grant select on public.site_settings to anon, authenticated;

drop policy if exists "site_settings_select_all" on public.site_settings;
create policy "site_settings_select_all"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- 4. FUNGSI INTI GERBANG ADMIN (is_admin, is_admin_unlocked, unlock, lock, passphrase)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_admin();
$$;

-- Sesi gerbang terbuka (dipakai oleh admin_change_passphrase saat must_change = true)
create or replace function private.is_admin_session_open()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join public.admin_secrets s on s.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and s.unlocked_until is not null
      and s.unlocked_until > now()
      and (s.locked_until is null or s.locked_until <= now())
  );
$$;

-- Penentu tunggal untuk SEMUA aksi & RLS admin: wajib admin + sesi terbuka + must_change = false
create or replace function public.is_admin_unlocked()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join public.admin_secrets s on s.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and s.unlocked_until is not null
      and s.unlocked_until > now()
      and (s.locked_until is null or s.locked_until <= now())
      and coalesce(s.must_change, false) = false
  );
$$;

-- Helper internal pencatat log audit
create or replace function private.write_admin_audit(
  p_action text,
  p_target_type text default '',
  p_target_id text default '',
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := '';
begin
  if v_uid is not null then
    select coalesce(u.email, '') into v_email
    from auth.users u
    where u.id = v_uid;
  end if;

  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (
    v_uid,
    v_email,
    left(btrim(coalesce(p_action, 'unknown')), 80),
    left(btrim(coalesce(p_target_type, '')), 60),
    left(btrim(coalesce(p_target_id, '')), 120),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

-- Sesuaikan signature admin_unlock & admin_lock bila fungsi lama memiliki tipe kembalian berbeda
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, pg_get_function_result(p.oid) as rettype, p.proargnames
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_unlock'
  loop
    if r.rettype <> 'jsonb' or r.proargnames is distinct from array['p_passphrase'] then
      execute format('drop function %s', r.sig);
    end if;
  end loop;

  for r in
    select p.oid::regprocedure as sig, pg_get_function_result(p.oid) as rettype
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_lock'
  loop
    if r.rettype <> 'void' then
      execute format('drop function %s', r.sig);
    end if;
  end loop;
end;
$$;

create or replace function public.admin_gate_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_is_admin boolean := false;
  v_is_primary boolean := false;
  v_secret public.admin_secrets%rowtype;
  v_session_open boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object(
      'is_admin', false,
      'unlocked', false,
      'session_open', false,
      'must_change', false,
      'unlocked_until', null,
      'is_primary', false
    );
  end if;

  select true, a.is_primary
    into v_is_admin, v_is_primary
  from public.admins a
  where a.user_id = v_uid;

  if not coalesce(v_is_admin, false) then
    return jsonb_build_object(
      'is_admin', false,
      'unlocked', false,
      'session_open', false,
      'must_change', false,
      'unlocked_until', null,
      'is_primary', false
    );
  end if;

  select * into v_secret
  from public.admin_secrets s
  where s.user_id = v_uid;

  if found
     and v_secret.unlocked_until is not null
     and v_secret.unlocked_until > now()
     and (v_secret.locked_until is null or v_secret.locked_until <= now())
  then
    v_session_open := true;
  end if;

  return jsonb_build_object(
    'is_admin', true,
    'unlocked', v_session_open and not coalesce(v_secret.must_change, false),
    'session_open', v_session_open,
    'must_change', v_session_open and coalesce(v_secret.must_change, false),
    'unlocked_until', case when v_session_open then v_secret.unlocked_until else null end,
    'is_primary', coalesce(v_is_primary, false)
  );
end;
$$;

-- Mengembalikan jsonb (tanpa RAISE EXCEPTION pada salah password) agar kenaikan failed_attempts
-- dan penguncian 15 menit setelah 5x gagal TERSIMPAN permanen di database.
create or replace function public.admin_unlock(p_passphrase text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_secret public.admin_secrets%rowtype;
  v_attempts integer;
  v_until timestamptz;
  v_neutral constant text := 'Verifikasi admin tidak berhasil atau akses sedang dikunci sementara.';
begin
  if v_uid is null or not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', v_neutral);
  end if;

  select * into v_secret
  from public.admin_secrets s
  where s.user_id = v_uid
  for update;

  if not found or v_secret.passphrase_hash is null or btrim(v_secret.passphrase_hash) = '' then
    return jsonb_build_object('ok', false, 'error', v_neutral);
  end if;

  if v_secret.locked_until is not null and v_secret.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', v_neutral);
  end if;

  if v_secret.passphrase_hash = extensions.crypt(coalesce(p_passphrase, ''), v_secret.passphrase_hash) then
    v_until := now() + interval '30 minutes';

    update public.admin_secrets
    set failed_attempts = 0,
        locked_until = null,
        unlocked_until = v_until,
        updated_at = now()
    where user_id = v_uid;

    perform private.write_admin_audit(
      'admin_unlock',
      'admin_gate',
      v_uid::text,
      jsonb_build_object('must_change', coalesce(v_secret.must_change, false))
    );

    return jsonb_build_object(
      'ok', true,
      'must_change', coalesce(v_secret.must_change, false),
      'unlocked_until', v_until
    );
  else
    v_attempts := coalesce(v_secret.failed_attempts, 0) + 1;

    if v_attempts >= 5 then
      update public.admin_secrets
      set failed_attempts = v_attempts,
          locked_until = now() + interval '15 minutes',
          unlocked_until = null,
          updated_at = now()
      where user_id = v_uid;

      perform private.write_admin_audit(
        'admin_lockout',
        'admin_gate',
        v_uid::text,
        jsonb_build_object('failed_attempts', v_attempts, 'lock_minutes', 15)
      );
    else
      update public.admin_secrets
      set failed_attempts = v_attempts,
          unlocked_until = null,
          updated_at = now()
      where user_id = v_uid;

      perform private.write_admin_audit(
        'admin_unlock_failed',
        'admin_gate',
        v_uid::text,
        jsonb_build_object('failed_attempts', v_attempts)
      );
    end if;

    return jsonb_build_object('ok', false, 'error', v_neutral);
  end if;
end;
$$;

create or replace function public.admin_lock()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_admin() then
    return;
  end if;

  update public.admin_secrets
  set unlocked_until = null,
      updated_at = now()
  where user_id = v_uid;

  perform private.write_admin_audit('admin_lock', 'admin_gate', v_uid::text, '{}'::jsonb);
end;
$$;

-- KHUSUS SQL EDITOR SUPABASE (dicabut dari anon & authenticated):
-- Memasang password sementara admin (bcrypt) dengan must_change = true.
create or replace function public.admin_set_passphrase(
  p_email text,
  p_temp_passphrase text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_clean_email = '' then
    raise exception 'Alamat email admin wajib diisi.';
  end if;

  if char_length(coalesce(p_temp_passphrase, '')) < 12 then
    raise exception 'Password sementara admin minimal 12 karakter.';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_clean_email
  limit 1;

  if v_user_id is null then
    raise exception
      'Akun dengan email % belum ditemukan di auth.users. Silakan login (Google atau Email) sekali terlebih dahulu di situs, lalu jalankan ulang perintah ini.',
      v_clean_email;
  end if;

  insert into public.admins (user_id, note, is_primary)
  values (
    v_user_id,
    case when v_clean_email = 'denadarmansyahgm@gmail.com' then 'Admin Utama Luven' else 'Administrator' end,
    (v_clean_email = 'denadarmansyahgm@gmail.com')
  )
  on conflict (user_id) do update
    set is_primary = (public.admins.is_primary or excluded.is_primary);

  insert into public.admin_secrets (
    user_id,
    passphrase_hash,
    must_change,
    failed_attempts,
    locked_until,
    unlocked_until,
    updated_at
  )
  values (
    v_user_id,
    extensions.crypt(p_temp_passphrase, extensions.gen_salt('bf', 10)),
    true,
    0,
    null,
    null,
    now()
  )
  on conflict (user_id) do update
    set passphrase_hash = excluded.passphrase_hash,
        must_change = true,
        failed_attempts = 0,
        locked_until = null,
        unlocked_until = null,
        updated_at = now();

  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (
    v_user_id,
    v_clean_email,
    'admin_set_temp_passphrase',
    'admin_secrets',
    v_user_id::text,
    jsonb_build_object('must_change', true, 'source', 'sql_editor')
  );
end;
$$;

revoke all on function public.admin_set_passphrase(text, text) from public, anon, authenticated;

-- Mengganti password admin dari dalam panel (memerlukan sesi gerbang terbuka, minimal 12 karakter)
create or replace function public.admin_change_passphrase(p_new text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_old_hash text;
begin
  if v_uid is null or not private.is_admin_session_open() then
    raise exception 'Sesi verifikasi admin belum dibuka atau sudah kedaluwarsa.';
  end if;

  if char_length(coalesce(p_new, '')) < 12 then
    raise exception 'Password khusus admin minimal harus 12 karakter.';
  end if;

  select s.passphrase_hash into v_old_hash
  from public.admin_secrets s
  where s.user_id = v_uid;

  if v_old_hash is not null and v_old_hash = extensions.crypt(p_new, v_old_hash) then
    raise exception 'Password admin baru harus berbeda dari password sebelumnya.';
  end if;

  update public.admin_secrets
  set passphrase_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)),
      must_change = false,
      failed_attempts = 0,
      locked_until = null,
      unlocked_until = now() + interval '30 minutes',
      updated_at = now()
  where user_id = v_uid;

  perform private.write_admin_audit(
    'admin_change_passphrase',
    'admin_secrets',
    v_uid::text,
    jsonb_build_object('must_change_cleared', true)
  );
end;
$$;

-- ============================================================================
-- 5. VALIDASI USERNAME, KLAIM ATOMIK (claim_username) & IMUTABILITAS USERNAME
-- ============================================================================

create or replace function public.is_valid_username_syntax(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    u is not null
    and char_length(u) between 3 and 24
    and u = lower(u)
    and u ~ '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$'
    and position('..' in u) = 0
    and u !~ '^(?:tiktok(?:official|id|shop)?|capcut(?:official|id|creator)?|luven(?:official|admin|staff|team)|instagram(?:official)?|youtube(?:official)?|bank(?:bca|bri|mandiri|bni))$';
$$;

create or replace function public.is_valid_username(u text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    public.is_valid_username_syntax(u)
    and not exists (
      select 1 from public.reserved_usernames r where r.word = lower(u)
    );
$$;

create or replace function public.check_username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select
    public.is_valid_username(lower(btrim(coalesce(p_username, ''))))
    and not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(btrim(coalesce(p_username, '')))
    );
$$;

-- Pemeriksaan status detail untuk indikator real-time (tersedia, sudah dipakai, format salah, dicadangkan)
create or replace function public.check_username_status(p_username text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_norm text := regexp_replace(lower(btrim(coalesce(p_username, ''))), '^@+', '');
begin
  if v_norm = '' or not public.is_valid_username_syntax(v_norm) then
    return jsonb_build_object(
      'available', false,
      'status', 'invalid',
      'normalized', v_norm,
      'message', 'Format salah: gunakan 3–24 karakter huruf kecil a–z, angka 0–9, titik, atau garis bawah.'
    );
  end if;

  if exists (select 1 from public.reserved_usernames r where r.word = v_norm) then
    return jsonb_build_object(
      'available', false,
      'status', 'reserved',
      'normalized', v_norm,
      'message', format('Username @%s dicadangkan oleh sistem.', v_norm)
    );
  end if;

  if exists (select 1 from public.profiles p where lower(p.username) = v_norm) then
    return jsonb_build_object(
      'available', false,
      'status', 'taken',
      'normalized', v_norm,
      'message', 'Username sudah dipakai.'
    );
  end if;

  return jsonb_build_object(
    'available', true,
    'status', 'available',
    'normalized', v_norm,
    'message', format('luven.my.id/@%s tersedia.', v_norm)
  );
end;
$$;

-- Trigger penjaga ketatnya imutabilitas username & kolom berhak istimewa pada public.profiles
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_privileged boolean := (
    coalesce(current_setting('luven.admin_override', true), '') = 'on'
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );
  is_claim_call boolean := (coalesce(current_setting('luven.claim_rpc', true), '') = 'on');
  eff_plan text;
  preset_id text;
begin
  if tg_op = 'DELETE' then
    if not is_privileged then
      raise exception 'Username dan profil tidak dapat dihapus langsung. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.';
    end if;
    return old;
  end if;

  new.username := lower(btrim(coalesce(new.username, '')));

  if tg_op = 'INSERT' then
    if not is_privileged and not is_claim_call then
      raise exception 'Klaim username wajib melalui fungsi resmi claim_username.';
    end if;
    if not is_privileged then
      new.is_verified := false;
      new.is_featured := false;
      new.featured_order := 0;
      new.is_banned := false;
      new.ban_reason := '';
      new.plan := 'free';
      new.plan_expires_at := null;
    end if;
    if new.referred_by is not null then
      new.referred_by := lower(btrim(new.referred_by));
      if new.referred_by = new.username or char_length(new.referred_by) < 3 then
        new.referred_by := null;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if not is_privileged then
      if new.username is distinct from old.username then
        raise exception 'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.';
      end if;

      if new.plan is distinct from old.plan
         or new.plan_expires_at is distinct from old.plan_expires_at
         or new.is_verified is distinct from old.is_verified
         or new.is_banned is distinct from old.is_banned
         or new.ban_reason is distinct from old.ban_reason
         or new.is_featured is distinct from old.is_featured
         or new.featured_order is distinct from old.featured_order
         or new.referred_by is distinct from old.referred_by
      then
        raise exception 'Kolom status akun tidak dapat diubah dari klien.';
      end if;

      if old.is_banned then
        raise exception 'Akun ini sedang ditangguhkan oleh moderator.';
      end if;

      -- Sekali onboarding selesai & punya username, tidak pernah bisa kembali false
      new.onboarding_completed := true;
    end if;
  end if;

  eff_plan := public.effective_plan(new.plan, new.plan_expires_at);
  if eff_plan = 'free' and not is_privileged and (
    tg_op = 'INSERT' or new.theme is distinct from old.theme or new.settings is distinct from old.settings
  ) then
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

drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
  before insert or update or delete on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- Fungsi RPC Atomik: Satu Akun = Satu Klaim Username (aman terhadap race condition)
create or replace function public.claim_username(
  p_username text,
  p_display_name text,
  p_bio text default '',
  p_category text default 'Transisi',
  p_tiktok_url text default null,
  p_referred_by text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_norm text := regexp_replace(lower(btrim(coalesce(p_username, ''))), '^@+', '');
  v_disp text := left(btrim(coalesce(p_display_name, '')), 50);
  v_bio text := left(btrim(coalesce(p_bio, '')), 160);
  v_cat text := left(btrim(coalesce(p_category, 'Transisi')), 32);
  v_tt text := nullif(btrim(coalesce(p_tiktok_url, '')), '');
  v_ref text := nullif(regexp_replace(lower(btrim(coalesce(p_referred_by, ''))), '^@+', ''), '');
  v_created public.profiles;
begin
  if v_uid is null then
    raise exception 'Silakan masuk ke akun terlebih dahulu sebelum mengklaim username.';
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.';
  end if;

  if not public.is_valid_username_syntax(v_norm) then
    raise exception 'Format username tidak valid. Gunakan 3–24 karakter huruf kecil a–z, angka 0–9, titik (.), atau garis bawah (_).';
  end if;

  if exists (select 1 from public.reserved_usernames r where r.word = v_norm) then
    raise exception 'Username @% dicadangkan oleh sistem. Pilih username lain.', v_norm;
  end if;

  if v_disp = '' then
    v_disp := v_norm;
  end if;

  if v_tt is not null and not public.is_safe_https_url(v_tt, 500) then
    raise exception 'Tautan TikTok harus diawali https:// yang valid.';
  end if;

  if v_ref is not null and (v_ref = v_norm or not public.is_valid_username_syntax(v_ref)) then
    v_ref := null;
  end if;

  perform set_config('luven.claim_rpc', 'on', true);

  begin
    insert into public.profiles (
      id,
      username,
      display_name,
      bio,
      category,
      tiktok_url,
      referred_by,
      onboarding_completed
    )
    values (
      v_uid,
      v_norm,
      v_disp,
      v_bio,
      case when v_cat = '' then 'Transisi' else v_cat end,
      v_tt,
      v_ref,
      true
    )
    returning * into v_created;
  exception
    when unique_violation then
      if exists (select 1 from public.profiles p where p.id = v_uid) then
        raise exception 'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.';
      else
        raise exception 'Username sudah dipakai';
      end if;
  end;

  return v_created;
end;
$$;

-- ============================================================================
-- 6. PEMBARUAN SEMUA KEBIJAKAN RLS AGAR ADMIN MEMAKAI public.is_admin_unlocked()
-- ============================================================================

alter table public.reserved_usernames enable row level security;
revoke insert, update, delete on public.reserved_usernames from public, anon, authenticated;
grant select on public.reserved_usernames to anon, authenticated;

drop policy if exists "reserved_usernames_select_all" on public.reserved_usernames;
create policy "reserved_usernames_select_all"
  on public.reserved_usernames for select
  to anon, authenticated
  using (true);

-- PROFILES: cabut INSERT & DELETE langsung dari authenticated (klaim lewat claim_username, hapus lewat RPC admin)
revoke insert, delete on public.profiles from anon, authenticated;

drop policy if exists "profiles_select_public_or_owner_or_admin" on public.profiles;
create policy "profiles_select_public_or_owner_or_admin"
  on public.profiles for select
  to anon, authenticated
  using (
    is_banned = false
    or id = (select auth.uid())
    or public.is_admin_unlocked()
  );

drop policy if exists "profiles_insert_own" on public.profiles;

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own_or_admin" on public.profiles;

-- TEMPLATES: admin baca lewat is_admin_unlocked(); moderasi wajib lewat RPC admin
drop policy if exists "templates_select_public_or_owner_or_admin" on public.templates;
create policy "templates_select_public_or_owner_or_admin"
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
    or public.is_admin_unlocked()
  );

drop policy if exists "templates_update_owner_or_admin" on public.templates;
create policy "templates_update_owner_or_admin"
  on public.templates for update
  to authenticated
  using (owner_id = (select auth.uid()) and status <> 'removed')
  with check (owner_id = (select auth.uid()) and status in ('active', 'hidden'));

drop policy if exists "templates_delete_owner_or_admin" on public.templates;
create policy "templates_delete_owner_or_admin"
  on public.templates for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- LINKS: admin baca lewat is_admin_unlocked(); moderasi wajib lewat RPC admin
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
    or public.is_admin_unlocked()
  );

drop policy if exists "links_update_owner_or_admin" on public.links;
create policy "links_update_owner_or_admin"
  on public.links for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "links_delete_owner_or_admin" on public.links;
create policy "links_delete_owner_or_admin"
  on public.links for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- REPORTS, SUBSCRIPTIONS, CONTACT_MESSAGES, ADMINS, AUDIT_LOG, STORAGE
revoke update, delete on public.reports from anon, authenticated;

drop policy if exists "reports_admin_select" on public.reports;
create policy "reports_admin_select"
  on public.reports for select
  to authenticated
  using (public.is_admin_unlocked());

drop policy if exists "reports_admin_update" on public.reports;

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_unlocked());

drop policy if exists "contact_messages_admin_select" on public.contact_messages;
create policy "contact_messages_admin_select"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin_unlocked());

drop policy if exists "admins_select_self_or_admin" on public.admins;
create policy "admins_select_self_or_admin"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_unlocked());

drop policy if exists "admin_audit_log_select_unlocked" on public.admin_audit_log;
create policy "admin_audit_log_select_unlocked"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin_unlocked());

grant select on public.admin_audit_log to authenticated;

drop policy if exists "luven_storage_owner_delete" on storage.objects;
create policy "luven_storage_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'thumbnails')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin_unlocked())
  );

-- Perbarui guard_template_write & guard_link_write agar memakai is_admin_unlocked()
create or replace function public.guard_template_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count int;
  owner_banned boolean;
  is_priv boolean := (
    coalesce(current_setting('luven.admin_override', true), '') = 'on'
    or public.is_admin_unlocked()
  );
begin
  select p.is_banned into owner_banned
  from public.profiles p
  where p.id = new.owner_id;

  if coalesce(owner_banned, false) and not is_priv then
    raise exception 'Akun yang ditangguhkan tidak dapat menerbitkan atau mengubah template.';
  end if;

  if tg_op = 'INSERT' and not is_priv then
    select count(*) into recent_count
    from public.templates t
    where t.owner_id = new.owner_id
      and t.created_at > now() - interval '1 hour';

    if recent_count >= 25 then
      raise exception 'Batas penambahan template per jam tercapai (maks. 25). Coba beberapa saat lagi.';
    end if;
  end if;

  return new;
end;
$$;

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
  is_priv boolean := (
    coalesce(current_setting('luven.admin_override', true), '') = 'on'
    or public.is_admin_unlocked()
  );
begin
  select p.plan, p.plan_expires_at, p.is_banned
    into owner_plan, owner_exp, owner_banned
  from public.profiles p
  where p.id = new.owner_id;

  if not found then
    raise exception 'Profil pemilik tidak ditemukan.';
  end if;

  if coalesce(owner_banned, false) and not is_priv then
    raise exception 'Akun yang ditangguhkan tidak dapat mengelola link.';
  end if;

  if new.type <> 'heading' and new.type <> 'announcement' and (new.url is null or btrim(new.url) = '') then
    raise exception 'Tautan HTTPS wajib diisi untuk tipe link ini.';
  end if;

  eff_plan := public.effective_plan(owner_plan, owner_exp);

  if tg_op = 'INSERT' and not is_priv then
    select count(*) into recent_count
    from public.links l
    where l.owner_id = new.owner_id
      and l.created_at > now() - interval '1 hour';
    if recent_count >= 60 then
      raise exception 'Batas penambahan link per jam tercapai (maks. 60). Coba lagi nanti.';
    end if;
  end if;

  if eff_plan = 'free' and not is_priv then
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

-- ============================================================================
-- 7. FUNGSI RPC DASHBOARD ADMIN LENGKAP (9 BAGIAN, AUDIT OTOMATIS)
-- ============================================================================

-- 7.1 Ringkasan (Metrik nyata + tren 30 hari + aktivitas terbaru)
create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_users bigint;
  v_new_7d bigint;
  v_new_30d bigint;
  v_active_profiles bigint;
  v_total_templates bigint;
  v_total_links bigint;
  v_open_reports bigint;
  v_active_pro bigint;
  v_total_views bigint;
  v_total_clicks bigint;
  v_growth jsonb;
  v_logs jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select count(*) into v_total_users from auth.users;
  select count(*) into v_new_7d from auth.users where created_at >= now() - interval '7 days';
  select count(*) into v_new_30d from auth.users where created_at >= now() - interval '30 days';
  select count(*) into v_active_profiles from public.profiles where is_banned = false and onboarding_completed = true;
  select count(*) into v_total_templates from public.templates where status <> 'removed';
  select count(*) into v_total_links from public.links;
  select count(*) into v_open_reports from public.reports where status in ('open', 'reviewed');
  select count(*) into v_active_pro from public.profiles where public.effective_plan(plan, plan_expires_at) = 'pro';

  select
    coalesce(sum(hit_count) filter (where event_type in ('profile_view', 'template_view')), 0),
    coalesce(sum(hit_count) filter (where event_type in ('capcut_click', 'tiktok_click', 'social_click', 'link_click')), 0)
  into v_total_views, v_total_clicks
  from public.events;

  select coalesce(jsonb_agg(row_to_json(g) order by g.date asc), '[]'::jsonb)
  into v_growth
  from (
    select
      d::date::text as date,
      coalesce(u.cnt, 0) as new_users,
      coalesce(ev.views, 0) as views,
      coalesce(ev.clicks, 0) as clicks
    from generate_series(current_date - 29, current_date, interval '1 day') as d
    left join (
      select (created_at at time zone 'UTC')::date as day, count(*)::int as cnt
      from auth.users
      where created_at >= (current_date - 30)
      group by 1
    ) u on u.day = d::date
    left join (
      select
        event_day as day,
        coalesce(sum(hit_count) filter (where event_type in ('profile_view', 'template_view')), 0)::int as views,
        coalesce(sum(hit_count) filter (where event_type in ('capcut_click', 'tiktok_click', 'social_click', 'link_click')), 0)::int as clicks
      from public.events
      where event_day >= (current_date - 30)
      group by 1
    ) ev on ev.day = d::date
  ) g;

  select coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb)
  into v_logs
  from (
    select id, actor_email, action, target_type, target_id, details, created_at
    from public.admin_audit_log
    order by created_at desc
    limit 12
  ) l;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_users', v_total_users,
      'new_users_7d', v_new_7d,
      'new_users_30d', v_new_30d,
      'active_profiles', v_active_profiles,
      'total_templates', v_total_templates,
      'total_links', v_total_links,
      'open_reports', v_open_reports,
      'active_pro', v_active_pro,
      'total_views', v_total_views,
      'total_clicks', v_total_clicks
    ),
    'growth_30d', v_growth,
    'recent_logs', v_logs
  );
end;
$$;

-- 7.2 Daftar Pengguna (Server-side search, filter, sort, pagination)
create or replace function public.admin_list_users(
  p_search text default '',
  p_plan text default 'all',
  p_status text default 'all',
  p_verified text default 'all',
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'newest',
  p_page int default 1,
  p_page_size int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_search, '')));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 20)));
  v_offset int := (v_page - 1) * v_size;
  v_total bigint;
  v_items jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  with joined as (
    select
      u.id,
      coalesce(u.email, '') as email,
      u.created_at as registered_at,
      u.last_sign_in_at,
      coalesce(
        (
          select jsonb_agg(distinct i.provider)
          from auth.identities i
          where i.user_id = u.id
        ),
        coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ) as providers,
      p.username,
      p.display_name,
      p.avatar_url,
      p.category,
      coalesce(p.plan, 'free') as raw_plan,
      p.plan_expires_at,
      public.effective_plan(coalesce(p.plan, 'free'), p.plan_expires_at) as effective_plan,
      coalesce(p.is_verified, false) as is_verified,
      coalesce(p.is_featured, false) as is_featured,
      coalesce(p.featured_order, 0) as featured_order,
      coalesce(p.is_banned, false) as is_banned,
      coalesce(p.ban_reason, '') as ban_reason,
      (p.username is not null) as has_username,
      exists (select 1 from public.admins a where a.user_id = u.id) as is_admin,
      exists (select 1 from public.admins a where a.user_id = u.id and a.is_primary) as is_primary_admin,
      (select count(*)::int from public.templates t where t.owner_id = u.id and t.status <> 'removed') as templates_count,
      (select count(*)::int from public.links l where l.owner_id = u.id) as links_count
    from auth.users u
    left join public.profiles p on p.id = u.id
    where
      (
        v_q = ''
        or lower(coalesce(u.email, '')) like '%' || v_q || '%'
        or lower(coalesce(p.username, '')) like '%' || v_q || '%'
        or lower(coalesce(p.display_name, '')) like '%' || v_q || '%'
      )
      and (
        p_plan = 'all'
        or public.effective_plan(coalesce(p.plan, 'free'), p.plan_expires_at) = p_plan
      )
      and (
        p_status = 'all'
        or (p_status = 'active' and p.username is not null and coalesce(p.is_banned, false) = false)
        or (p_status = 'banned' and coalesce(p.is_banned, false) = true)
        or (p_status = 'unclaimed' and p.username is null)
      )
      and (
        p_verified = 'all'
        or (p_verified = 'verified' and coalesce(p.is_verified, false) = true)
        or (p_verified = 'unverified' and coalesce(p.is_verified, false) = false)
      )
      and (p_date_from is null or (u.created_at at time zone 'UTC')::date >= p_date_from)
      and (p_date_to is null or (u.created_at at time zone 'UTC')::date <= p_date_to)
  )
  select
    (select count(*) from joined),
    coalesce(
      (
        select jsonb_agg(row_to_json(paged))
        from (
          select *
          from joined
          order by
            case when p_sort = 'oldest' then extract(epoch from registered_at) end asc,
            case when p_sort = 'username' then coalesce(username, 'zzzzzz') end asc,
            extract(epoch from registered_at) desc
          limit v_size offset v_offset
        ) paged
      ),
      '[]'::jsonb
    )
  into v_total, v_items;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'items', v_items
  );
end;
$$;

-- 7.3 Detail Pengguna untuk Drawer
create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account jsonb;
  v_profile jsonb;
  v_subs jsonb;
  v_reports jsonb;
  v_views bigint;
  v_clicks bigint;
  v_tpl_count int;
  v_link_count int;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', coalesce(u.email, ''),
    'email_confirmed_at', u.email_confirmed_at,
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'has_password', (u.encrypted_password is not null and u.encrypted_password <> ''),
    'providers', coalesce(
      (select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = u.id),
      coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)
    ),
    'is_admin', exists (select 1 from public.admins a where a.user_id = u.id),
    'is_primary_admin', exists (select 1 from public.admins a where a.user_id = u.id and a.is_primary)
  )
  into v_account
  from auth.users u
  where u.id = p_user_id;

  if v_account is null then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  select to_jsonb(p.*) into v_profile
  from public.profiles p
  where p.id = p_user_id;

  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  into v_subs
  from (
    select id, plan, status, amount, provider, provider_ref, started_at, expires_at, created_at
    from public.subscriptions
    where user_id = p_user_id
    order by created_at desc
    limit 20
  ) s;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  into v_reports
  from (
    select id, target_type, target_id, reason, details, status, admin_note, created_at
    from public.reports
    where (target_type = 'profile' and target_id = p_user_id)
       or (target_type = 'template' and target_id in (select t.id from public.templates t where t.owner_id = p_user_id))
    order by created_at desc
    limit 20
  ) r;

  select
    coalesce(sum(hit_count) filter (where event_type in ('profile_view', 'template_view')), 0),
    coalesce(sum(hit_count) filter (where event_type in ('capcut_click', 'tiktok_click', 'social_click', 'link_click')), 0)
  into v_views, v_clicks
  from public.events
  where owner_id = p_user_id;

  select count(*)::int into v_tpl_count from public.templates where owner_id = p_user_id and status <> 'removed';
  select count(*)::int into v_link_count from public.links where owner_id = p_user_id;

  return jsonb_build_object(
    'account', v_account,
    'profile', v_profile,
    'subscriptions', v_subs,
    'reports', v_reports,
    'stats', jsonb_build_object(
      'templates_count', v_tpl_count,
      'links_count', v_link_count,
      'total_views', v_views,
      'total_clicks', v_clicks
    )
  );
end;
$$;

-- 7.4 Ubah status verifikasi, ban/unban (dengan alasan), & featured
create or replace function public.admin_set_user_flags(
  p_user_id uuid,
  p_is_verified boolean default null,
  p_is_banned boolean default null,
  p_ban_reason text default null,
  p_is_featured boolean default null,
  p_featured_order int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prof public.profiles%rowtype;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select * into v_prof from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profil kreator belum diklaim oleh akun ini.';
  end if;

  if coalesce(p_is_banned, false) and exists (
    select 1 from public.admins a where a.user_id = p_user_id and a.is_primary
  ) then
    raise exception 'Admin utama tidak dapat ditangguhkan.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  update public.profiles
  set is_verified = coalesce(p_is_verified, is_verified),
      is_banned = coalesce(p_is_banned, is_banned),
      ban_reason = case
        when p_is_banned = false then ''
        when p_ban_reason is not null then left(btrim(p_ban_reason), 240)
        else ban_reason
      end,
      is_featured = coalesce(p_is_featured, is_featured),
      featured_order = coalesce(p_featured_order, featured_order)
  where id = p_user_id;

  perform private.write_admin_audit(
    'admin_set_user_flags',
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'username', v_prof.username,
      'is_verified', p_is_verified,
      'is_banned', p_is_banned,
      'ban_reason', p_ban_reason,
      'is_featured', p_is_featured
    )
  );
end;
$$;

-- 7.5 Paket & Langganan (tunggal & massal) dengan is_admin_unlocked() + audit log
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
declare
  v_uname text;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if p_plan not in ('free', 'pro') then
    raise exception 'Paket tidak valid.';
  end if;

  select p.username into v_uname from public.profiles p where p.id = p_user_id;
  if v_uname is null then
    raise exception 'Pengguna belum memiliki profil kreator.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

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

  perform private.write_admin_audit(
    case when p_plan = 'pro' then 'admin_grant_pro' else 'admin_revoke_pro' end,
    'profile',
    p_user_id::text,
    jsonb_build_object('username', v_uname, 'plan', p_plan, 'expires_at', p_expires_at, 'amount', p_amount)
  );
end;
$$;

create or replace function public.admin_bulk_set_plan(
  p_user_ids uuid[],
  p_plan text,
  p_expires_at timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count int := 0;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if p_plan not in ('free', 'pro') then
    raise exception 'Paket tidak valid.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  foreach v_id in array coalesce(p_user_ids, array[]::uuid[]) loop
    if exists (select 1 from public.profiles where id = v_id) then
      update public.profiles
      set plan = p_plan,
          plan_expires_at = case when p_plan = 'pro' then p_expires_at else null end
      where id = v_id;

      insert into public.subscriptions (user_id, plan, status, amount, provider, expires_at)
      values (
        v_id,
        p_plan,
        case when p_plan = 'pro' then 'active' else 'revoked' end,
        0,
        'manual_admin_bulk',
        case when p_plan = 'pro' then p_expires_at else now() end
      );

      v_count := v_count + 1;
    end if;
  end loop;

  perform private.write_admin_audit(
    'admin_bulk_set_plan',
    'profiles',
    v_count::text,
    jsonb_build_object('plan', p_plan, 'expires_at', p_expires_at, 'count', v_count)
  );

  return v_count;
end;
$$;

-- 7.6 Pengelolaan Username (ubah/pindahkan klaim, lepas klaim, kata cadangan)
create or replace function public.admin_change_username(
  p_user_id uuid,
  p_new_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_norm text := regexp_replace(lower(btrim(coalesce(p_new_username, ''))), '^@+', '');
  v_old text;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if not public.is_valid_username_syntax(v_norm) then
    raise exception 'Format username baru tidak valid (3–24 karakter a–z, 0–9, titik, garis bawah).';
  end if;

  select p.username into v_old from public.profiles p where p.id = p_user_id;
  if v_old is null then
    raise exception 'Pengguna ini belum memiliki klaim username.';
  end if;

  if v_old = v_norm then
    return;
  end if;

  if exists (select 1 from public.profiles p where lower(p.username) = v_norm and p.id <> p_user_id) then
    raise exception 'Username @% sudah dipakai akun lain.', v_norm;
  end if;

  perform set_config('luven.admin_override', 'on', true);

  update public.profiles
  set username = v_norm
  where id = p_user_id;

  perform private.write_admin_audit(
    'admin_change_username',
    'profile',
    p_user_id::text,
    jsonb_build_object('old_username', v_old, 'new_username', v_norm)
  );
end;
$$;

create or replace function public.admin_release_username(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select p.username into v_old from public.profiles p where p.id = p_user_id;
  if v_old is null then
    raise exception 'Akun ini tidak memiliki klaim username.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  delete from public.profiles where id = p_user_id;

  perform private.write_admin_audit(
    'admin_release_username',
    'profile',
    p_user_id::text,
    jsonb_build_object('released_username', v_old)
  );
end;
$$;

create or replace function public.admin_list_usernames(
  p_search text default '',
  p_page int default 1,
  p_page_size int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_search, '')));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 30)));
  v_offset int := (v_page - 1) * v_size;
  v_total bigint;
  v_claims jsonb;
  v_reserved jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select count(*) into v_total
  from public.profiles p
  left join auth.users u on u.id = p.id
  where v_q = ''
     or lower(p.username) like '%' || v_q || '%'
     or lower(p.display_name) like '%' || v_q || '%'
     or lower(coalesce(u.email, '')) like '%' || v_q || '%';

  select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb)
  into v_claims
  from (
    select
      p.id as user_id,
      p.username,
      p.display_name,
      coalesce(u.email, '') as email,
      p.is_verified,
      p.is_banned,
      p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    where v_q = ''
       or lower(p.username) like '%' || v_q || '%'
       or lower(p.display_name) like '%' || v_q || '%'
       or lower(coalesce(u.email, '')) like '%' || v_q || '%'
    order by p.username asc
    limit v_size offset v_offset
  ) c;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  into v_reserved
  from (
    select word, reason, created_at
    from public.reserved_usernames
    where v_q = '' or word like '%' || v_q || '%'
    order by word asc
  ) r;

  return jsonb_build_object(
    'total_claims', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'claims', v_claims,
    'reserved', v_reserved
  );
end;
$$;

create or replace function public.admin_manage_reserved_username(
  p_word text,
  p_action text,
  p_reason text default 'Ditambahkan admin'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_word text := regexp_replace(lower(btrim(coalesce(p_word, ''))), '^@+', '');
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if v_word = '' or char_length(v_word) > 40 or v_word !~ '^[a-z0-9._-]+$' then
    raise exception 'Format kata cadangan tidak valid.';
  end if;

  if p_action = 'add' then
    insert into public.reserved_usernames (word, reason, created_by)
    values (v_word, left(btrim(coalesce(p_reason, 'Ditambahkan admin')), 120), (select auth.uid()))
    on conflict (word) do update
      set reason = excluded.reason;

    perform private.write_admin_audit('admin_reserve_word', 'reserved_usernames', v_word, jsonb_build_object('reason', p_reason));
  elsif p_action = 'remove' then
    delete from public.reserved_usernames where word = v_word;
    perform private.write_admin_audit('admin_unreserve_word', 'reserved_usernames', v_word, '{}'::jsonb);
  else
    raise exception 'Aksi tidak dikenali.';
  end if;
end;
$$;

-- 7.7 Hapus Akun Pengguna (konfirmasi ketik username/email, blokir hapus admin utama/diri sendiri)
create or replace function public.admin_delete_user_account(
  p_user_id uuid,
  p_confirm_text text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_email text;
  v_uname text;
  v_expected text;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if p_user_id = v_caller then
    raise exception 'Anda tidak dapat menghapus akun admin yang sedang Anda gunakan.';
  end if;

  if exists (select 1 from public.admins a where a.user_id = p_user_id and a.is_primary) then
    raise exception 'Akun admin utama tidak dapat dihapus.';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'Akun pengguna tidak ditemukan.';
  end if;

  select p.username into v_uname from public.profiles p where p.id = p_user_id;
  v_expected := coalesce(v_uname, lower(v_email));

  if lower(regexp_replace(btrim(coalesce(p_confirm_text, '')), '^@+', '')) <> lower(v_expected) then
    raise exception 'Konfirmasi tidak cocok. Ketik persis "%" untuk menghapus akun ini.', v_expected;
  end if;

  perform set_config('luven.admin_override', 'on', true);

  perform private.write_admin_audit(
    'admin_delete_user_account',
    'user',
    p_user_id::text,
    jsonb_build_object('email', v_email, 'username', v_uname)
  );

  delete from auth.users where id = p_user_id;
end;
$$;

-- 7.8 Moderasi Template & Link Bio
create or replace function public.admin_list_content(
  p_kind text default 'templates',
  p_status text default 'all',
  p_search text default '',
  p_page int default 1,
  p_page_size int default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_search, '')));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 25)));
  v_offset int := (v_page - 1) * v_size;
  v_total bigint;
  v_items jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if p_kind = 'links' then
    select count(*) into v_total
    from public.links l
    join public.profiles p on p.id = l.owner_id
    where (
      p_status = 'all'
      or (p_status = 'active' and l.is_active = true)
      or (p_status = 'hidden' and l.is_active = false)
    )
    and (
      v_q = ''
      or lower(l.title) like '%' || v_q || '%'
      or lower(coalesce(l.url, '')) like '%' || v_q || '%'
      or lower(p.username) like '%' || v_q || '%'
    );

    select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    into v_items
    from (
      select
        l.id,
        'link'::text as kind,
        l.type as link_type,
        l.title,
        l.url,
        l.thumbnail_url,
        case when l.is_active then 'active' else 'hidden' end as status,
        l.owner_id,
        p.username as owner_username,
        p.display_name as owner_display_name,
        l.created_at
      from public.links l
      join public.profiles p on p.id = l.owner_id
      where (
        p_status = 'all'
        or (p_status = 'active' and l.is_active = true)
        or (p_status = 'hidden' and l.is_active = false)
      )
      and (
        v_q = ''
        or lower(l.title) like '%' || v_q || '%'
        or lower(coalesce(l.url, '')) like '%' || v_q || '%'
        or lower(p.username) like '%' || v_q || '%'
      )
      order by l.created_at desc
      limit v_size offset v_offset
    ) x;
  else
    select count(*) into v_total
    from public.templates t
    join public.profiles p on p.id = t.owner_id
    where (p_status = 'all' or t.status = p_status)
      and (
        v_q = ''
        or lower(t.title) like '%' || v_q || '%'
        or lower(t.capcut_url) like '%' || v_q || '%'
        or lower(p.username) like '%' || v_q || '%'
      );

    select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    into v_items
    from (
      select
        t.id,
        'template'::text as kind,
        t.title,
        t.description,
        t.capcut_url as url,
        t.tiktok_url,
        t.thumbnail_url,
        t.status,
        t.owner_id,
        p.username as owner_username,
        p.display_name as owner_display_name,
        t.created_at
      from public.templates t
      join public.profiles p on p.id = t.owner_id
      where (p_status = 'all' or t.status = p_status)
        and (
          v_q = ''
          or lower(t.title) like '%' || v_q || '%'
          or lower(t.capcut_url) like '%' || v_q || '%'
          or lower(p.username) like '%' || v_q || '%'
        )
      order by t.created_at desc
      limit v_size offset v_offset
    ) x;
  end if;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'items', v_items
  );
end;
$$;

create or replace function public.admin_moderate_content(
  p_kind text,
  p_item_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  if p_kind = 'template' then
    if p_action not in ('active', 'hidden', 'removed') then
      raise exception 'Status moderasi template tidak valid.';
    end if;
    update public.templates set status = p_action where id = p_item_id;
  elsif p_kind = 'link' then
    if p_action = 'active' then
      update public.links set is_active = true where id = p_item_id;
    elsif p_action = 'hidden' then
      update public.links set is_active = false where id = p_item_id;
    elsif p_action = 'removed' then
      delete from public.links where id = p_item_id;
    else
      raise exception 'Aksi moderasi link tidak valid.';
    end if;
  else
    raise exception 'Jenis konten tidak dikenali.';
  end if;

  perform private.write_admin_audit(
    'admin_moderate_' || p_kind,
    p_kind,
    p_item_id::text,
    jsonb_build_object('action', p_action)
  );
end;
$$;

-- 7.9 Antrean Laporan & Tindakan Cepat
create or replace function public.admin_list_reports(
  p_status text default 'all',
  p_page int default 1,
  p_page_size int default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 25)));
  v_offset int := (v_page - 1) * v_size;
  v_total bigint;
  v_items jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select count(*) into v_total
  from public.reports r
  where p_status = 'all' or r.status = p_status;

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  into v_items
  from (
    select
      r.id,
      r.reporter_id,
      r.target_type,
      r.target_id,
      r.reason,
      r.details,
      r.status,
      r.admin_note,
      r.created_at,
      r.resolved_at,
      case
        when r.target_type = 'profile' then coalesce('@' || tp.username, 'Profil tidak ditemukan')
        else coalesce(tt.title, 'Template tidak ditemukan')
      end as target_label,
      case
        when r.target_type = 'profile' then tp.username
        else op.username
      end as owner_username,
      case
        when r.target_type = 'profile' then tp.id
        else op.id
      end as owner_id
    from public.reports r
    left join public.profiles tp on r.target_type = 'profile' and tp.id = r.target_id
    left join public.templates tt on r.target_type = 'template' and tt.id = r.target_id
    left join public.profiles op on op.id = tt.owner_id
    where p_status = 'all' or r.status = p_status
    order by
      case when r.status = 'open' then 0 when r.status = 'reviewed' then 1 else 2 end asc,
      r.created_at desc
    limit v_size offset v_offset
  ) x;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'items', v_items
  );
end;
$$;

create or replace function public.admin_resolve_report_v2(
  p_report_id uuid,
  p_status text,
  p_note text default '',
  p_quick_action text default 'none'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep public.reports%rowtype;
  v_owner uuid;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  if p_status not in ('open', 'reviewed', 'resolved', 'dismissed') then
    raise exception 'Status laporan tidak valid.';
  end if;

  select * into v_rep from public.reports where id = p_report_id;
  if not found then
    raise exception 'Laporan tidak ditemukan.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  if p_quick_action = 'hide_content' and v_rep.target_type = 'template' then
    update public.templates set status = 'hidden' where id = v_rep.target_id;
  elsif p_quick_action = 'remove_content' and v_rep.target_type = 'template' then
    update public.templates set status = 'removed' where id = v_rep.target_id;
  elsif p_quick_action = 'ban_user' then
    if v_rep.target_type = 'profile' then
      v_owner := v_rep.target_id;
    else
      select owner_id into v_owner from public.templates where id = v_rep.target_id;
    end if;

    if v_owner is not null and not exists (select 1 from public.admins a where a.user_id = v_owner and a.is_primary) then
      update public.profiles
      set is_banned = true,
          ban_reason = coalesce(nullif(left(btrim(p_note), 240), ''), v_rep.reason)
      where id = v_owner;
    end if;
  end if;

  update public.reports
  set status = p_status,
      admin_note = left(btrim(coalesce(p_note, '')), 500),
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else resolved_at end,
      resolved_by = (select auth.uid())
  where id = p_report_id;

  perform private.write_admin_audit(
    'admin_resolve_report',
    'report',
    p_report_id::text,
    jsonb_build_object('status', p_status, 'quick_action', p_quick_action, 'note', left(btrim(coalesce(p_note, '')), 120))
  );
end;
$$;

-- 7.10 Daftar Paket & Langganan
create or replace function public.admin_list_subscriptions(
  p_filter text default 'all',
  p_page int default 1,
  p_page_size int default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 25)));
  v_offset int := (v_page - 1) * v_size;
  v_active_pro jsonb;
  v_expiring_soon jsonb;
  v_history jsonb;
  v_total bigint;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb)
  into v_active_pro
  from (
    select p.id, p.username, p.display_name, coalesce(u.email, '') as email, p.plan_expires_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    where public.effective_plan(p.plan, p.plan_expires_at) = 'pro'
    order by p.plan_expires_at asc nulls last
  ) a;

  select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb)
  into v_expiring_soon
  from (
    select p.id, p.username, p.display_name, coalesce(u.email, '') as email, p.plan_expires_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.plan = 'pro'
      and p.plan_expires_at is not null
      and p.plan_expires_at > now()
      and p.plan_expires_at <= now() + interval '7 days'
    order by p.plan_expires_at asc
  ) e;

  select count(*) into v_total
  from public.subscriptions s
  where p_filter = 'all' or s.status = p_filter;

  select coalesce(jsonb_agg(row_to_json(h)), '[]'::jsonb)
  into v_history
  from (
    select
      s.id,
      s.user_id,
      p.username,
      coalesce(u.email, '') as email,
      s.plan,
      s.status,
      s.amount,
      s.provider,
      s.provider_ref,
      s.started_at,
      s.expires_at,
      s.created_at
    from public.subscriptions s
    left join public.profiles p on p.id = s.user_id
    left join auth.users u on u.id = s.user_id
    where p_filter = 'all' or s.status = p_filter
    order by s.created_at desc
    limit v_size offset v_offset
  ) h;

  return jsonb_build_object(
    'active_pro', v_active_pro,
    'expiring_soon', v_expiring_soon,
    'total_history', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'history', v_history
  );
end;
$$;

-- 7.11 Pengurutan Kreator Pilihan (tampil di Beranda & Jelajah)
create or replace function public.admin_reorder_featured(p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idx int := 1;
  v_id uuid;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  perform set_config('luven.admin_override', 'on', true);

  foreach v_id in array coalesce(p_ordered_ids, array[]::uuid[]) loop
    update public.profiles
    set is_featured = true,
        featured_order = v_idx
    where id = v_id;
    v_idx := v_idx + 1;
  end loop;

  perform private.write_admin_audit(
    'admin_reorder_featured',
    'profiles',
    coalesce(array_length(p_ordered_ids, 1), 0)::text,
    jsonb_build_object('ordered_ids', p_ordered_ids)
  );
end;
$$;

-- 7.12 Daftar Log Aktivitas Audit
create or replace function public.admin_list_audit_logs(
  p_action text default 'all',
  p_search text default '',
  p_page int default 1,
  p_page_size int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_search, '')));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_size int := greatest(1, least(100, coalesce(p_page_size, 30)));
  v_offset int := (v_page - 1) * v_size;
  v_total bigint;
  v_items jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select count(*) into v_total
  from public.admin_audit_log l
  where (p_action = 'all' or l.action = p_action)
    and (
      v_q = ''
      or lower(l.actor_email) like '%' || v_q || '%'
      or lower(l.action) like '%' || v_q || '%'
      or lower(l.target_id) like '%' || v_q || '%'
    );

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  into v_items
  from (
    select id, actor_id, actor_email, action, target_type, target_id, details, created_at
    from public.admin_audit_log l
    where (p_action = 'all' or l.action = p_action)
      and (
        v_q = ''
        or lower(l.actor_email) like '%' || v_q || '%'
        or lower(l.action) like '%' || v_q || '%'
        or lower(l.target_id) like '%' || v_q || '%'
      )
    order by created_at desc
    limit v_size offset v_offset
  ) x;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'page', v_page,
    'page_size', v_size,
    'items', v_items
  );
end;
$$;

-- 7.13 Pengaturan Situs & Kelola Tim Admin
create or replace function public.admin_get_settings_and_team()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
  v_team jsonb;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select to_jsonb(s.*) into v_settings
  from public.site_settings s
  where s.id = 1;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_team
  from (
    select
      a.user_id,
      coalesce(u.email, '') as email,
      p.username,
      a.note,
      a.is_primary,
      exists (select 1 from public.admin_secrets s where s.user_id = a.user_id) as has_passphrase,
      a.created_at
    from public.admins a
    left join auth.users u on u.id = a.user_id
    left join public.profiles p on p.id = a.user_id
    order by a.is_primary desc, a.created_at asc
  ) t;

  return jsonb_build_object(
    'settings', v_settings,
    'team', v_team
  );
end;
$$;

create or replace function public.admin_update_site_settings(
  p_announcement_text text,
  p_announcement_active boolean,
  p_maintenance_mode boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  update public.site_settings
  set announcement_text = left(btrim(coalesce(p_announcement_text, '')), 280),
      announcement_active = coalesce(p_announcement_active, false),
      maintenance_mode = coalesce(p_maintenance_mode, false),
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = 1;

  perform private.write_admin_audit(
    'admin_update_site_settings',
    'site_settings',
    '1',
    jsonb_build_object(
      'announcement_active', p_announcement_active,
      'maintenance_mode', p_maintenance_mode
    )
  );
end;
$$;

create or replace function public.admin_manage_team(
  p_email text,
  p_action text,
  p_note text default 'Administrator'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_email text := lower(btrim(coalesce(p_email, '')));
  v_target_id uuid;
  v_is_primary boolean := false;
begin
  if not public.is_admin_unlocked() then
    raise exception 'Akses admin terkunci.';
  end if;

  select u.id into v_target_id
  from auth.users u
  where lower(u.email) = v_clean_email
  limit 1;

  if v_target_id is null then
    raise exception 'Email tersebut belum terdaftar sebagai akun di Luven.';
  end if;

  if p_action = 'add' then
    insert into public.admins (user_id, note, is_primary, added_by)
    values (
      v_target_id,
      left(btrim(coalesce(p_note, 'Administrator')), 80),
      false,
      (select auth.uid())
    )
    on conflict (user_id) do update
      set note = excluded.note;

    perform private.write_admin_audit('admin_add_team_member', 'admins', v_target_id::text, jsonb_build_object('email', v_clean_email));
  elsif p_action = 'remove' then
    select a.is_primary into v_is_primary from public.admins a where a.user_id = v_target_id;
    if coalesce(v_is_primary, false) then
      raise exception 'Admin utama tidak dapat dicabut.';
    end if;
    if v_target_id = (select auth.uid()) then
      raise exception 'Anda tidak dapat mencabut akses admin Anda sendiri.';
    end if;

    delete from public.admin_secrets where user_id = v_target_id;
    delete from public.admins where user_id = v_target_id;

    perform private.write_admin_audit('admin_remove_team_member', 'admins', v_target_id::text, jsonb_build_object('email', v_clean_email));
  else
    raise exception 'Aksi tim admin tidak valid.';
  end if;
end;
$$;

-- ============================================================================
-- 8. GRANT & REVOKE EKSPLISIT FUNGSI RPC KE ROLE SUPABASE
-- ============================================================================
revoke all on function public.is_admin() from public;
revoke all on function public.is_admin_unlocked() from public;
revoke all on function public.admin_gate_status() from public;
revoke all on function public.admin_unlock(text) from public;
revoke all on function public.admin_lock() from public;
revoke all on function public.admin_change_passphrase(text) from public;
revoke all on function public.check_username_available(text) from public;
revoke all on function public.check_username_status(text) from public;
revoke all on function public.claim_username(text, text, text, text, text, text) from public;

revoke all on function public.admin_get_overview() from public;
revoke all on function public.admin_list_users(text, text, text, text, date, date, text, int, int) from public;
revoke all on function public.admin_get_user_detail(uuid) from public;
revoke all on function public.admin_set_user_flags(uuid, boolean, boolean, text, boolean, int) from public;
revoke all on function public.admin_set_user_plan(uuid, text, timestamptz, integer) from public;
revoke all on function public.admin_bulk_set_plan(uuid[], text, timestamptz) from public;
revoke all on function public.admin_change_username(uuid, text) from public;
revoke all on function public.admin_release_username(uuid) from public;
revoke all on function public.admin_list_usernames(text, int, int) from public;
revoke all on function public.admin_manage_reserved_username(text, text, text) from public;
revoke all on function public.admin_delete_user_account(uuid, text) from public;
revoke all on function public.admin_list_content(text, text, text, int, int) from public;
revoke all on function public.admin_moderate_content(text, uuid, text) from public;
revoke all on function public.admin_list_reports(text, int, int) from public;
revoke all on function public.admin_resolve_report_v2(uuid, text, text, text) from public;
revoke all on function public.admin_list_subscriptions(text, int, int) from public;
revoke all on function public.admin_reorder_featured(uuid[]) from public;
revoke all on function public.admin_list_audit_logs(text, text, int, int) from public;
revoke all on function public.admin_get_settings_and_team() from public;
revoke all on function public.admin_update_site_settings(text, boolean, boolean) from public;
revoke all on function public.admin_manage_team(text, text, text) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin_unlocked() to anon, authenticated;
grant execute on function public.check_username_available(text) to anon, authenticated;
grant execute on function public.check_username_status(text) to anon, authenticated;

grant execute on function public.claim_username(text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_gate_status() to authenticated;
grant execute on function public.admin_unlock(text) to authenticated;
grant execute on function public.admin_lock() to authenticated;
grant execute on function public.admin_change_passphrase(text) to authenticated;

grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_list_users(text, text, text, text, date, date, text, int, int) to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_flags(uuid, boolean, boolean, text, boolean, int) to authenticated;
grant execute on function public.admin_set_user_plan(uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.admin_bulk_set_plan(uuid[], text, timestamptz) to authenticated;
grant execute on function public.admin_change_username(uuid, text) to authenticated;
grant execute on function public.admin_release_username(uuid) to authenticated;
grant execute on function public.admin_list_usernames(text, int, int) to authenticated;
grant execute on function public.admin_manage_reserved_username(text, text, text) to authenticated;
grant execute on function public.admin_delete_user_account(uuid, text) to authenticated;
grant execute on function public.admin_list_content(text, text, text, int, int) to authenticated;
grant execute on function public.admin_moderate_content(text, uuid, text) to authenticated;
grant execute on function public.admin_list_reports(text, int, int) to authenticated;
grant execute on function public.admin_resolve_report_v2(uuid, text, text, text) to authenticated;
grant execute on function public.admin_list_subscriptions(text, int, int) to authenticated;
grant execute on function public.admin_reorder_featured(uuid[]) to authenticated;
grant execute on function public.admin_list_audit_logs(text, text, int, int) to authenticated;
grant execute on function public.admin_get_settings_and_team() to authenticated;
grant execute on function public.admin_update_site_settings(text, boolean, boolean) to authenticated;
grant execute on function public.admin_manage_team(text, text, text) to authenticated;
