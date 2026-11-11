---
description: "List record checks, overdue issues, stale inspections and missing handovers."
---

# attention

List record checks, overdue issues, stale inspections and missing handovers.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- attention
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
