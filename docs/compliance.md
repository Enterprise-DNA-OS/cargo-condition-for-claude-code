# Cargo record checks and their sources

Checked 11 November 2026. Scope: condition and handover evidence for general cargo. The free base is not a dangerous-goods declaration, customs filing, load-restraint calculation, inspection certificate, insurer decision or legal liability assessment.

The [IMO CTU Code overview](https://www.imo.org/en/ourwork/safety/pages/ctu-code.aspx) describes a non-mandatory global code covering packing and handling. The [CTU Code text](https://assets.ippc.int/static/media/files/publication/en/2022/01/CTU_Code_January_2014.pdf), sections 8.2.2, 12.1.1 and 12.1.2, covers condition checks and seal verification. Use the actual transport contract and applicable local law for your operation. The software checks whether records exist, not whether an inspection was competently performed.

| Rule | Check | Basis |
|---|---|---|
| CTU-CONDITION | A latest inspection exists and its condition is checked | Chapters 8 and 12 of CTU Code; an evidence completeness check |
| CTU-SEAL | Recorded observed seal equals the recorded expected seal, when a seal is expected | Chapter 12 receipt checks; blank expected seal means no seal check configured, not a declaration of exemption |
| DAMAGE-RECORD | Latest damaged inspection has a linked attachment | Local evidence policy supporting damage documentation; the Code does not prescribe this software's attachment count |
| COUNT-VARIANCE | Observed units equal expected units | Local receiving policy, not a statutory threshold |
| OPEN-ISSUE | No unresolved issue before release | Local release policy |

A dispatch release additionally needs a latest inspection at dispatch with sound condition, plus a named reviewer and reason. A stale-cargo flag uses a local seven-day review threshold. Issue deadlines are supplied by the operator; no statutory claim time limit is inferred. Handover records store the accepting person's name and a receipt reference; they do not authenticate that person or apply an electronic signature.

`verify-evidence` compares bytes with recorded SHA-256 hashes. A match proves consistency with the stored hash, not who captured the original photograph or whether its contents are true. The audit history is append-only for ordinary writes, but a database administrator retains control. Back up the database and evidence folder together.
