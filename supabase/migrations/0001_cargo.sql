create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table shipments (
 id uuid primary key default gen_random_uuid(), code text not null unique check(length(trim(code))>0),
 name text not null, customer text not null, carrier text not null, site text not null,
 expected_units integer not null check(expected_units>=0), expected_seal text not null default '',
 status text not null default 'open' check(status in ('open','released')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table inspections (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 shipment_id uuid not null references shipments, inspected_at timestamptz not null,
 stage text not null check(stage in ('receipt','packing','dispatch')),
 inspector text not null check(length(trim(inspector))>0),
 condition text not null check(condition in ('sound','damaged','unchecked')),
 seal_observed text not null default '', expected_seal text not null default '',
 units integer not null check(units>=0), expected_units integer not null check(expected_units>=0),
 notes text not null default '', raw_answers jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table evidence (
 id uuid primary key default gen_random_uuid(), inspection_id uuid not null references inspections,
 name text not null, stored_path text not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes bigint not null check(bytes>=0), captured_at timestamptz not null, added_by text not null,
 unique(inspection_id,sha256),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table issues (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 shipment_id uuid not null references shipments, inspection_id uuid references inspections,
 kind text not null check(kind in ('damage','shortage','seal','documentation','other')),
 description text not null check(length(trim(description))>0), owner text not null check(length(trim(owner))>0),
 due_on date not null, severity text not null check(severity in ('low','medium','high')),
 status text not null default 'open' check(status in ('open','resolved')),
 resolution text, resolved_by text, resolved_at timestamptz,
 check((status='open' and resolved_at is null) or (status='resolved' and length(trim(resolution))>0 and length(trim(resolved_by))>0 and resolved_at is not null)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table handovers (
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references shipments,
 from_party text not null, to_party text not null, happened_at timestamptz not null,
 accepted_by text not null, receipt_ref text not null, notes text not null default '',
 check(length(trim(from_party))>0 and length(trim(to_party))>0 and length(trim(accepted_by))>0 and length(trim(receipt_ref))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references shipments,
 author text not null, body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), filename text not null, sha256 text not null,
 rows_imported integer not null, rows_skipped integer not null, mapping jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 operation text not null, before_record jsonb, after_record jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_change() returns trigger language plpgsql as $$
begin
 insert into audit_log(entity,record_id,operation,before_record,after_record)
 values(tg_table_name,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
create function keep_record() returns trigger language plpgsql as $$ begin raise exception 'History is retained; append a correction instead'; end $$;
create function inspection_lock() returns trigger language plpgsql as $$ begin raise exception 'Inspection is immutable; append a corrected inspection with a new reference'; end $$;
create function issue_link() returns trigger language plpgsql as $$
begin
 if new.inspection_id is not null and not exists(select 1 from inspections where id=new.inspection_id and shipment_id=new.shipment_id) then raise exception 'Inspection belongs to another shipment'; end if;
 return new;
end $$;
create trigger issue_link before insert or update on issues for each row execute function issue_link();
create trigger inspections_immutable before update on inspections for each row execute function inspection_lock();
create trigger evidence_immutable before update on evidence for each row execute function keep_record();
create trigger handovers_immutable before update on handovers for each row execute function keep_record();
create trigger notes_immutable before update on notes for each row execute function keep_record();
create trigger audit_immutable before update or delete on audit_log for each row execute function keep_record();
DO $$ declare t text; begin
 foreach t in array array['shipments','inspections','evidence','issues','handovers','notes','import_batches'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('create trigger audit after insert or update on %I for each row execute function audit_change()',t);
 execute format('create trigger keep before delete on %I for each row execute function keep_record()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
alter table audit_log enable row level security;
revoke all on audit_log from public;
create index inspections_shipment on inspections(shipment_id,inspected_at desc);
create index issues_shipment on issues(shipment_id,status);
create index handovers_shipment on handovers(shipment_id,happened_at desc);
create view v_latest_inspection as
 select distinct on (shipment_id) * from inspections order by shipment_id,inspected_at desc,created_at desc,code desc;
create view v_condition as
 select s.id,s.code,s.customer,s.carrier,s.site,s.status,
 i.code inspection,i.stage,i.inspected_at,i.condition,i.inspector,i.units,i.expected_units,i.expected_seal,i.seal_observed,
 case when i.id is null then 'missing' when i.expected_seal='' then 'not required' when i.seal_observed=i.expected_seal then 'match' else 'mismatch' end seal_check,
 (select count(*)::int from evidence e where e.inspection_id=i.id) evidence_count,
 (select count(*)::int from issues x where x.shipment_id=s.id and x.status='open') open_issues,
 (select count(*)::int from handovers h where h.shipment_id=s.id) handover_count
 from shipments s left join v_latest_inspection i on i.shipment_id=s.id;
create view v_issue_queue as
 select i.id,i.code,s.code shipment,s.customer,s.carrier,s.site,i.kind,i.severity,i.owner,i.due_on,
 current_date-i.due_on days_overdue,i.status,i.description,i.resolution
 from issues i join shipments s on s.id=i.shipment_id;
create view v_compliance as
 select s.id shipment_id,s.code shipment,'CTU-CONDITION' rule,'No recorded condition inspection' finding,'CTU Code chapters 8 and 12; evidence check' basis from shipments s where not exists(select 1 from inspections i where i.shipment_id=s.id)
 union all select s.id,s.code,'CTU-CONDITION','Latest condition has not been checked','CTU Code chapters 8 and 12; evidence check' from shipments s join v_latest_inspection i on i.shipment_id=s.id where i.condition='unchecked'
 union all select s.id,s.code,'CTU-SEAL','Expected seal does not match the observed seal','CTU Code chapter 12; evidence check' from shipments s join v_latest_inspection i on i.shipment_id=s.id where i.expected_seal<>'' and i.expected_seal<>i.seal_observed
 union all select s.id,s.code,'COUNT-VARIANCE','Count differs from expected units','Local receiving control, not a statutory threshold' from shipments s join v_latest_inspection i on i.shipment_id=s.id where i.units<>i.expected_units
 union all select s.id,s.code,'DAMAGE-RECORD','Damage has no linked evidence attachment','Local evidence control supporting CTU Code chapter 12' from shipments s join v_latest_inspection i on i.shipment_id=s.id where i.condition='damaged' and not exists(select 1 from evidence e where e.inspection_id=i.id)
 union all select s.id,s.code,'OPEN-ISSUE','Open issue: '||x.code,'Local release control' from shipments s join issues x on x.shipment_id=s.id where x.status='open';
create view v_attention as
 select shipment,'record check' kind,rule||': '||finding detail from v_compliance
 union all select shipment,'overdue issue',code||' owned by '||owner||' due '||due_on::text from v_issue_queue where status='open' and due_on<current_date
 union all select s.code,'stale inspection','No inspection in the last 7 days (local review threshold)' from shipments s join v_latest_inspection i on i.shipment_id=s.id where s.status='open' and i.inspected_at<now()-interval '7 days'
 union all select s.code,'handover missing','Released shipment has no handover receipt' from shipments s where s.status='released' and not exists(select 1 from handovers h where h.shipment_id=s.id);
revoke all on v_latest_inspection,v_condition,v_issue_queue,v_compliance,v_attention from public;
