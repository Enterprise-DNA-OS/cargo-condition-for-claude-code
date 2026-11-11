---
description: "Add a real shipment from the operator's facts."
---

# add

Add a real shipment from the operator's facts.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- add shipment <code> "<cargo>" --customer="<customer>" --carrier="<carrier>" --site="<site>" --units=<count> --seal="<expected seal>"
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
