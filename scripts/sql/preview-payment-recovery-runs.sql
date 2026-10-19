-- Preview operations only. Apply to yozbuuvebzxitoqrvyer through the migration tool.
-- Requires the existing, private drivedrop_preview_ops schema; never create it
-- implicitly in a production database or grant client roles access.
create table drivedrop_preview_ops.booking_authorisation_runs (
  id text primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'interrupted')),
  checked integer not null default 0 check (checked >= 0),
  failed integer not null default 0 check (failed >= 0),
  check ((status = 'running') = (finished_at is null))
);
create unique index booking_authorisation_runs_one_active
  on drivedrop_preview_ops.booking_authorisation_runs ((true))
  where finished_at is null;
revoke all on drivedrop_preview_ops.booking_authorisation_runs from public, anon, authenticated;
alter table drivedrop_preview_ops.booking_authorisation_runs enable row level security;
