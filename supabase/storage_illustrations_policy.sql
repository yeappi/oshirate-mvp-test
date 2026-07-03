-- Admin illustration uploads storage setup
-- MVP方針:
-- - admin画面から画像ファイルをアップロードする
-- - UIはadminにしか出さない
-- - Storage policyはavatarsと同じく「ログインユーザーが自分のフォルダへinsert可能」
-- - public read
-- - update/deleteはまだ許可しない

insert into storage.buckets (id, name, public)
values ('illustrations', 'illustrations', true)
on conflict (id) do update set public = true;

drop policy if exists "illustrations: self upload" on storage.objects;
drop policy if exists "illustrations: public read" on storage.objects;
drop policy if exists "illustrations: self update" on storage.objects;
drop policy if exists "illustrations: self delete" on storage.objects;

create policy "illustrations: self upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'illustrations'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "illustrations: public read"
on storage.objects
for select
to public
using (bucket_id = 'illustrations');
