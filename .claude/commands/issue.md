---
description: "Assign an exception to an owner with a due date."
---

# issue

Assign an exception to an owner with a due date.

Read CLAUDE.md. Resolve ambiguous references by listing candidates. Read the shipment before any write. Replace placeholders only with operator-provided or recorded facts.

```bash
npm run cargo -- issue <shipment> <new-issue-code> --inspection=<inspection> --kind=damage --description="<facts>" --owner="<owner>" --due=<YYYY-MM-DD> --severity=high
```

Present the result in plain words. Add `--json` for structured results. Never send a draft, contact a carrier, or treat a recorded receipt as a verified signature.
