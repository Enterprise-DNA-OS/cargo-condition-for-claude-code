# Cargo Condition for Claude Code

Cargo condition, seal checks, damage evidence and handover records in a database you own. Free MIT-licensed software from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Clone, install and own it. [Quick start](#quick-start). | Your forms, release rules, capture screens and Cargosnap history mapped across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=cargosnap). | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=cargosnap). |

## What it does

Run the receiving desk, record completed inspections, attach local evidence, allocate issues and prepare handover records. Inspections are immutable; corrections are new records. A release needs clean record checks, a sound dispatch inspection and a named reviewer. No email, payment, customer portal or external write runs from this repository.

This is the records and review part of a Cargosnap replacement. The free base imports exported form results. Cargosnap's mobile capture, offline workflows and customer portal require a customised implementation. Keep your capture process until that replacement has been tested. Not affiliated with or endorsed by Cargosnap.

## Quick start

Node 20 or later. A disposable demo needs no account or server.

```bash
git clone https://github.com/Enterprise-DNA-OS/cargo-condition-for-claude-code.git
cd cargo-condition-for-claude-code
npm install
npm test
npm run demo
npm run cargo -- condition-round
npm run view
npm run docs
```

Demo records use fictional businesses and relative dates, so there is always something overdue. `npm run demo` is idempotent. For production, migrate a separate empty database without seeding. Set `DATABASE_URL` for Postgres, or use embedded PGlite. No extensions are required. Hosted anonymous access is blocked by row security. Use a restricted, trusted database operator; this is not a multi-user authorisation service.

Open the folder in your coding agent and ask for the condition round. Every recipe lives under `.claude/commands`; AGENTS.md routes other runtimes to the same instructions.

## Commands

| `/shipments` | List the cargo, customer, carrier, site and release state. |
| `/inspections` | Read all inspections in time order. |
| `/condition-round` | Run the receiving condition round: counts, seals and open issues. |
| `/seal-check` | List seals that differ or have not been checked. |
| `/count-variances` | List receipts whose observed units differ from expected units. |
| `/damage-review` | Review every damaged inspection, including evidence coverage. |
| `/issues` | Read issues and their owners. |
| `/issues-due` | Review open issues due in the next seven days, including overdue ones. |
| `/owner-workload` | Compare open and overdue issues by owner. |
| `/carrier-review` | Review carrier damage records alongside unresolved issues. |
| `/site-review` | Compare the latest cargo condition across sites. |
| `/handover-register` | Read who handed cargo to whom and which receipt records it. |
| `/missing-evidence` | Find damage records without attachments. |
| `/stale-cargo` | Find open cargo whose last inspection is over seven days old. |
| `/attention` | List record checks, overdue issues, stale inspections and missing handovers. |
| `/compliance` | Run record checks and distinguish CTU guidance from local controls. |
| `/release-board` | Review open shipments before dispatch. |
| `/import-history` | Read import source hashes and counts. |
| `/shipment` | Read the complete history of one shipment. |
| `/inspection` | Read one immutable inspection and its evidence. |
| `/add` | Add a real shipment from the operator's facts. |
| `/inspect` | Record a completed receipt, packing or dispatch inspection. |
| `/issue` | Assign an exception to an owner with a due date. |
| `/resolve` | Record how an issue was resolved. Damage needs a linked attachment. |
| `/attach` | Copy local evidence into protected storage and record its hash. |
| `/verify-evidence` | Check that every stored attachment still matches its recorded hash. |
| `/release` | Record the operator's dispatch decision after a sound dispatch inspection and clean checks. |
| `/handover` | Record an actual handover receipt for released cargo. |
| `/log` | Append an operational note without changing inspection history. |
| `/audit` | Read recorded changes for a shipment. |
| `/weekly-review` | Write the Monday receiving and claims review from three reads. |
| `/draft-claim` | Create a draft factual damage evidence summary for review. |
| `/draft-handover` | Create a draft handover record for review. |
| `/import` | Import Cargosnap form results using the actual form headings. |
| `/export` | Export all records, audit history and locally held evidence to a new folder. |
| `/customise` | Add a field, rule or workflow with a migration and tests. |
| `/new-view` | Add a read-only branded report. |

The one CLI is `npm run cargo -- <command>`. Add `--json` for machine-readable output. References accept case-insensitive exact codes, unique prefixes, IDs and shipment name fragments. Ambiguity lists the candidates and exits 1. Commands are documented in their recipes; `npm run cargo -- --help` lists them.

## Ten questions to ask

These combine the local records and your own rules. They are executable questions, not a claim that Cargosnap cannot build similar reports.

1. Which shipments have an unexplained seal difference? `seal-check`
2. Which receipts are short against the expected count? `count-variances`
3. Which damaged inspections still have no evidence attachment? `missing-evidence`
4. Which owner has the most overdue cargo issues? `owner-workload`
5. Which carrier has damage records and unresolved issues together? `carrier-review`
6. Which site has the most seal mismatches? `site-review`
7. Which open shipments have not been inspected for a week? `stale-cargo`
8. Which shipments are waiting on a sound dispatch inspection? `release-board`
9. Who accepted each recorded handover and what is its receipt reference? `handover-register`
10. What needs attention before the receiving desk closes today? `attention`

## Your first hour: ten things to ask for

1. Put our name, colours and logo in brand.json.
2. Map our actual Cargosnap form questions without dropping any answers.
3. Import one reviewed month and compare submission counts.
4. Attach the original photographs to the matching inspections.
5. Add our issue owners and review deadlines.
6. Add the condition grades our receiving team uses.
7. Require a temperature reading for the products that need one.
8. Add a customer reference to our handover record.
9. Make a read-only view for one warehouse.
10. Set up a shared database and backups for records and evidence together.

## Switching and evidence

[Moving from Cargosnap](docs/replace-cargosnap.md) explains XLSX and CSV mapping, the vendor's 30-day form export window and the limits of form-only imports. [Record checks](docs/compliance.md) cites the CTU Code and labels local policies separately. [Why no front end](docs/why-no-front-end.md) explains the capture workflow.

Evidence is copied to `.data/files`, with SHA-256 hashes stored in the database. `CARGO_FILES_DIR` changes that location. Exports include records, audit history and locally stored evidence. An administrator can alter the database: these records are not an independently certified chain of custody or electronic signature. Private imports, exports, drafts and generated reports are ignored by Git.

## Documents and views

`npm run docs` renders a condition report and handover record for each shipment, with the business name, colours and optional logo in brand.json. `npm run view` creates the receiving desk and weekly cargo quality review. Outputs are read-only HTML, suitable for printing. Draft claims are factual evidence summaries only, never liability findings, and nothing sends.

## Tests

`npm test` uses a temporary PGlite database and evidence folder, applies migrations twice, seeds twice, exercises every CLI operation, imports real XLSX containers generated from fictional forms, and verifies rollback, ambiguous references, duplicate protection, release controls, audit history, evidence hashes, exports and rendered documents. The same Node test runner runs in Windows and Linux CI. A separate PostgreSQL CI job uses the same migrations and checks.

## Installed for you

Enterprise DNA builds and operates your version through Omni by Enterprise DNA. Your fields, your rules, your records brought across. One setup fee, then a retainer. [Book Sam's 30-minute call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=cargosnap).

## Licence

MIT. Copyright 2026 Enterprise DNA.
