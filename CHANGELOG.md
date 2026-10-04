# Changelog

## 7.0.0

### Family
- Added local family registry with automatic V6 single-profile migration.
- Added conservative multi-member personalization with explicit `family-personalization-v1`.
- Saved plans now keep participant IDs; deleted participants are never silently replaced by the active profile.

### Constraints & comparison
- Added `selection-constraints-v1`: weekday/weekend, excluded dates, avoided lunar days and Jie-transition avoidance.
- Added deterministic 2–5 date comparison with `deterministic-date-comparison-v1`.
- Comparison explains whether the winner won by decision band or tie-break score.
- Saved plans persist their own constraints for brief/Telegram/PWA execution.

### Feedback
- Added local server feedback workflow: `agree` / `review`.
- Feedback stores engine/policy IDs and SHA-256 trace hash, not birth data.
- Added feedback history in the profile tab.

### Runtime
- Added family-aware Telegram and PWA push payloads.
- Health/meta/AI status expose family, constraint and comparison policy IDs.
- Evidence corpus remains `evidence-corpus-v6`; V7 is an intelligence/workflow layer, not a source-corpus expansion.

### Verification
- Added family/constraint/compare unit tests.
- Extended multi-year property audit with family planner and comparison invariants.
- Added Playwright coverage for migration, two-member family, constraints, compare and feedback.

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
