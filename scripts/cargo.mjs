#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/format.mjs';
import { page, table as htmlTable, writeOut } from './lib/render.mjs';

export const reads = {
 shipments: 'select code,name,customer,carrier,site,expected_units,status from shipments order by code',
 inspections: 'select i.code,s.code shipment,i.stage,i.inspected_at,i.condition,i.inspector,i.units,i.notes from inspections i join shipments s on s.id=i.shipment_id order by i.inspected_at desc,i.code',
 'condition-round': 'select code,site,inspection,condition,units,expected_units,seal_check,evidence_count,open_issues from v_condition order by code',
 'seal-check': "select code,inspection,expected_seal,seal_observed,seal_check from v_condition where seal_check in ('mismatch','missing') order by code",
 'count-variances': 'select code,inspection,units,expected_units,units-expected_units variance from v_condition where units<>expected_units order by code',
 'damage-review': "select s.code shipment,i.code inspection,i.inspected_at,i.notes,(select count(*)::int from evidence e where e.inspection_id=i.id) evidence_count from inspections i join shipments s on s.id=i.shipment_id where i.condition='damaged' order by i.inspected_at desc",
 issues: 'select code,shipment,kind,severity,owner,due_on,status from v_issue_queue order by due_on,code',
 'issues-due': "select code,shipment,kind,owner,due_on,days_overdue from v_issue_queue where status='open' and due_on<=current_date+7 order by due_on,code",
 'owner-workload': "select owner,count(*)::int open_issues,count(*) filter(where due_on<current_date)::int overdue from issues where status='open' group by owner order by overdue desc,owner",
 'carrier-review': "select s.carrier,count(distinct s.id)::int shipments,count(distinct i.id) filter(where i.condition='damaged')::int damaged_inspections,count(distinct x.id) filter(where x.status='open')::int open_issues from shipments s left join inspections i on i.shipment_id=s.id left join issues x on x.shipment_id=s.id group by s.carrier order by s.carrier",
 'site-review': "select site,count(*)::int shipments,count(*) filter(where condition='damaged')::int latest_damaged,count(*) filter(where seal_check='mismatch')::int seal_mismatches,sum(open_issues)::int open_issues from v_condition group by site order by site",
 'handover-register': 'select s.code shipment,h.from_party,h.to_party,h.happened_at,h.accepted_by,h.receipt_ref from handovers h join shipments s on s.id=h.shipment_id order by h.happened_at desc',
 'missing-evidence': "select s.code shipment,i.code inspection,i.notes from inspections i join shipments s on s.id=i.shipment_id where i.condition='damaged' and not exists(select 1 from evidence e where e.inspection_id=i.id) order by i.code",
 'stale-cargo': "select code,inspection,inspected_at,site from v_condition where status='open' and inspected_at<now()-interval '7 days' order by inspected_at",
 attention: 'select * from v_attention order by shipment,kind,detail',
 compliance: 'select shipment,rule,finding,basis from v_compliance order by shipment,rule,finding',
 'release-board': "select code,site,stage,condition,seal_check,open_issues from v_condition where status='open' order by code",
 'import-history': 'select filename,sha256,rows_imported,rows_skipped,created_at from import_batches order by created_at desc',
};
export const tables=['shipments','inspections','evidence','issues','handovers','notes','import_batches','audit_log'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const storage=()=>path.resolve(process.env.CARGO_FILES_DIR||path.join(REPO_ROOT,'.data/files'));
function evidenceOk(e){const file=path.join(storage(),e.sha256);return fs.existsSync(file)&&sha(fs.readFileSync(file))===e.sha256;}

function argsOf(args){const pos=[],flags={};for(const a of args){if(!a.startsWith('--'))pos.push(a);else {const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in flags)throw Error('Duplicate flag: '+k);flags[k]=i<0?true:a.slice(i+1);}}return {pos,flags};}
function required(f,k){if(typeof f[k]!=='string'||!f[k].trim())throw Error('Required --'+k+'=value');return f[k].trim();}
function integer(v,name){if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error(name+' must be a nonnegative whole number');return Number(v);}
function day(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a real YYYY-MM-DD date');return v;}
function timestamp(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Timestamp requires ISO date, time and explicit Z or offset');day(v.slice(0,10));return new Date(v).toISOString();}
function historical(v){const t=timestamp(v);if(Date.parse(t)>Date.now()+60000)throw Error('Inspection, evidence and handover times cannot be in the future');return t;}
function value(v,choices,name){if(!choices.includes(v))throw Error(name+' must be '+choices.join('|'));return v;}
async function resolve(db,kind,key){if(!['shipments','inspections','issues'].includes(kind)||!key)throw Error('Record reference is required');const rows=await db.query(`select * from ${kind} where lower(code)=lower($1) or id::text=$1`,[key]);if(rows.length)return rows[0];const found=await db.query(`select * from ${kind} where starts_with(lower(code),lower($1)) or starts_with(id::text,lower($1)) ${kind==='shipments'?'or strpos(lower(name),lower($1))>0':''} order by code`,[key]);if(found.length!==1)throw Error(found.length?'Ambiguous '+kind+': '+found.map(r=>r.code).join(', '):'No matching '+kind+': '+key);return found[0];}
async function txn(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function active(db,key){const found=await resolve(db,'shipments',key);const s=(await db.query('select * from shipments where id=$1 for update',[found.id]))[0];if(s.status!=='open')throw Error('Shipment already released');return s;}
async function detail(db,key){const s=await resolve(db,'shipments',key);return {shipment:[s],inspections:await db.query('select * from inspections where shipment_id=$1 order by inspected_at',[s.id]),issues:await db.query('select * from v_issue_queue where shipment=$1 order by code',[s.code]),evidence:await db.query('select e.name,e.sha256,e.stored_path,e.bytes,e.captured_at,e.added_by from evidence e join inspections i on i.id=e.inspection_id where i.shipment_id=$1 order by e.created_at',[s.id]),handovers:await db.query('select from_party,to_party,happened_at,accepted_by,receipt_ref,notes from handovers where shipment_id=$1 order by happened_at',[s.id]),notes:await db.query('select author,body,created_at from notes where shipment_id=$1 order by created_at',[s.id])};}
async function inspect(db,s,code,f,raw={}){
 if(!code)throw Error('Inspection reference required');
 return db.query(`insert into inspections(code,shipment_id,inspected_at,stage,inspector,condition,seal_observed,expected_seal,units,expected_units,notes,raw_answers) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning code,stage,condition,units`,[code,s.id,historical(required(f,'at')),value(required(f,'stage'),['receipt','packing','dispatch'],'stage'),required(f,'by'),value(required(f,'condition'),['sound','damaged','unchecked'],'condition'),f.seal||'',s.expected_seal,integer(required(f,'units'),'units'),s.expected_units,f.notes||'',JSON.stringify(raw)]);
}
const defaults={shipment:'Shipment reference',name:'Cargo description',customer:'Customer',carrier:'Carrier',site:'Site',expected_units:'Expected units',expected_seal:'Expected seal',inspection:'Inspection reference',at:'Inspected at',stage:'Stage',by:'Inspector',condition:'Condition',units:'Observed units',seal:'Observed seal',notes:'Notes'};
async function importForms(db,file,flags){
 if(!file)throw Error('Provide an exported XLSX or CSV file');
 const mapping={...defaults,...(flags.map?JSON.parse(fs.readFileSync(flags.map,'utf8')):{})};
 for(const [k,v] of Object.entries(mapping))if(!(k in defaults)||typeof v!=='string')throw Error('Unknown mapping field or invalid heading: '+k);
 const bytes=fs.readFileSync(file);let rows;
 if(/\.xlsx$/i.test(file)){
  const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
  const sheet=flags.sheet?book.getWorksheet(flags.sheet):book.worksheets[0];if(!sheet)throw Error('Worksheet not found');
  const headers=[];sheet.getRow(1).eachCell({includeEmpty:true},(c,i)=>{headers[i-1]=c.text.trim();});
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('Excel headings must be unique and nonempty');
  rows=[];sheet.eachRow((row,n)=>{if(n===1)return;const out={};headers.forEach((h,i)=>{const c=row.getCell(i+1);if(c.type===ExcelJS.ValueType.Formula)throw Error('Formula cells are unsupported; export values before import');out[h]=c.value instanceof Date?c.value.toISOString():c.text;});rows.push(out);});
 }else if(/\.csv$/i.test(file)) rows=parseCsv(bytes.toString('utf8'));else throw Error('Only .xlsx and .csv form exports are supported');
 if(!rows.length)throw Error('No form submissions found');
 const get=(r,k)=>{const h=mapping[k];const found=Object.keys(r).find(x=>x.toLowerCase()===h.toLowerCase());return found===undefined?'':String(r[found]).trim();};
 return txn(db,async()=>{let imported=0,skipped=0;for(let n=0;n<rows.length;n++){
  try{
   const r=rows[n],v=Object.fromEntries(Object.keys(defaults).map(k=>[k,get(r,k)]));
   for(const k of ['shipment','name','customer','carrier','site','expected_units','inspection','at','stage','by','condition','units'])if(!v[k])throw Error('Missing '+k+' (map its form question with --map)');
   integer(v.expected_units,'expected units');integer(v.units,'units');historical(v.at);
   const old=(await db.query('select raw_answers from inspections where code=$1',[v.inspection]))[0];
   if(old){const equal=(await db.query('select $1::jsonb=$2::jsonb same',[JSON.stringify(old.raw_answers),JSON.stringify(r)]))[0].same;if(!equal)throw Error('Existing inspection differs; use a new correction reference');skipped++;continue;}
   let s=(await db.query('select * from shipments where code=$1 for update',[v.shipment]))[0];
   if(!s)s=(await db.query('insert into shipments(code,name,customer,carrier,site,expected_units,expected_seal) values($1,$2,$3,$4,$5,$6,$7) returning *',[v.shipment,v.name,v.customer,v.carrier,v.site,Number(v.expected_units),v.expected_seal]))[0];
   if(s.status!=='open')throw Error('Shipment already released');
   for(const k of ['name','customer','carrier','site','expected_units','expected_seal'])if(String(s[k])!==v[k])throw Error('Shipment field conflicts: '+k);
   await inspect(db,s,v.inspection,v,r);imported++;
  }catch(e){throw Error('Form row '+(n+2)+': '+e.message);}
 }
 await db.query('insert into import_batches(filename,sha256,rows_imported,rows_skipped,mapping) values($1,$2,$3,$4,$5)',[path.basename(file),sha(bytes),imported,skipped,JSON.stringify(mapping)]);
 return [{mode:flags['dry-run']?'dry run, rolled back':'imported',rows_imported:imported,rows_skipped:skipped}];},Boolean(flags['dry-run']));
}
export async function run(db,args){
 const {pos,flags:f}=argsOf(args);const [cmd,key,third,...rest]=pos;
 const allowed={add:['customer','carrier','site','units','seal'],inspect:['at','stage','by','condition','seal','units','notes'],issue:['inspection','kind','description','owner','due','severity'],resolve:['resolution','by'],attach:['by','at'],release:['by','reason'],handover:['from','to','at','by','receipt','notes'],log:['by','text'],import:['map','sheet','dry-run']};
 for(const k of Object.keys(f))if(!['json','help',...(allowed[cmd]||[])].includes(k))throw Error('Unknown flag for '+cmd+': --'+k);

 if(!cmd||cmd==='help'||f.help)return [{commands:[...Object.keys(reads),'shipment','inspection','add','inspect','issue','resolve','attach','verify-evidence','release','handover','log','weekly-review','draft-claim','draft-handover','import','export','audit'].join(', '),usage:'npm run cargo -- <command> [reference] [--flag=value] [--json]'}];
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='shipment')return detail(db,key);
 if(cmd==='inspection'){const i=await resolve(db,'inspections',key);return {inspection:[i],evidence:await db.query('select * from evidence where inspection_id=$1',[i.id])};}
 if(cmd==='weekly-review')return {attention:await run(db,['attention']),owners:await run(db,['owner-workload']),carriers:await run(db,['carrier-review'])};
 if(cmd==='add'){
  if(key!=='shipment'||!third||!rest[0])throw Error('add shipment CODE "Cargo description" --customer= --carrier= --site= --units=');
  return db.query('insert into shipments(code,name,customer,carrier,site,expected_units,expected_seal) values($1,$2,$3,$4,$5,$6,$7) returning code,name,status',[third,rest.join(' '),required(f,'customer'),required(f,'carrier'),required(f,'site'),integer(required(f,'units'),'units'),f.seal||'']);
 }
 if(cmd==='inspect')return txn(db,async()=>inspect(db,await active(db,key),third,f));
 if(cmd==='issue')return txn(db,async()=>{const s=await active(db,key);if(!third)throw Error('Issue code required');const i=f.inspection?await resolve(db,'inspections',f.inspection):null;return db.query('insert into issues(code,shipment_id,inspection_id,kind,description,owner,due_on,severity) values($1,$2,$3,$4,$5,$6,$7,$8) returning code,owner,due_on,status',[third,s.id,i?.id||null,value(required(f,'kind'),['damage','shortage','seal','documentation','other'],'kind'),required(f,'description'),required(f,'owner'),day(required(f,'due')),value(required(f,'severity'),['low','medium','high'],'severity')]);});
 if(cmd==='resolve')return txn(db,async()=>{const i=await resolve(db,'issues',key);if(i.status==='resolved')throw Error('Issue already resolved');if(i.kind==='damage'){const files=await db.query('select sha256 from evidence where inspection_id=$1',[i.inspection_id]);if(!files.length||files.some(e=>!evidenceOk(e)))throw Error('Damage resolution requires evidence with matching file hashes on its linked inspection');}return db.query("update issues set status='resolved',resolution=$2,resolved_by=$3,resolved_at=now() where id=$1 returning code,status,resolution",[i.id,required(f,'resolution'),required(f,'by')]);});
 if(cmd==='attach'){
  const i=await resolve(db,'inspections',key);const by=required(f,'by'),at=historical(required(f,'at'));if(!third)throw Error('Local evidence file required');const b=fs.readFileSync(third),hash=sha(b);const old=await db.query('select name,sha256 from evidence where inspection_id=$1 and sha256=$2',[i.id,hash]);if(old.length)return old;
  fs.mkdirSync(storage(),{recursive:true,mode:0o700});fs.writeFileSync(path.join(storage(),hash),b,{flag:'w',mode:0o600});
  return db.query('insert into evidence(inspection_id,name,stored_path,sha256,bytes,captured_at,added_by) values($1,$2,$3,$4,$5,$6,$7) returning name,sha256,bytes',[i.id,path.basename(third),hash,hash,b.length,at,by]);
 }
 if(cmd==='verify-evidence'){const rows=await db.query('select name,stored_path,sha256 from evidence order by name');return rows.map(r=>{const file=path.join(storage(),r.sha256);return {name:r.name,sha256:r.sha256,check:!fs.existsSync(file)?'missing':sha(fs.readFileSync(file))===r.sha256?'match':'CHANGED'};});}
 if(cmd==='release')return txn(db,async()=>{
  const s=await active(db,key);await db.query('select id from shipments where id=$1 for update',[s.id]);
  const evidence=await db.query('select e.sha256 from evidence e join inspections i on i.id=e.inspection_id where i.shipment_id=$1',[s.id]);if(evidence.some(e=>!evidenceOk(e)))throw Error('Release blocked: evidence file missing or changed');
  const checks=await db.query('select rule,finding from v_compliance where shipment_id=$1',[s.id]);if(checks.length)throw Error('Release blocked: '+checks.map(x=>x.rule).join(', '));
  const i=(await db.query('select * from v_latest_inspection where shipment_id=$1',[s.id]))[0];if(i.stage!=='dispatch'||i.condition!=='sound')throw Error('A sound dispatch inspection is required');
  await db.query('insert into notes(shipment_id,author,body) values($1,$2,$3)',[s.id,required(f,'by'),'Release: '+required(f,'reason')]);
  return db.query("update shipments set status='released' where id=$1 returning code,status",[s.id]);
 });
 if(cmd==='handover')return txn(db,async()=>{const s=await resolve(db,'shipments',key);if(s.status!=='released')throw Error('Release the shipment before recording handover');return db.query('insert into handovers(shipment_id,from_party,to_party,happened_at,accepted_by,receipt_ref,notes) values($1,$2,$3,$4,$5,$6,$7) returning receipt_ref,to_party,happened_at',[s.id,required(f,'from'),required(f,'to'),historical(required(f,'at')),required(f,'by'),required(f,'receipt'),f.notes||'']);});
 if(cmd==='log'){const s=await resolve(db,'shipments',key);return db.query('insert into notes(shipment_id,author,body) values($1,$2,$3) returning author,body',[s.id,required(f,'by'),required(f,'text')]);}
 if(cmd==='audit'){const s=await resolve(db,'shipments',key);return db.query("select entity,operation,created_at,before_record,after_record from audit_log where record_id=$1 or after_record->>'shipment_id'=$2 order by created_at,id",[s.id,s.id]);}
 if(cmd==='draft-claim'||cmd==='draft-handover'){
  const d=await detail(db,key);const title=cmd==='draft-claim'?'DRAFT: cargo condition evidence summary':'DRAFT: cargo handover record';const html=page({title,subtitle:d.shipment[0].code+' | Review before sharing. No liability conclusion or signature certification.',sections:Object.entries(d).map(([title,rows])=>({title,html:htmlTable(rows.map(({id,shipment_id,raw_answers,...r})=>r))}))});
  return [{draft:writeOut('drafts',cmd+'-'+d.shipment[0].id,html),status:'draft only; nothing sent'}];
 }
 if(cmd==='import'){if(key!=='cargosnap')throw Error('import cargosnap <form.xlsx|form.csv> [--map=mapping.json] [--dry-run]');return importForms(db,third,f);}
 if(cmd==='export'){
  if(!key)throw Error('export <new directory>');const out=path.resolve(key);if(fs.existsSync(out))throw Error('Export directory already exists; use a new one');
  const snapshot=await txn(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');const result={};for(const t of tables)result[t]=await db.query(`select * from ${t} order by id`);return result;});
  fs.mkdirSync(out,{recursive:true,mode:0o700});fs.writeFileSync(path.join(out,'records.json'),JSON.stringify({format:'cargo-condition-v1',exported_at:new Date().toISOString(),records:snapshot},null,2),{mode:0o600});fs.mkdirSync(path.join(out,'evidence'),{mode:0o700});const missing=[];for(const e of snapshot.evidence){const src=path.join(storage(),e.sha256);if(fs.existsSync(src))fs.copyFileSync(src,path.join(out,'evidence',e.sha256));else missing.push(e.sha256);}return [{directory:out,records:Object.values(snapshot).reduce((n,r)=>n+r.length,0),missing_evidence:missing}];
 }
 throw Error('Unknown command: '+cmd);
}
export function display(result){if(Array.isArray(result)){const rows=result.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString():v&&typeof v==='object'?JSON.stringify(v):v])));return table(rows,rows.length?Object.keys(rows[0]).map(key=>({key,label:key,width:85})):[]);}return Object.entries(result).map(([k,v])=>k+'\n'+display(v)).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));if(process.argv[2]==='verify-evidence'&&result.some(e=>e.check!=='match'))process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
