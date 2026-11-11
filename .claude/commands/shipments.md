---
description: "List the cargo, customer, carrier, site and release state."
---

# shipments

List the cargo, customer, carrier, site and release state.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- shipments
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
