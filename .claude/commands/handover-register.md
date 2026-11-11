---
description: "Read who handed cargo to whom and which receipt records it."
---

# handover-register

Read who handed cargo to whom and which receipt records it.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- handover-register
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
