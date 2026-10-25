# Screenshot Guide & Capture Instructions

This guide provides exact instructions for capturing all 12 project demonstration screenshots. Save your screenshots as PNG files inside `docs/screenshots/`.

> [!CAUTION]
> **Privacy & Credential Shield:**
> Never capture or display real API keys, MongoDB connection strings, JWT secrets, or private personal data in screenshots. Ensure the `.env` file or sensitive terminal variables are masked or cropped out.

---

## Screenshot Inventory & Specifications Table

| Screenshot Filename | Exact Page / Request to Open | Sample Data / Action | Expected Visible Result | Sensitive Information to Hide |
|---|---|---|---|---|
| `01_login_and_registration.png` | `http://localhost:3000/#/auth` (or Auth modal on dashboard) | Enter registration details (Name: "Alex Chen", Education: "B.Tech CSE", Target Role: "Backend Developer") | Clean dark-themed Registration & Login modal with active validation feedback and submit button | Password fields (masked with bullets) |
| `02_main_dashboard.png` | `http://localhost:3000/#/dashboard` | Logged-in student with seeded or created evidence | Overview metrics cards (Total Evidence, Mapped Skills, Role Coverage %, Portfolio Status), target role banner, quick actions | Any browser authorization cookies / tokens |
| `03_profile_management.png` | `http://localhost:3000/#/profile` | Edit student bio, technical interests, and switch or select target role | Form showing target role dropdown, interests badges, bio text area, and "Save Profile" confirmation | Roll numbers or personal phone numbers |
| `04_evidence_management.png` | `http://localhost:3000/#/evidence` | Evidence list showing Projects, Certifications, and Internships | Filterable table/cards of evidence items with type badges, dates, clickable verified URLs, and Edit/Delete controls | Internal local file paths |
| `05_ai_skill_suggestions.png` | `http://localhost:3000/#/evidence` -> Click **"AI Analyze Skills"** on an evidence item | Analyzes "Distributed Order Processing REST API" | Modal showing Gemini AI extracted skills (e.g. Node.js, Express.js, SQL), evidence justifications, and individual "Accept & Map" buttons | AI provider API keys |
| `06_portfolio_builder.png` | `http://localhost:3000/#/portfolio` | Select 2-3 evidence items, use **Up/Down** buttons to change display order | Live assembled preview showing user profile, ordered evidence entries, and aggregated mapped skills summary | Any unmasked personal contact details |
| `07_job_description_analysis.png` | `http://localhost:3000/#/job-fit` | Paste job description text (e.g. "Backend Engineer - Node.js/PostgreSQL") and click **"Analyze Job Description"** | Progress indicator transitioning to structured extraction of Role Title, Required Skills, and Preferred Skills | Unnecessary external employer recruiter names |
| `08_skill_gap_analysis.png` | `http://localhost:3000/#/job-fit` -> Scroll to Skill Gap section | Automatic comparison against student's evidence-backed skills | 3-column breakdown: **Supported by Evidence** (green), **Claimed without Evidence** (amber), and **Not Demonstrated** (gray), plus educational disclaimer | Numerical hiring probability scores (never display fake hiring scores) |
| `09_career_roadmap_coaching.png` | `http://localhost:3000/#/roadmap` | Click **"Generate AI Coaching & Roadmap"** | Strengths cards, Evidence Gap callouts, and Interactive Roadmap checklist with toggleable task status (`Todo`, `In Progress`, `Completed`) | None |
| `10_automated_test_summary.png` | Terminal running `npm test` | Run `npm test` from project root | Node.js native test runner output showing **100% passing tests** (e.g. `✔ 40+ tests passed, 0 failed`) with execution duration | Local user profile usernames or sensitive directory paths |
| `11_github_actions_ci.png` | GitHub Repository -> **Actions** tab | Push repository to GitHub and view latest workflow run | Green checkmark indicating passing workflow: **CI / build-and-test** with jobs (lint, backend test, frontend build) | GitHub personal access tokens or secret logs |
| `12_deployed_app_live.png` | Production deployed URL (e.g. `https://career-coach-demo.onrender.com`) | Live deployed browser view showing navigation, connected database indicator, and active dashboard | Fully rendered application running over HTTPS with public URL visible in address bar | Production database connection strings or administrative panel secrets |

---

## Capture Procedure

1. **Local Setup:**
   Ensure your backend and frontend are running:
   ```bash
   npm run build
   npm start
   ```
2. **Resolution & Scaling:**
   Capture browser screens at standard 1920x1080 (or 1440x900) resolution at 100% desktop scale for crisp, readable typography in your capstone report.
3. **Placing Images:**
   Save each captured PNG in `docs/screenshots/` matching the exact filenames listed above.
4. **Referencing in README:**
   Once captured, the README and documentation will automatically render the images via their relative paths `docs/screenshots/<filename>.png`.
