---
description: "Record the operator's dispatch decision after a sound dispatch inspection and clean checks."
---

# release

Record the operator's dispatch decision after a sound dispatch inspection and clean checks.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- release <shipment> --by="<reviewer>" --reason="<release basis>"
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
