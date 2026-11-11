---
description: "Write the Monday receiving and claims review from three reads."
---

# weekly-review

Write the Monday receiving and claims review from three reads.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- attention
npm run cargo -- owner-workload
npm run cargo -- carrier-review
```

Summarise the exceptions, named owners and next steps. Keep unknowns explicit. Draft only; do not send.
Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
