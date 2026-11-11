# Cargo Condition for Claude Code

Read this first in every agent runtime. This is a cargo condition, issue and handover record for a warehouse or shipper. Ask the operator for their business name and role before replacing the fictional demo configuration.

## Rules

- Start answers with the CLI. Read a shipment before changing its state.
- Never invent counts, timestamps, seals, inspections or receipt references.
- Keep customer records private. Never send messages, contact carriers, publish reports or upload evidence from here. Write drafts for a person to review.
- Inspection, evidence, handover and note history is immutable. Append corrections with a new reference; explain the connection in the note.
- Compliance checks are evidence checks, not certification, legal advice or a finding of liability. Read docs/compliance.md before explaining a check.
- Store captured timestamps with an explicit offset. Source workbooks may need timezone clarification.
- Resolve ambiguous references by listing candidates. Never choose the first match.
- Run npm test after code changes. Tests use disposable storage and never touch DATABASE_URL.
- Shared databases require trusted operators and an access design. Row security blocks anonymous access; no hosted API is shipped. A database owner can alter records and audit triggers, so the log is not an externally certified archive.

## One path for each job

| Request | Recipe |
|---|---|
| List the cargo, customer, carrier, site and release state. | `/shipments` |
| Read all inspections in time order. | `/inspections` |
| Run the receiving condition round: counts, seals and open issues. | `/condition-round` |
| List seals that differ or have not been checked. | `/seal-check` |
| List receipts whose observed units differ from expected units. | `/count-variances` |
| Review every damaged inspection, including evidence coverage. | `/damage-review` |
| Read issues and their owners. | `/issues` |
| Review open issues due in the next seven days, including overdue ones. | `/issues-due` |
| Compare open and overdue issues by owner. | `/owner-workload` |
| Review carrier damage records alongside unresolved issues. | `/carrier-review` |
| Compare the latest cargo condition across sites. | `/site-review` |
| Read who handed cargo to whom and which receipt records it. | `/handover-register` |
| Find damage records without attachments. | `/missing-evidence` |
| Find open cargo whose last inspection is over seven days old. | `/stale-cargo` |
| List record checks, overdue issues, stale inspections and missing handovers. | `/attention` |
| Run record checks and distinguish CTU guidance from local controls. | `/compliance` |
| Review open shipments before dispatch. | `/release-board` |
| Read import source hashes and counts. | `/import-history` |
| Read the complete history of one shipment. | `/shipment` |
| Read one immutable inspection and its evidence. | `/inspection` |
| Add a real shipment from the operator's facts. | `/add` |
| Record a completed receipt, packing or dispatch inspection. | `/inspect` |
| Assign an exception to an owner with a due date. | `/issue` |
| Record how an issue was resolved. Damage needs a linked attachment. | `/resolve` |
| Copy local evidence into protected storage and record its hash. | `/attach` |
| Check that every stored attachment still matches its recorded hash. | `/verify-evidence` |
| Record the operator's dispatch decision after a sound dispatch inspection and clean checks. | `/release` |
| Record an actual handover receipt for released cargo. | `/handover` |
| Append an operational note without changing inspection history. | `/log` |
| Read recorded changes for a shipment. | `/audit` |
| Write the Monday receiving and claims review from three reads. | `/weekly-review` |
| Create a draft factual damage evidence summary for review. | `/draft-claim` |
| Create a draft handover record for review. | `/draft-handover` |
| Import Cargosnap form results using the actual form headings. | `/import` |
| Export all records, audit history and locally held evidence to a new folder. | `/export` |
| Change a field or rule | `/customise` |
| Add a read-only dashboard | `/new-view` |

## Files

`scripts/cargo.mjs` is the one CLI, with `--json`. Migrations live in `supabase/migrations`, demo data in `supabase/seed.sql`. `DATABASE_URL` chooses Postgres; otherwise PGlite stores records under `.data/db`. Evidence bytes live under `.data/files` or `CARGO_FILES_DIR`. Exports must stay under ignored `exports/`, and private imports under ignored `imports/`. `npm run docs` and `npm run view` render branded HTML from database records. They never send.

Built and run for you through Omni by Enterprise DNA: https://enterprisedna.co/omni/instead-of/cargosnap
