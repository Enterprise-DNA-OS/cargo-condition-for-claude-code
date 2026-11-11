---
description: "Record a completed receipt, packing or dispatch inspection."
---

# inspect

Record a completed receipt, packing or dispatch inspection.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- inspect <shipment> <new-inspection-code> --at=<ISO-with-offset> --stage=receipt --by="<inspector>" --condition=sound --units=<count> --seal="<observed seal>" --notes="<observations>"
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
