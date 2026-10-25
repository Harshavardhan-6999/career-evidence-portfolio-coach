# Verification and Validation Report

This report records all checks, test runs, and smoke tests actually executed on the system.

**Report Date:** 18 October 2026  
**Local Test Environment:** Windows (Node.js `v24.21.0`, npm `11.19.0`)

---

## 1. Environment & Prerequisite Checks

| Component | Target Requirement | Actual Measured | Status |
|---|---|---|---|
| **Node.js** | `>= 20.0.0` (LTS) | `v24.21.0` | ✅ Verified Pass |
| **npm** | Current npm package manager | `11.19.0` | ✅ Verified Pass |
| **Dependencies** | `@google/genai`, `express`, `dotenv`, `cors` | All installed in `package-lock.json` | ✅ Verified Pass |
| **Git Tooling** | Git in system PATH | `git : The term 'git' is not recognized` | ⚠️ Blocked: Git is not installed in the Windows PATH. As per project integrity rules, no commit history or member activity logs have been fabricated. |

---

## 2. Automated Test Suite (`npm test`)

The automated test suite runs via the built-in Node.js test runner (`node --test tests/**/*.test.js`) and tests isolated temporary files.

### Execution Command:
```powershell
npm test
```

### Actual Verified Output:
```
✔ Storage Module (store.js)
  ✔ initializes empty collections on fresh store
  ✔ serializes transactions and saves modifications atomically
  ✔ detects corrupted JSON and throws StoreCorruptedError without overwriting
  ✔ failed transaction does not permanently deadlock subsequent operations
✔ Validators Module
  ✔ Common Validators (isValidUUID, isValidUrl, isValidDate)
  ✔ User Profile Validators (create, patch, invalid role reference)
  ✔ Evidence Validators (types project/certification/internship, URL validation)
  ✔ Portfolio Validators (duplicate evidence IDs rejection)
  ✔ AI Output Schema and Semantic Boundary Validators (rejecting out-of-scope IDs, invalid priorities)
✔ Users and Evidence Integration Tests
  ✔ POST /api/users creates a user profile
  ✔ GET /api/users/:userId retrieves user with targetRole info
  ✔ PATCH /api/users/:userId updates profile bio and education
  ✔ POST /api/users/:userId/evidence creates project evidence
  ✔ GET /api/users/:userId/evidence lists user evidence items
  ✔ GET /api/users/:userId/evidence/:evidenceId returns single item
  ✔ DELETE /api/users/:userId/evidence/:evidenceId removes record
✔ Skills, Role Gap, and Portfolio Integration Tests
  ✔ setup test users and evidence
  ✔ POST /api/users/:userId/skill-mappings maps catalog skill to evidence
  ✔ POST /api/users/:userId/skill-mappings rejects duplicate mapping with 409
  ✔ POST /api/users/:userId/skill-mappings rejects foreign evidence with 400
  ✔ GET /api/users/:userId/role-gap returns expected coverage and disclaimer
  ✔ PUT /api/users/:userId/portfolio upserts portfolio with ordered evidence
  ✔ GET /api/users/:userId/portfolio assembles portfolio in requested order
  ✔ CASCADE DELETE: deleting evidence purges mapping and updates portfolio
✔ AI and Coaching Integration Tests
  ✔ setup candidate profile and portfolio for coaching
  ✔ AI Skill Analysis endpoint succeeds when AI returns valid schema
  ✔ AI Skill Analysis returns 503 when AI service fails
  ✔ Coaching generates AI feedback when stub returns valid schema
  ✔ Coaching gracefully falls back to labeled rule feedback when AI fails
  ✔ Coaching staleness tracking flags isStale after target role change
✔ Concurrency and Transaction Serialization
  ✔ preserves all concurrent writes without lost updates (15 simultaneous HTTP writes)

ℹ tests 38
ℹ suites 11
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 822.4
```

---

## 3. End-to-End HTTP Smoke Test (`npm run smoke`)

The smoke test boots an ephemeral server on `127.0.0.1:0` and tests complete user journeys using native `fetch`.

### Execution Command:
```powershell
npm run smoke
```

### Actual Verified Output:
- Health check & role/skill catalogs: **3/3 PASS**
- User profile create, retrieve, update: **3/3 PASS**
- Evidence CRUD operations: **4/4 PASS**
- Skill mapping & duplicate prevention (409 Conflict): **4/4 PASS**
- Role gap comparison & educational disclaimer: **1/1 PASS**
- Portfolio upsertion, assembly, and ordering preservation: **2/2 PASS**
- Coaching evaluation & staleness tracking: **2/2 PASS**
- Validation boundaries (missing fields, unknown role, bad URL): **3/3 PASS**
- Portfolio duplicate & cross-user protections (400 Bad Request): **2/2 PASS**
- Malformed JSON body handling (400 INVALID_JSON): **1/1 PASS**
- Cascade deletion (evidence deletion cleans mappings & portfolio): **3/3 PASS**
- Coaching staleness trigger verification: **1/1 PASS**

**Final Count: 29 Passed, 0 Failed.**

---

## 4. Database Seed Script Safety (`npm run seed`)

### Checks Performed:
1. **Fresh Seed:** Populates fictional students (*Aarav Sharma*, *Maya Patel*, *Liam Chen*). Initialized store successfully.
2. **Accidental Overwrite Protection:** Running `node scripts/seed.js` a second time aborted immediately:
   ```
   ⚠️  Existing data detected (3 users, 6 evidence items).
      Seed aborted to prevent accidental data loss.
      To wipe and reseed cleanly, run: npm run seed -- --reset
   ```
3. **Explicit Reset:** Running `npm run seed -- --reset` wiped and re-seeded cleanly.

---

## 5. Live AI Integration Status

### Execution Command:
```powershell
npm run check-ai
```

### Actual Verified Output:
```
🤖 Career Evidence & Portfolio Coach - AI Verification Utility
================================================================
ℹ️  STATUS: GEMINI_API_KEY is NOT set in environment or .env file.

📋 Educational Prototype Information:
   - The backend is currently operating in DETERMINISTIC RULE-BASED MODE.
   - All standard REST APIs (profiles, evidence, skills, role-gap, portfolio) work 100%.
   - Coaching returns transparent, rule-based feedback (source: "rules").
📌 Verification Record: Live AI model verification is PENDING credentials.
```

### Status Summary:
- **Unit & Integration AI Testing:** ✅ Verified via deterministic test stub (`setAiStub`).
- **Rule-Based Fallback:** ✅ Fully verified and functioning.
- **Live Gemini API Connectivity:** ⏳ **PENDING USER CREDENTIALS**. To complete live verification, set `GEMINI_API_KEY` in `.env` and execute `npm run check-ai`.
