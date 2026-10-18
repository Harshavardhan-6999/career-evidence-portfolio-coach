# Career Evidence & Portfolio Coach Backend

An educational backend-only capstone system for undergraduate Computer Science and Engineering students. Enables students to build career profiles, record projects/certifications/internships as tangible evidence, link evidence to skills, curate ordered portfolios, analyze target role gaps, and receive structured coaching feedback powered by Google Gemini AI (with a deterministic rule-based fallback).

---

## 📌 Project Overview
- **Capstone Due Date:** 20 October 2026
- **Architecture:** Node.js (ES Modules), Express.js, JSON File Storage with in-process transaction serialization.
- **AI Integration:** Official Google Gen AI SDK (`@google/genai`) with structured JSON outputs.
- **Dependencies:** `express`, `@google/genai`, `dotenv`, `cors`. (Zero database server or frontend required).

---

## 🛠️ System Requirements
- **Node.js:** `>= 20.0.0` (LTS). Tested and verified on Node.js `v24.21.0`.
- **npm:** Included with Node.js (`11.19.0` or higher).

---

## 🚀 Quick Start Guide

### 1. Installation
Clone or navigate to the project directory:

#### On Windows (PowerShell):
```powershell
cd c:\Users\harsh\OneDrive\Desktop\25071A66B1\Career-Evidence-Portfolio-Coach
npm install
```

#### On macOS / Linux:
```bash
cd /path/to/Career-Evidence-Portfolio-Coach
npm install
```

---

### 2. Configure Environment (.env)
Copy the example environment configuration:

#### Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

#### macOS / Linux:
```bash
cp .env.example .env
```

Edit `.env` (optional for live AI):
```ini
PORT=3000
HOST=127.0.0.1
NODE_ENV=development

# Optional: Add your Google Gemini API key from https://aistudio.google.com/
GEMINI_API_KEY=
AI_MODEL=gemini-2.5-flash
AI_TIMEOUT_MS=15000
```
> [!NOTE]
> All standard REST APIs and rule-based coaching work **100% without an API key**. An API key is only required if you want live Gemini AI model generation.

---

### 3. Seed Database
Populate `data/store.json` with realistic, fictional student profiles and sample evidence:
```bash
npm run seed
```
> [!TIP]
> To wipe existing data and reseed from scratch, pass the explicit reset flag:
> ```bash
> npm run seed -- --reset
> ```

---

### 4. Start the Server
Start the HTTP backend listener:
```bash
npm start
```
The server will boot and display:
```
================================================================
🚀 Career Evidence and Portfolio Coach Backend Started
📍 URL:           http://127.0.0.1:3000
📦 Node.js:       v24.21.0
💾 Store Path:    .../data/store.json
🤖 AI Configured: No (Rule-based fallback active)
================================================================
```

For live code auto-reload during development:
```bash
npm run dev
```

---

## 🧪 Testing & Verification Scripts

| Command | Purpose |
|---|---|
| `npm test` | Runs the full automated test suite using `node:test` (38 unit & integration tests). |
| `npm run smoke` | Runs the end-to-end HTTP smoke test on an ephemeral test port (29 assertions). |
| `npm run check-ai` | Verifies Google Gemini API credentials and structured output parsing. |
| `npm run seed` | Populates the local store safely without overwriting existing data. |

---

## 📬 Postman Collection Setup

1. Open Postman.
2. Click **Import** (top left).
3. Import both files from the `postman/` directory:
   - `postman/Career_Evidence_Portfolio_Coach.postman_collection.json`
   - `postman/Career_Evidence_Portfolio_Coach.postman_environment.json`
4. In Postman, select the environment: **Career Evidence Coach - Local Environment**.
5. All 20 endpoints are pre-organized with automated test scripts that capture `userId`, `evidenceId`, and `mappingId` dynamically as you run them!

---

## 👥 10-Member Ownership Matrix

| # | Student Member | Roll Number | Module / Responsibility Area |
|---|---|---|---|
| 1 | **N. Tharun Kumar** | `25071A66B8` | Requirements, Role Catalog & Role Gap Comparison |
| 2 | **P. Srihith Reddy** | `25071A66B9` | Express Server Setup, Environment & Shared AI Client |
| 3 | **M. Harshavardhan** | `25071A66B1` | JSON Storage, Serialized Writes, IDs & Consistency |
| 4 | **M. Rohit Sai** | `25071A66B2` | User Profile Routes, Controllers & Services |
| 5 | **T. Jaswanth** | `25071A66D5` | Evidence Routes, Controllers & Cascade Cleanup |
| 6 | **J. Sankarshan** | `25071A6698` | Skill Catalog, Evidence Mappings & AI Skill Suggestions |
| 7 | **T. Nikhil** | `25071A66D6` | Portfolio Selection, Ordering & Assembly |
| 8 | **R. Suryaprakash** | `25071A66C5` | Feedback Rules, AI Coaching Prompt & Coaching Service |
| 9 | **P. Sasikanth** | `25071A66C3` | Shared Validators, Automated Tests & Concurrency Defect Checks |
| 10 | **K. Bhuvan** | `25071A66A6` | Seed Script, Smoke-Test Script, Postman, Integration & Documentation |

*See [`docs/TEAM_OWNERSHIP.md`](file:///c:/Users/harsh/OneDrive/Desktop/25071A66B1/Career-Evidence-Portfolio-Coach/docs/TEAM_OWNERSHIP.md) for individual demonstration checklists.*

---

## 📚 Project Documentation

- [`docs/API.md`](file:///c:/Users/harsh/OneDrive/Desktop/25071A66B1/Career-Evidence-Portfolio-Coach/docs/API.md): Comprehensive API reference for all 20 endpoints.
- [`docs/ARCHITECTURE.md`](file:///c:/Users/harsh/OneDrive/Desktop/25071A66B1/Career-Evidence-Portfolio-Coach/docs/ARCHITECTURE.md): Architectural design, data flow, queue serialization, and AI safety mechanisms.
- [`docs/DEMO.md`](file:///c:/Users/harsh/OneDrive/Desktop/25071A66B1/Career-Evidence-Portfolio-Coach/docs/DEMO.md): 5-7 minute demonstration script for defense presentations.
- [`docs/VERIFICATION.md`](file:///c:/Users/harsh/OneDrive/Desktop/25071A66B1/Career-Evidence-Portfolio-Coach/docs/VERIFICATION.md): Audit report of actual test runs, pass/fail counts, and AI credentials status.

---

## 🔧 Troubleshooting

### 1. `npm test` fails or port is already in use
The test runner and smoke tests boot on ephemeral ports (`0`), preventing port conflicts. If another service is already using port `3000` when running `npm start`, edit `PORT=3001` in your `.env` file.

### 2. Corrupt store error (`STORE_CORRUPTED`)
If someone manually edits `data/store.json` and leaves invalid JSON syntax, the server will refuse to overwrite the file and return HTTP 500 `STORE_CORRUPTED`. Fix the JSON syntax or reset the database cleanly:
```bash
npm run seed -- --reset
```

### 3. AI Service returns HTTP 503 (`AI_SERVICE_UNAVAILABLE`)
If you call `POST /api/users/:userId/evidence/:evidenceId/analyze` without setting `GEMINI_API_KEY`, the server correctly returns HTTP 503 rather than inventing fake suggestions. To enable live AI, add a valid API key from [Google AI Studio](https://aistudio.google.com/) to your `.env` file.
