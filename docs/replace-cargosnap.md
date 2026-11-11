# Move Cargosnap form records into your own database

The free importer reads Cargosnap's exported form submissions, in XLSX or CSV. Each installation defines its own questions. There is no universal Cargosnap inspection column layout. Use a mapping for your actual form; never rename uncertain values to make a dry run pass.

## Export at the source

Cargosnap's [form export instructions](https://help.cargosnap.com/how-to-export-your-submitted-forms-to-excel), checked 11 November 2026: open Forms, choose the form title, then Export to Excel. Each question becomes a column. The documented date range limit is 30 days per export; export consecutive periods for older history.

Its [data export guide](https://help.cargosnap.com/how-to-download-and-export-your-data-from-cargosnap) distinguishes form results from whole files and workflows. Download photographs separately. Complete file, workflow and media extraction uses its API and needs separate mapping. The free importer does not claim to ingest that API format or to recreate its mobile workflows.

## Map once, import in one command

Place private exports under `imports/`. Map semantic fields to the exact question headings:

```json
{"shipment":"Load reference","inspection":"Submission reference","at":"Recorded UTC","by":"Checked by","condition":"Cargo condition","units":"Packages counted"}
```

The remaining default headings and all required fields appear in `tests/fixtures/form.csv`, a fictional operator-defined form, not a captured vendor workbook. Required: shipment reference, cargo description, customer, carrier, site, expected units, inspection reference, inspected-at timestamp with offset, stage (receipt/packing/dispatch), inspector, condition (sound/damaged/unchecked), observed units. Optional: expected seal, observed seal, notes.

If a form lacks an inspection identifier, add a stable source reference to a working copy after checking it against the original submission. If a timestamp is local, confirm its timezone before adding an offset. Keep the original export. Explicit Excel Date cells are read as UTC dates; prefer unambiguous text timestamps with an offset. No missing fields are silently invented.

```bash
npm run migrate
npm run cargo -- import cargosnap imports/receiving.xlsx --map=imports/mapping.json --dry-run
npm run cargo -- import cargosnap imports/receiving.xlsx --map=imports/mapping.json
```

Use `--sheet="Form results"` if the desired sheet is not first. Save a worksheet as UTF-8 CSV if desired. Formula cells are rejected; export their reviewed values instead. The dry run executes all checks inside a transaction then rolls back. A bad row rolls back the entire import. An identical inspection is skipped; changed content for an existing inspection reference is rejected. Add a correction with a new reference and explain it in Notes. Conflicting shipment details are rejected.

Every original column is retained in `raw_answers`. The import ledger holds the workbook hash, mapping and row counts. Compare those counts and the condition round with the original before moving on.

## Bring the evidence and open issues

Download photos using the vendor's export guide. Attach each to the correct imported inspection with `npm run cargo -- attach <inspection> <file> --by="Name" --at=<capture-time-with-offset>`. The file is copied locally and hashed. `verify-evidence` checks it later. Add open issues and handover receipt references from reviewed source records. Excel form results alone do not contain all these records.

## Verify and retain an exit copy

Run `condition-round`, `missing-evidence`, `compliance` and `import-history`. Match record references, counts and seals against your Cargosnap exports. Run `npm run cargo -- export exports/first-reconciled-copy` to retain all database records, audit history and local evidence. Missing evidence is reported in the result. This is a portable data package; restoring a database backup is a separate operation.

Enterprise DNA maps your forms, downloads and reconciles the agreed history, and builds capture screens or integrations into your version. No claim of a full Cargosnap replacement or a one-day complete workflow migration is made by this form importer.
