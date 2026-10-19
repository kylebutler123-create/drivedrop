-- Apply only after deploying the preview route with dispatch support.
-- Does not activate the cron job. A successful call means accepted, not completed:
-- inspect booking_authorisation_runs for finished_at/status/checked/failed.
create or replace function drivedrop_preview_ops.poll_booking_authorisations()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  cron_token text;
  bypass_token text;
  response drivedrop_preview_ops.http_response;
  payload jsonb;
begin
  select decrypted_secret into strict cron_token from vault.decrypted_secrets
    where name = 'drivedrop_preview_booking_cron_secret';
  select decrypted_secret into strict bypass_token from vault.decrypted_secrets
    where name = 'drivedrop_preview_vercel_bypass';
  if length(coalesce(cron_token, '')) < 32 or length(coalesce(bypass_token, '')) < 16 then
    raise exception 'Preview scheduler credentials are missing or invalid';
  end if;
  begin
    select * into strict response from drivedrop_preview_ops.http((
      'GET',
      'https://drivedrop-git-feature-ui-polish-future-9f39.vercel.app/api/cron/booking-authorisations?dispatch=1',
      array[
        ('Authorization', 'Bearer ' || cron_token)::drivedrop_preview_ops.http_header,
        ('x-vercel-protection-bypass', bypass_token)::drivedrop_preview_ops.http_header
      ], null, null
    )::drivedrop_preview_ops.http_request);
  exception when others then
    raise exception 'Preview recovery dispatch failed (SQLSTATE %)', SQLSTATE;
  end;
  if response.status <> 202 then
    raise exception 'Preview recovery dispatch returned HTTP %', response.status;
  end if;
  begin
    payload := response.content::jsonb;
  exception when others then
    raise exception 'Preview recovery dispatch returned an invalid response';
  end;
  if payload->'accepted' is distinct from 'true'::jsonb
     or coalesce(payload->>'runId','') !~ '^[0-9a-f-]{36}$'
     or not exists (select 1 from drivedrop_preview_ops.booking_authorisation_runs where id = payload->>'runId') then
    raise exception 'Preview recovery dispatch has no recorded run';
  end if;
  return 1;
end;
$function$;
revoke all on function drivedrop_preview_ops.poll_booking_authorisations() from public, anon, authenticated;
