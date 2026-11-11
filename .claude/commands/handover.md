---
description: "Record an actual handover receipt for released cargo."
---

# handover

Record an actual handover receipt for released cargo.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- handover <shipment> --from="<party>" --to="<party>" --at=<ISO-with-offset> --by="<accepting person>" --receipt="<reference>"
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
