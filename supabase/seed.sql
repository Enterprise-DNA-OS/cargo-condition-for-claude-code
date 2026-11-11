insert into shipments(code,name,customer,carrier,site,expected_units,expected_seal,status) values
 ('CG100','Ceramic cartons','Example Harbour Imports','Example Coast Freight','Auckland',120,'SEAL-501','open'),
 ('CG101','Pump components','Example Engineering','Example Coast Freight','Auckland',80,'SEAL-502','open'),
 ('CG102','Textile pallets','Example Fabric Supply','Example Tasman Haulage','Melbourne',40,'SEAL-503','open'),
 ('CG103','Packed fittings','Example Engineering','Example Tasman Haulage','Melbourne',60,'SEAL-504','open'),
 ('CG104','Awaiting receipt','Example Harbour Imports','Example Coast Freight','Auckland',25,'','open'),
 ('CG105','Export components','Example Fabric Supply','Example Tasman Haulage','Melbourne',100,'SEAL-505','open')
 on conflict(code) do nothing;
insert into inspections(code,shipment_id,inspected_at,stage,inspector,condition,units,expected_units,expected_seal,seal_observed,notes)
 select x.code,s.id,now()-x.age*interval '1 day',x.stage,'Demo Inspector',x.condition,x.units,s.expected_units,s.expected_seal,x.seal,x.notes
 from (values
 ('IN100','CG100',2,'receipt','damaged',116,'SEAL-501','Four crushed cartons; photographs requested'),
 ('IN101','CG101',1,'receipt','sound',80,'SEAL-999','Observed seal differs from transport record'),
 ('IN102','CG102',12,'receipt','sound',40,'SEAL-503','Waiting for dispatch instruction'),
 ('IN103','CG103',3,'dispatch','sound',60,'SEAL-504','Released against delivery receipt'),
 ('IN105','CG105',1,'packing','unchecked',100,'SEAL-505','Packing inspection incomplete')
 ) x(code,shipment,age,stage,condition,units,seal,notes) join shipments s on s.code=x.shipment where not exists(select 1 from inspections i where i.code=x.code) on conflict(code) do nothing;
insert into issues(code,shipment_id,inspection_id,kind,description,owner,due_on,severity)
 select x.code,s.id,i.id,x.kind,x.description,x.owner,current_date+x.days,x.severity
 from (values
 ('IS100','CG100','IN100','damage','Confirm damaged carton count and obtain photographs','Mia',-2,'high'),
 ('IS101','CG101','IN101','seal','Check seal mismatch against original receipt','Noah',0,'high'),
 ('IS105','CG105','IN105','documentation','Complete packing condition check','Mia',2,'medium')
 ) x(code,shipment,inspection,kind,description,owner,days,severity) join shipments s on s.code=x.shipment join inspections i on i.code=x.inspection on conflict(code) do nothing;
update shipments set status='released' where code='CG103' and status='open';
insert into handovers(shipment_id,from_party,to_party,happened_at,accepted_by,receipt_ref,notes)
 select id,'Example warehouse','Example Tasman Haulage',now()-interval '3 days','Demo Receiver','DEMO-POD-103','Receipt reference only, not a digital signature'
 from shipments s where code='CG103' and not exists(select 1 from handovers where shipment_id=s.id);
