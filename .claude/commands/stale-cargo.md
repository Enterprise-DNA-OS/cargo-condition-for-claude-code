---
description: "Find open cargo whose last inspection is over seven days old."
---

# stale-cargo

Find open cargo whose last inspection is over seven days old.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- stale-cargo
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
