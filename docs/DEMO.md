# 5 to 7-Minute Demonstration Script for Capstone Defense

This walkthrough is designed for our capstone presentation to faculty and examiners. It can be executed either via **Postman** (using the imported collection and environment) or via **PowerShell / curl**.

---

## Preparation (Before Demo Begins)
1. Open terminal in project root:
   ```powershell
   npm run seed -- --reset
   npm start
   ```
2. Open Postman:
   - Import `postman/Career_Evidence_Portfolio_Coach.postman_collection.json`.
   - Import `postman/Career_Evidence_Portfolio_Coach.postman_environment.json`.
   - Set active environment to **Career Evidence Coach - Local Environment**.

---

## Step-by-Step Defense Walkthrough

### Step 1: System Health & Role Catalog (30 seconds)
**Goal:** Show system status and pre-seeded educational catalogs.
- **Postman:** Select folder `01 - Health and Catalogs` -> Run **Get Health Status**.
- **Inspect Response:** HTTP 200 `{ "status": "ok", "service": "career-evidence-portfolio-coach" }`.
- **Next:** Run **Get Role Catalog**. Point out expected skills for `role-backend-dev` (Node.js, Express, REST APIs, SQL, Git, Testing).

### Step 2: Create Student Profile (45 seconds)
**Goal:** Create a career profile targeting the Backend Developer role.
- **Postman:** Select `02 - User Profiles` -> Run **Create User Profile**.
- **Inspect Response:** HTTP 201 Created. Point out generated UUID (`userId`).
- **Postman Feature:** Note that Postman's test script automatically sets `{{userId}}` in your environment.
- **Verify:** Run **Get User Profile** to show that target role metadata is populated.

### Step 3: Record Project & Internship Evidence (1 minute)
**Goal:** Add tangible evidence records with titles, descriptions, and supporting URLs.
- **Postman:** Select `03 - Career Evidence` -> Run **Create Project Evidence**.
  - Title: *E-Commerce Inventory API Service*
  - Type: *project*
  - Supporting URL: *https://github.com/example-student/inventory-api-service*
- **Inspect Response:** HTTP 201 Created. Postman automatically captures `{{evidenceId}}`.
- **Next:** Run **Create Internship Evidence**. Point out that students can record internships, projects, and certifications.
- **Next:** Run **List User Evidence** to show both entries listed.

### Step 4: AI Skill Extraction & Mapping (1 minute)
**Goal:** Demonstrate AI analyzing evidence text against the skill catalog.
- **Postman:** Select `04 - Skills and AI Suggestion` -> Run **AI Analyze Evidence For Skills**.
- **Key Point for Examiners:** 
  - If `GEMINI_API_KEY` is configured, Gemini suggests matching skills (e.g. `skill-nodejs`, `skill-rest-apis`) with justifications.
  - If unconfigured, the system returns a safe HTTP 503 without crashing or inventing false qualifications.
  - **Crucial Rule:** The system does **not** automatically save suggestions. The student chooses which skills to map.
- **Accept Mapping:** Run **Map Catalog Skill to Evidence** to link `skill-nodejs` to the evidence item.
- **Inspect Response:** HTTP 201 Created.

### Step 5: Role Gap Comparison (45 seconds)
**Goal:** Compare evidence-backed skills against role expectations.
- **Postman:** Run **Compare Target Role Gap**.
- **Highlight to Examiners:**
  - `skillsWithEvidence`: Shows Node.js with supporting evidence.
  - `skillsLackingEvidence`: Shows SQL, Testing, Git, etc.
  - **Ethical Disclaimer:** Point out the returned disclaimer: *"Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence."*

### Step 6: Portfolio Selection & Assembly (1 minute)
**Goal:** Create a structured portfolio and demonstrate ordered assembly.
- **Postman:** Select `05 - Portfolio Management` -> Run **Upsert Portfolio**.
- **Next:** Run **Get Assembled Portfolio**.
- **Highlight to Examiners:**
  - The portfolio presents the user profile, target role, and selected evidence in the exact sequence requested.
  - Mapped skills are aggregated into a clean portfolio summary.

### Step 7: Coaching Evaluation & Dynamic Staleness (1 minute)
**Goal:** Receive coaching feedback and verify staleness tracking.
- **Postman:** Select `06 - Coaching Evaluation` -> Run **Generate Coaching Evaluation**.
- **Inspect Response:** HTTP 201 Created.
  - Highlights tangible **Strengths** backed strictly by selected evidence IDs.
  - Identifies **Evidence Gaps** without predicting hiring scores.
  - Recommends prioritized **Next Steps** (e.g. adding database project or attaching repository URLs).
- **Staleness Demo:**
  - Run **Get Latest Coaching & Staleness** -> Returns `isStale: false`.
  - Now run **Update User Profile (PATCH)** and change `targetRoleId` to `role-frontend-dev`.
  - Re-run **Get Latest Coaching & Staleness** -> Now immediately flags `isStale: true` with reason: *"Target role changed from 'role-backend-dev' to 'role-frontend-dev'"*.

### Step 8: Validation & Cascading Cleanup (45 seconds)
**Goal:** Prove system defenses and database consistency.
- **Postman:** Select `08 - Error Boundary Test Cases` -> Run **Error - Missing Required Fields (400)**.
  - Shows standard HTTP 400 with `VALIDATION_ERROR` details.
- **Cascade Deletion:** Select `07 - Cascade Deletion & Cleanup` -> Run **Delete Evidence Item (Cascades Cleanup)**.
  - Deletes evidence item.
  - Demonstrates that associated skill mappings and portfolio references are atomically purged in one transaction.

### Step 9: Persistence Verification Across Restart (30 seconds)
**Goal:** Prove JSON storage persists data to disk.
1. In the terminal running the server, press `Ctrl+C` to stop the server.
2. Restart the server:
   ```powershell
   npm start
   ```
3. In Postman, run **Get User Profile** (`GET /api/users/{{userId}}`).
4. Notice the profile is immediately returned from `data/store.json` intact!
