-- Add durable activity preferences and household-basics flag to family_settings.

alter table public.family_settings
  add column if not exists activity_preferences jsonb not null default '{}'::jsonb;

alter table public.family_settings
  add column if not exists assume_household_basics boolean not null default true;

comment on column public.family_settings.activity_preferences is
  'Durable family defaults for mess, setup, independence, activity style, indoor/outdoor.';

comment on column public.family_settings.assume_household_basics is
  'When true, ActivCue treats common household basics as available even if not listed in inventory.';
