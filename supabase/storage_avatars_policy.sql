-- ======================================================
-- Supabase Storage: avatars bucket + policy
-- 何度実行しても安全（idempotent）
-- ======================================================

-- avatars bucket 作成（既にあれば public=true に更新）
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 既存 policy を先に削除してから再作成
drop policy if exists "avatars: self upload" on storage.objects;
drop policy if exists "avatars: public read"  on storage.objects;
drop policy if exists "avatars: self update"  on storage.objects;
drop policy if exists "avatars: self delete"  on storage.objects;

-- authenticated user が 自分の userId/ 以下に insert できる
create policy "avatars: self upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 全員が読める（public bucket）
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
