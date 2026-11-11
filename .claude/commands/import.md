---
description: "Import Cargosnap form results using the actual form headings."
---

# import

Import Cargosnap form results using the actual form headings.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- import cargosnap "<form-export.xlsx>" --map="<mapping.json>" --dry-run
npm run cargo -- import cargosnap "<form-export.xlsx>" --map="<mapping.json>"
```

Read docs/replace-cargosnap.md. Compare the workbook headings with the mapping; never invent missing timestamps, counts or identifiers. A dry run validates every row and rolls back. Reconcile submissions by reference before and after the import.
Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
