import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ExcelJS from 'exceljs';
import { getDb,REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run,reads,tables } from './cargo.mjs';
import { parseCsv } from './lib/csv.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cargo-test-'));
const pg=process.env.CARGO_TEST_POSTGRES_URL;
if(pg){const u=new URL(pg);assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname==='/cargo_test','Postgres tests require a local disposable cargo_test database');}
process.env.DATABASE_URL=pg||'';
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;process.env.CARGO_FILES_DIR=path.join(temp,'files');
const schema='cargo_smoke_'+process.pid;
if(pg)process.env.PGOPTIONS='-c search_path='+schema;
let db,checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const reject=async(args,re)=>{await assert.rejects(()=>run(db,args),re);checks++;};
const sqlReject=async(sql,re)=>{await assert.rejects(()=>db.exec(sql),re);checks++;};
const count=async t=>Number((await db.query(`select count(*) n from ${t}`))[0].n);
const cli=(args,expected=0)=>{const p=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/cargo.mjs'),...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(p.status,expected,p.stderr||p.stdout);return p;};
const script=(name,args=[])=>{const p=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',name),...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(p.status,0,p.stderr||p.stdout);return p.stdout;};
const now=new Date(Date.now()-1000).toISOString();
const csv=r=>[Object.keys(r[0]).join(','),...r.map(x=>Object.values(x).map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\r\n');
try{
 db=await getDb();if(pg){await db.exec('create schema '+schema);await db.exec('set search_path to '+schema);}
 eq((await migrate(db)).ran.length,2);eq((await migrate(db)).ran.length,0);
 await seed(db);const before=await count('audit_log');await seed(db);eq(await count('audit_log'),before,'seed adds no duplicate history');eq(await count('shipments'),6);eq(await count('inspections'),5);eq(await count('issues'),3);
 for(const cmd of Object.keys(reads))ok(Array.isArray(await run(db,[cmd])),cmd);
 const rules=new Set((await run(db,['compliance'])).map(x=>x.rule));for(const rule of ['CTU-CONDITION','CTU-SEAL','COUNT-VARIANCE','DAMAGE-RECORD','OPEN-ISSUE'])ok(rules.has(rule),rule);
 eq((await run(db,['seal-check'])).map(x=>x.code),['CG101','CG104']);eq((await run(db,['count-variances']))[0].variance,-4);eq((await run(db,['missing-evidence']))[0].inspection,'IN100');
 eq((await run(db,['owner-workload']))[0].owner,'Mia');eq((await run(db,['stale-cargo']))[0].code,'CG102');eq((await run(db,['shipment','ceramic'])).shipment[0].code,'CG100');eq((await run(db,['shipment','cg101'])).inspections.length,1);
 eq((await run(db,['inspection','in100'])).inspection[0].condition,'damaged');
 await reject(['shipment','CG10'],/Ambiguous.*CG100.*CG105/);await reject(['shipment','no such cargo'],/No matching/);await reject(['inspect','CG100','NO','--dry-run'],/Unknown flag/);
 await reject(['release','CG100','--by=Alex','--reason=review'],/Release blocked/);await reject(['release','CG102','--by=Alex','--reason=review'],/dispatch inspection/);await reject(['handover','CG100'],/Release the shipment/);
 await reject(['resolve','IS100','--by=Alex','--resolution=Confirmed'],/requires evidence/);
 await sqlReject("update inspections set condition='sound' where code='IN100'",/immutable/);await sqlReject("delete from inspections where code='IN100'",/retained/);await sqlReject("delete from audit_log",/retained/);
 await reject(['add','shipment','NEW','Demo load','--customer=A','--carrier=B','--site=C','--units=-1'],/nonnegative/);
 await run(db,['add','shipment','NEW100','Demo load','--customer=A','--carrier=B','--site=C','--units=8','--seal=N1']);
 const inspection=['inspect','NEW100','NEW-IN100','--at='+now,'--stage=dispatch','--by=Alex','--condition=sound','--units=8','--seal=N1'];
 await reject(inspection.map(x=>x.startsWith('--at=')?'--at=2025-02-30T00:00:00Z':x),/real/);
 await reject(inspection.map(x=>x.startsWith('--at=')?'--at=2999-01-01T00:00:00Z':x),/future/);
 await reject(inspection.map(x=>x.startsWith('--at=')?'--at=2025-01-01 10:00':x),/explicit/);
 await run(db,inspection);await sqlReject("update shipments set status='released' where code='CG100'",/Record checks/);await reject(['add','shipment','new100','Case duplicate','--customer=A','--carrier=B','--site=C','--units=8'],/duplicate/);
 const issue=['issue','NEW100','NEW-IS100','--inspection=NEW-IN100','--kind=documentation','--description=Receipt to confirm','--owner=Alex','--due=2025-01-01','--severity=medium'];
 await reject(issue.map(x=>x.startsWith('--inspection=')?'--inspection=IN100':x),/another shipment/);eq(await count('issues'),3,'failed issue rolls back');
 await run(db,issue);await reject(['resolve','NEW-IS100','--by=Alex'],/resolution/);
 await run(db,['resolve','NEW-IS100','--by=Alex','--resolution=Receipt checked']);await reject(['resolve','NEW-IS100','--by=Alex','--resolution=Again'],/already resolved/);
 await run(db,['log','NEW100','--by=Alex','--text=Ready for the dispatch review']);
 await run(db,['release','NEW100','--by=Alex','--reason=Condition and receipt checked']);eq((await run(db,['shipment','NEW100'])).shipment[0].status,'released');
 await reject(inspection.map(x=>x==='NEW-IN100'?'NEW-IN101':x),/already released/);await reject(['release','NEW100','--by=Alex','--reason=Again'],/already released/);
 await run(db,['handover','NEW100','--from=Warehouse','--to=Carrier','--at='+now,'--by=Demo driver','--receipt=POD-NEW']);
 eq((await run(db,['shipment','NEW100'])).handovers.length,1);ok((await run(db,['audit','NEW100'])).some(x=>x.operation==='UPDATE'&&x.before_record.status==='open'&&x.after_record.status==='released'));
 const ev=path.join(temp,'condition-note.txt');fs.writeFileSync(ev,'Demo evidence bytes. This is not a photograph.');
 const e=(await run(db,['attach','IN100',ev,'--by=Alex','--at='+now]))[0];await run(db,['attach','IN100',ev,'--by=Alex','--at='+now]);eq(await count('evidence'),1);eq((await run(db,['verify-evidence']))[0].check,'match');
 const stored=path.join(process.env.CARGO_FILES_DIR,e.sha256);fs.writeFileSync(stored,'changed');eq((await run(db,['verify-evidence']))[0].check,'CHANGED');await reject(['resolve','IS100','--by=Alex','--resolution=No evidence'],/matching file hashes/);fs.writeFileSync(stored,fs.readFileSync(ev));
 await run(db,['resolve','IS100','--by=Alex','--resolution=Count agreed and evidence recorded']);
 const fixture=path.join(REPO_ROOT,'tests/fixtures/form.csv');const originalShipments=await count('shipments'),originalAudit=await count('audit_log');
 eq((await run(db,['import','cargosnap',fixture,'--dry-run']))[0].rows_imported,2);eq(await count('shipments'),originalShipments);eq(await count('audit_log'),originalAudit);eq(await count('import_batches'),0);
 const rows=parseCsv(fs.readFileSync(fixture,'utf8'));eq(rows[1].Notes,'One damaged pallet\nEvidence requested');
 const bad=structuredClone(rows);bad[1]['Observed units']='broken';const badFile=path.join(temp,'bad.csv');fs.writeFileSync(badFile,csv(bad));await reject(['import','cargosnap',badFile],/row 3/);eq(await count('shipments'),originalShipments,'earlier valid import rows rolled back');
 await run(db,['import','cargosnap',fixture]);eq(await count('shipments'),originalShipments+2);eq((await run(db,['import','cargosnap',fixture]))[0].rows_skipped,2);
 const changed=structuredClone(rows);changed[0].Notes='Changed after import';fs.writeFileSync(badFile,csv(changed));await reject(['import','cargosnap',badFile],/Existing inspection differs/);
 const workbook=new ExcelJS.Workbook();const ws=workbook.addWorksheet('Submitted forms');const mappedRows=rows.map((r,i)=>({...r,'Shipment reference':'XL'+i,'Inspection reference':'XLI'+i}));
 const heads=Object.keys(mappedRows[0]);ws.addRow(heads.map(h=>h==='Inspector'?'Checked by':h));for(const r of mappedRows)ws.addRow(heads.map(h=>r[h]));const xfile=path.join(temp,'forms.xlsx');await workbook.xlsx.writeFile(xfile);
 const map=path.join(temp,'mapping.json');fs.writeFileSync(map,JSON.stringify({by:'Checked by'}));
 eq((await run(db,['import','cargosnap',xfile,'--map='+map,'--sheet=Submitted forms']))[0].rows_imported,2);
 eq((await run(db,['inspection','XLI0'])).inspection[0].raw_answers['Checked by'],'Demo Inspector');
 await reject(['import','cargosnap',xfile,'--sheet=Missing'],/Worksheet/);
 const formula=new ExcelJS.Workbook();const fw=formula.addWorksheet('Form');fw.addRow(heads);fw.addRow(heads.map(h=>mappedRows[0][h]));fw.getCell('N2').value={formula:'1+1',result:2};const ff=path.join(temp,'formula.xlsx');await formula.xlsx.writeFile(ff);await reject(['import','cargosnap',ff],/Formula cells/);
 const blank=path.join(temp,'empty.csv');fs.writeFileSync(blank,'');await reject(['import','cargosnap',blank],/No form/);await reject(['import','wrong',fixture],/import cargosnap/);
 const exported=(await run(db,['export',path.join(temp,'export')]))[0];eq(exported.missing_evidence,[]);const pack=JSON.parse(fs.readFileSync(path.join(temp,'export/records.json')));eq(Object.keys(pack.records),tables);eq(pack.records.shipments.length,await count('shipments'));eq(fs.readFileSync(path.join(temp,'export/evidence',e.sha256),'utf8'),fs.readFileSync(ev,'utf8'));await reject(['export',path.join(temp,'export')],/already exists/);
 for(const cmd of ['draft-claim','draft-handover']){const out=await run(db,[cmd,'CG100']);const html=fs.readFileSync(out[0].draft,'utf8');ok(html.includes('DRAFT:'));ok(html.includes('CG100'));ok(html.includes('Example Cargo Operations'));}
 ok((await run(db,['weekly-review'])).attention.length>0);ok((await run(db,['help']))[0].commands.includes('handover'));await reject(['nonsense'],/Unknown command/);
 // Close before subprocesses: embedded storage has a single writer.
 await db.close();db=null;
 eq(JSON.parse(cli(['condition-round','--json']).stdout).length,11);
 ok(cli(['shipment','CG10'],1).stderr.includes('Ambiguous'));
 script('view.mjs');script('docs.mjs');
 const view=fs.readFileSync(path.join(temp,'views/receiving-desk.html'),'utf8');ok(view.includes('CG100'));ok(view.includes('Example Cargo Operations'));
 const docs=fs.readdirSync(path.join(temp,'docs-out/condition-report'));eq(docs.length,11);const report=fs.readFileSync(path.join(temp,'docs-out/condition-report',docs.find(x=>x.startsWith('cg100-'))),'utf8');ok(report.includes('Four crushed cartons'));ok(report.includes(e.sha256));ok(!report.includes('<script>'));
 console.log(`PASS: ${checks} checks, ${Object.keys(reads).length} read commands, every mutation, XLSX/CSV import, documents, exports (${pg?'Postgres':'PGlite'})`);
}finally{
 await db?.close();if(pg){const clean=await getDb();try{await clean.exec('drop schema '+schema+' cascade');}finally{await clean.close();}}
 fs.rmSync(temp,{recursive:true,force:true});
}
