---
description: "Record how an issue was resolved. Damage needs a linked attachment."
---

# resolve

Record how an issue was resolved. Damage needs a linked attachment.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- resolve <issue> --resolution="<what was done>" --by="<reviewer>"
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
