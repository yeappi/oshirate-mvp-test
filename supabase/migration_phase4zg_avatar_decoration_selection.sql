-- Phase4zg: アイコン装飾の選択状態
-- null は「Lvに応じたおすすめ自動」、'__none__' は「このカテゴリは装飾なし」。

alter table public.profiles
  add column if not exists selected_wing_asset text,
  add column if not exists selected_crown_asset text,
  add column if not exists selected_front_fx_asset text;
