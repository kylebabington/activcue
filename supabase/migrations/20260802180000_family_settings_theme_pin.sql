/*
 * Sync look-and-feel + soft Parent PIN with the family settings document.
 * PIN is stored as a server-side hash only — never return the raw PIN.
 */
alter table public.family_settings
add column if not exists ui_theme text
not null
default 'playroom';

alter table public.family_settings
add column if not exists kid_device_mode boolean
not null
default false;

alter table public.family_settings
add column if not exists parent_pin_hash text;

comment on column public.family_settings.parent_pin_hash is
  'scrypt hash of Parent PIN; null means no PIN is set';
