---
description: "Run record checks and distinguish CTU guidance from local controls."
---

# compliance

Run record checks and distinguish CTU guidance from local controls.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- compliance
```

Read docs/compliance.md first. These checks examine records and do not certify cargo safety.
Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
