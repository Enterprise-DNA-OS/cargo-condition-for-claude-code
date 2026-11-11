-- Case-insensitive command references must remain unambiguous in storage.
create unique index shipments_code_ci on shipments(lower(code));
create unique index inspections_code_ci on inspections(lower(code));
create unique index issues_code_ci on issues(lower(code));

-- Enforce the core release boundary even when a trusted operator uses SQL.
create function check_release() returns trigger language plpgsql as $$
declare i record;
begin
 if old.status='released' and new.status<>old.status then raise exception 'Released shipments retain their state'; end if;
 if old.status='open' and new.status='released' then
  if exists(select 1 from v_compliance where shipment_id=new.id) then raise exception 'Record checks block release'; end if;
  select * into i from v_latest_inspection where shipment_id=new.id;
  if i.id is null or i.stage<>'dispatch' or i.condition<>'sound' then raise exception 'A sound dispatch inspection is required'; end if;
 end if;
 return new;
end $$;
create trigger release_checks before update on shipments for each row execute function check_release();
create function require_open_shipment() returns trigger language plpgsql as $$
declare state text;
begin
 select status into state from shipments where id=new.shipment_id for update;
 if state='released' then raise exception 'Shipment already released'; end if;
 return new;
end $$;
-- Imports and direct writes follow the same release boundary as the CLI.
create trigger inspection_open before insert on inspections for each row execute function require_open_shipment();
create trigger issue_open before insert on issues for each row execute function require_open_shipment();
