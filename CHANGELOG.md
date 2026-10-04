# Changelog

## 6.0.0

### Evidence
- Added exact primary evidence for general Twelve-Duty classification from `御定星歷考原 卷五`.
- Added exact primary evidence for the multi-factor selection principle.
- Added official Vietnamese historical context records for Hiệp Kỷ / Khâm Thiên Giám.
- Added `PRODUCT_POLICY` evidence level.

### Recommendation
- Added `activity-composition-v2` with support/caution/veto signals.
- Numeric ranking is now `tie-break-only`.
- General day verdict moved to `general-day-composition-v1`.
- Implementation advisory remains display-only.

### Safety & provenance
- Product policy cannot inherit strong-claim status from primary supporting evidence.
- Pre-modern UTC+7 lunar calculations are explicitly marked historical/proleptic.
- Day and activity recommendations include SHA-256 reproducibility fingerprints.
- Gemini guardrails explicitly preserve policy/evidence/historical distinctions.

### Verification
- Added 12 primary duty golden cases.
- Added 96 activity-duty composition regression combinations.
- Added multi-year property audit to CI.
- Knowledge validator now checks 12-duty corpus, 8 activity policies and matrix drift.

### API
- Added `GET /api/duty-classification`.
- Added `GET /api/activity-policies`.
- Health/meta expose V6 decision and ranking policy IDs.
