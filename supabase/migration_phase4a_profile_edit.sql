-- ======================================================
-- Phase 4A Migration
-- profiles に profile_comment カラム追加
-- ======================================================

alter table public.profiles
  add column if not exists profile_comment text;
