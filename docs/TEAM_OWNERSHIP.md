# Fixed Team Module Ownership & Individual Review Checklists

This document outlines the planned responsibility areas for our 10-member Computer Science capstone team. 

> [!IMPORTANT]
> **Integrity & Attribution Notice:**
> The module mappings below represent designated architectural ownership and demonstration responsibilities for our final capstone defense on 20 October 2026. They do not constitute proof of code authoring or historical work hours. No commit history or member work logs have been fabricated. Each member must complete their personal review checklist before the submission deadline.

---

## Team Responsibility Matrix

| # | Team Member | Roll Number | Primary Responsibility Area | Assigned Files |
|---|---|---|---|---|
| 1 | **N. Tharun Kumar** | `25071A66B8` | Requirements, Role Catalog & Role Gap Analysis | `data/roles.json`, `src/services/roleService.js`, `src/services/roleGapService.js`, `src/controllers/roleController.js`, `src/controllers/roleGapController.js` |
| 2 | **P. Srihith Reddy** | `25071A66B9` | Express Server Setup, Environment & Shared AI Client | `server.js`, `src/app.js`, `.env.example`, `src/ai/aiClient.js`, `src/middleware/errorHandler.js` |
| 3 | **M. Harshavardhan** | `25071A66B1` | JSON Storage, Serialized Writes, IDs & Consistency | `src/storage/store.js`, `data/store.json`, `tests/store.test.js` |
| 4 | **M. Rohit Sai** | `25071A66B2` | User Profile Routes, Controllers & Services | `src/routes/userRoutes.js`, `src/controllers/userController.js`, `src/services/userService.js`, `src/validators/userValidators.js` |
| 5 | **T. Jaswanth** | `25071A66D5` | Evidence Routes, Controllers & Cascade Cleanup | `src/controllers/evidenceController.js`, `src/services/evidenceService.js`, `src/validators/evidenceValidators.js`, `tests/usersAndEvidence.test.js` |
| 6 | **J. Sankarshan** | `25071A6698` | Skill Catalog, Evidence Mappings & AI Skill Extraction | `data/skills.json`, `src/routes/skillRoutes.js`, `src/controllers/skillController.js`, `src/services/skillService.js`, `src/ai/prompts/skillAnalysisPrompt.js` |
| 7 | **T. Nikhil** | `25071A66D6` | Portfolio Selection, Ordering & Assembly | `src/controllers/portfolioController.js`, `src/services/portfolioService.js`, `src/validators/portfolioValidators.js`, `tests/skillsAndPortfolio.test.js` |
| 8 | **R. Suryaprakash** | `25071A66C5` | Coaching Rules, AI Prompt & Feedback Service | `src/services/coachingService.js`, `src/services/rulesCoachingService.js`, `src/controllers/coachingController.js`, `src/ai/prompts/coachingPrompt.js`, `tests/coachingAndAi.test.js` |
| 9 | **P. Sasikanth** | `25071A66C3` | Shared Validators, Automated Tests & Concurrency Defect Checks | `src/validators/commonValidators.js`, `src/validators/aiOutputValidators.js`, `tests/validators.test.js`, `tests/concurrency.test.js`, `tests/testHelper.js` |
| 10 | **K. Bhuvan** | `25071A66A6` | Seed Script, Smoke Tests, Postman Collection & Integration Docs | `scripts/seed.js`, `scripts/smokeTest.js`, `scripts/checkAi.js`, `postman/*`, `docs/*`, `README.md` |

---

## Individual Member Demonstration Checklists

Each student should inspect their assigned code, run their respective tests, and be prepared to demonstrate their module during the capstone review.

### 1. N. Tharun Kumar (25071A66B8) - Role Catalog & Role Gap
- [ ] Understand role schema in `data/roles.json` (`id`, `name`, `expectedSkillIds`).
- [ ] Trace `GET /api/users/:userId/role-gap` from controller to `roleGapService.js`.
- [ ] Explain how evidence-backed skills are partitioned into `skillsWithEvidence` vs `skillsLackingEvidence`.
- [ ] Explain the ethical disclaimer: why missing evidence does not imply lack of student ability.
- [ ] Demonstrate `GET /api/users/{{userId}}/role-gap` in Postman.

### 2. P. Srihith Reddy (25071A66B9) - Server & Shared AI Adapter
- [ ] Explain Express middleware pipeline in `src/app.js` (CORS, 100kb limit, logger, error handler).
- [ ] Walk through `src/ai/aiClient.js` and explain timeout protection (`Promise.race`) and test stubbing.
- [ ] Explain why the server binds to `127.0.0.1` by default.
- [ ] Demonstrate starting the server with `npm start` and showing startup logs.

### 3. M. Harshavardhan (25071A66B1) - Storage & Atomic Transactions
- [ ] Explain how `withStoreTransaction()` in `src/storage/store.js` serializes read-modify-write operations.
- [ ] Explain atomic rename: writing to `.tmp.<uuid>` and renaming with `fs.rename()`.
- [ ] Explain corruption handling: why corrupted JSON throws `StoreCorruptedError` without wiping the file.
- [ ] Run `node --test tests/store.test.js` and explain the test assertions.

### 4. M. Rohit Sai (25071A66B2) - User Profile Lifecycle
- [ ] Walk through profile creation (`POST /api/users`) and validation against `roles.json`.
- [ ] Explain partial profile updates (`PATCH /api/users/:userId`) and prevention of unknown keys.
- [ ] Explain why user IDs are generated using `crypto.randomUUID()`.
- [ ] Demonstrate creating and patching a student profile in Postman.

### 5. T. Jaswanth (25071A66D5) - Evidence & Cascading Deletion
- [ ] Explain evidence fields (`type`, `title`, `description`, `date`, `supportingUrl`).
- [ ] Explain URL syntax validation without external network calls in `evidenceValidators.js`.
- [ ] Walk through `deleteEvidence()` in `src/services/evidenceService.js` and trace the single-transaction cascade:
  - Evidence item deletion
  - Associated skill mappings deletion
  - Portfolio `selectedEvidenceIds` cleanup
- [ ] Run `node --test tests/usersAndEvidence.test.js` and demonstrate evidence CRUD in Postman.

### 6. J. Sankarshan (25071A6698) - Skills, Mappings & AI Skill Analysis
- [ ] Explain how catalog skills in `data/skills.json` are linked to evidence.
- [ ] Walk through duplicate mapping prevention (HTTP 409 Conflict) and cross-user rejection (HTTP 400).
- [ ] Explain `POST /api/users/:userId/evidence/:evidenceId/analyze`:
  - How prompt isolates untrusted description text.
  - Why suggestions are not automatically saved to the store.
- [ ] Run `node --test tests/skillsAndPortfolio.test.js` and demonstrate skill mapping in Postman.

### 7. T. Nikhil (25071A66D6) - Portfolio Ordering & Assembly
- [ ] Explain `PUT /api/users/:userId/portfolio`: validating evidence IDs exist and belong to the user.
- [ ] Explain why duplicate evidence IDs in portfolio selection are rejected with HTTP 400.
- [ ] Walk through `getAssembledPortfolio()`: how selected evidence items are assembled in the **exact** requested order.
- [ ] Demonstrate assembling a portfolio in Postman and showing mapped skills summary.

### 8. R. Suryaprakash (25071A66C5) - Coaching Engine & Staleness
- [ ] Walk through `src/ai/prompts/coachingPrompt.js` and pedagogical constraints:
  - No qualification claims
  - No hiring prediction or readiness score
  - Out-of-scope evidence IDs prohibited
- [ ] Walk through `src/services/rulesCoachingService.js`: how rule fallback operates and why it is labeled `source: "rules"`.
- [ ] Explain input snapshotting and how staleness (`isStale: true`) is detected in `GET /api/users/:userId/coaching/latest`.
- [ ] Run `node --test tests/coachingAndAi.test.js`.

### 9. P. Sasikanth (25071A66C3) - Validators & Concurrency
- [ ] Walk through RFC 4122 v4 UUID validation and date bounds checking in `commonValidators.js`.
- [ ] Explain `validateAiCoachingOutput()`: how it checks that all supporting evidence IDs belong strictly to the portfolio.
- [ ] Walk through `tests/concurrency.test.js`: how 15 concurrent HTTP write requests execute without lost updates.
- [ ] Run `node --test tests/validators.test.js tests/concurrency.test.js`.

### 10. K. Bhuvan (25071A66A6) - Seeds, Smoke Tests & Integration
- [ ] Explain `scripts/seed.js` safety mechanism: why it aborts if data exists unless `--reset` is specified.
- [ ] Walk through `scripts/smokeTest.js`: ephemeral port server boot, 29-step assertion suite, and teardown.
- [ ] Explain `scripts/checkAi.js`: how it handles missing credentials safely.
- [ ] Demonstrate running `npm run smoke` and importing Postman collection and environment.
