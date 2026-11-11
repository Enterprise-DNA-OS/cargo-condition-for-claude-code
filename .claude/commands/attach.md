---
description: "Copy local evidence into protected storage and record its hash."
---

# attach

Copy local evidence into protected storage and record its hash.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- attach <inspection> "<local-file>" --by="<operator>" --at=<capture-time-with-offset>
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
