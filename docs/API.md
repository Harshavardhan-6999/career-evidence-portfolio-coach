# Career Evidence & Portfolio Coach - Complete API Reference Manual

This document details all REST API endpoints implemented in the **Career Evidence and Portfolio Coach** platform.

---

## 1. Standard Response Formats & Authentication

All API responses follow a uniform JSON envelope format.

### Success Envelope (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Envelope (HTTP 400, 401, 403, 404, 409, 429, 500, 502, 503)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of error",
    "details": null
  }
}
```

### Standard Error Codes
| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request payload failed schema or semantic bounds |
| `400` | `INVALID_JSON` | Malformed JSON syntax in HTTP request body |
| `401` | `UNAUTHORIZED` | Authentication required; missing or expired session token |
| `401` | `INVALID_CREDENTIALS`| Incorrect email or password provided during login |
| `403` | `FORBIDDEN` | Identity ownership violation: student A cannot access student B's data |
| `404` | `NOT_FOUND` | User, evidence, portfolio, mapping, or coaching record not found |
| `409` | `CONFLICT` / `EMAIL_ALREADY_EXISTS` | Duplicate record (e.g., email registered or duplicate skill mapping) |
| `413` | `PAYLOAD_TOO_LARGE`| Request body exceeds the 100kb payload limit |
| `429` | `RATE_LIMIT_EXCEEDED`| Exceeded endpoint request quota |
| `502` | `AI_INVALID_OUTPUT`| Gemini AI response failed structural schema validation |
| `503` | `AI_SERVICE_UNAVAILABLE`| Gemini AI quota exceeded or key missing |
| `503` | `DATABASE_UNAVAILABLE`| MongoDB Atlas disconnected or unreachable |
| `500` | `INTERNAL_SERVER_ERROR`| Unhandled server error (stack trace sanitized) |

### Authentication Mechanism
Endpoints requiring authentication accept credentials via either:
1. **HttpOnly Cookie**: Set automatically under the cookie name `token` upon registration or login.
2. **Authorization Header**: `Authorization: Bearer <jwt_token>` (ideal for API testing and Postman).

---

## 2. Authentication Endpoints

### `POST /api/auth/register`
Creates a new student user account and sets an authenticated session.
- **Rate Limit:** 10 requests / 15 minutes
- **Request Body:**
```json
{
  "name": "Aarav Sharma",
  "email": "aarav.student@college.edu",
  "password": "SecurePassword123!",
  "education": "B.Tech CSE, 3rd Year",
  "targetRoleId": "role-backend-dev",
  "interests": ["Distributed Systems", "SQL", "APIs"],
  "bio": "Aspiring backend engineer."
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6adcd...",
      "name": "Aarav Sharma",
      "email": "aarav.student@college.edu",
      "education": "B.Tech CSE, 3rd Year",
      "targetRoleId": "role-backend-dev",
      "interests": ["Distributed Systems", "SQL", "APIs"],
      "bio": "Aspiring backend engineer.",
      "role": "student",
      "createdAt": "2026-10-24T12:00:00.000Z"
    },
    "token": "eyJhbGciOi..."
  }
}
```

### `POST /api/auth/login`
Authenticates existing student credentials and sets an authenticated session.
- **Rate Limit:** 10 requests / 15 minutes
- **Request Body:**
```json
{
  "email": "aarav.student@college.edu",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):** Returns `{ user, token }`.

### `GET /api/auth/me`
Retrieves current authenticated session profile.
- **Auth Required:** Yes
- **Response (200 OK):** Returns `{ user: { ... } }`.

### `POST /api/auth/logout`
Clears session cookie.
- **Response (200 OK):** `{ "success": true, "data": { "message": "Logged out successfully" } }`.

---

## 3. Catalogs & System

### `GET /health`
Returns system liveness and health status.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-24T12:00:00.000Z",
  "service": "career-evidence-portfolio-coach"
}
```

### `GET /api/roles`
Returns educational target role catalog.
- **Response (200 OK):** Returns array of roles with `id`, `name`, `expectedSkillIds`, and `description`.

### `GET /api/skills`
Returns educational skill catalog.
- **Response (200 OK):** Returns array of catalog skills with `id` and `name`.

---

## 4. Student Profiles

### `GET /api/users/:userId`
Retrieves student profile with populated target role metadata.
- **Auth Required:** Yes (identity ownership enforced)
- **Response (200 OK):** Returns user profile with populated `targetRole`.

### `PATCH /api/users/:userId`
Updates student education, interests, target role, or biography.
- **Auth Required:** Yes (identity ownership enforced)
- **Request Body (all fields optional):**
```json
{
  "name": "Aarav Sharma",
  "education": "B.Tech CSE, Final Year",
  "targetRoleId": "role-backend-dev",
  "interests": ["Distributed Systems", "Microservices"],
  "bio": "Updated bio statement."
}
```

---

## 5. Evidence Management

### `POST /api/users/:userId/evidence`
Records new project, certification, or internship evidence.
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "type": "project",
  "title": "Distributed Task Scheduler in Node.js",
  "description": "Constructed asynchronous message queue consumer with SQL persistence and transaction rollback.",
  "date": "2026-03-15",
  "supportingUrl": "https://github.com/student/task-scheduler"
}
```
- **Response (201 Created):** Returns created evidence record with generated `id`.

### `GET /api/users/:userId/evidence`
Lists all evidence records recorded by the student.
- **Auth Required:** Yes

### `GET /api/users/:userId/evidence/:evidenceId`
Retrieves a specific evidence record by ID.
- **Auth Required:** Yes

### `PATCH /api/users/:userId/evidence/:evidenceId`
Updates an evidence record's title, description, date, or URL.
- **Auth Required:** Yes

### `DELETE /api/users/:userId/evidence/:evidenceId`
Removes an evidence record. Automatically cascades: deletes associated skill mappings and purges reference from portfolio.
- **Auth Required:** Yes
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Evidence record removed successfully",
    "removedEvidenceId": "...",
    "removedMappingsCount": 2,
    "removedFromPortfolio": true
  }
}
```

---

## 6. Skills & AI Skill Suggestion

### `POST /api/users/:userId/evidence/:evidenceId/analyze`
Invokes Gemini AI to analyze evidence description and suggest matching catalog skills with reasoning.
- **Auth Required:** Yes
- **Rate Limit:** 20 requests / 15 minutes
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "evidenceId": "...",
    "suggestedSkills": [
      {
        "skillId": "skill-nodejs",
        "skillName": "Node.js",
        "reason": "Description explicitly highlights asynchronous backend service built with Node.js."
      }
    ]
  }
}
```

### `POST /api/users/:userId/skill-mappings`
Links a catalog skill to an evidence record. Rejects duplicate mappings (409) and foreign evidence (400).
- **Auth Required:** Yes
- **Request Body:** `{ "skillId": "skill-nodejs", "evidenceId": "..." }`
- **Response (201 Created):** Returns mapping record.

### `GET /api/users/:userId/skills`
Lists all skills mapped by the student with supporting evidence items.
- **Auth Required:** Yes

### `DELETE /api/users/:userId/skill-mappings/:mappingId`
Removes a skill mapping.
- **Auth Required:** Yes

---

## 7. Role Gap Analysis

### `GET /api/users/:userId/role-gap`
Evaluates target role expectations against user evidence-backed skills.
- **Auth Required:** Yes
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "roleName": "Backend Developer",
    "targetRole": { "id": "role-backend-dev", "name": "Backend Developer" },
    "skillsWithEvidence": [
      {
        "skillId": "skill-nodejs",
        "skillName": "Node.js",
        "supportingEvidence": [ ... ]
      }
    ],
    "skillsLackingEvidence": [
      {
        "skillId": "skill-sql",
        "skillName": "SQL & Relational Databases"
      }
    ],
    "summary": {
      "totalExpectedSkills": 4,
      "skillsWithEvidenceCount": 1,
      "skillsLackingEvidenceCount": 3
    },
    "disclaimer": "Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence and does not predict hiring success or job readiness."
  }
}
```

---

## 8. Curated Portfolio

### `PUT /api/users/:userId/portfolio`
Upserts student portfolio with ordered selection of evidence IDs.
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "title": "Backend Engineering Capstone Portfolio",
  "selectedEvidenceIds": ["evId_2", "evId_1"]
}
```

### `GET /api/users/:userId/portfolio`
Assembles portfolio in exact requested order, populating evidence and mapped skills.
- **Auth Required:** Yes

---

## 9. Job Description Analysis

### `POST /api/job-descriptions/analyze` (or `POST /api/users/:userId/job-descriptions/analyze`)
Extracts requirements from pasted job description and evaluates 3-tier evidence gap.
- **Auth Required:** Yes
- **Rate Limit:** 20 requests / 15 minutes
- **Request Body:**
```json
{
  "rawText": "Senior Backend Engineer. Requirements: Node.js, Express, PostgreSQL, REST APIs. Preferred: Docker."
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "extractedRoleTitle": "Senior Backend Engineer",
    "requiredSkills": [ ... ],
    "preferredSkills": [ ... ],
    "skillGapAnalysis": {
      "supportedByEvidence": [ ... ],
      "claimedWithoutEvidence": [ ... ],
      "notDemonstrated": [ ... ]
    },
    "summary": {
      "totalRequiredSkills": 4,
      "totalPreferredSkills": 1,
      "coveredCount": 2,
      "gapCount": 2
    },
    "disclaimer": "Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence and does not predict hiring success or job readiness."
  }
}
```

### `GET /api/job-descriptions`
Lists student's historical job description analyses.
- **Auth Required:** Yes

---

## 10. AI Coaching & Interactive Career Roadmap

### `POST /api/users/:userId/coaching`
Generates comprehensive AI coaching feedback and interactive roadmap tasks based on curated portfolio.
- **Auth Required:** Yes
- **Rate Limit:** 20 requests / 15 minutes
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "source": "ai",
    "aiStatus": "success",
    "strengths": [
      { "statement": "Validated Node.js REST API engineering competency.", "supportingEvidenceIds": [ ... ] }
    ],
    "evidenceGaps": [
      { "statement": "No documented relational database transaction evidence.", "supportingEvidenceIds": [] }
    ],
    "nextSteps": [
      { "action": "Build relational database module with indexing.", "reason": "Demonstrates SQL tuning.", "priority": "high" }
    ],
    "roadmap": [
      {
        "id": "task-1",
        "task": "Build relational database module with indexing.",
        "reason": "Demonstrates SQL tuning.",
        "priority": "high",
        "status": "todo"
      }
    ]
  }
}
```

### `GET /api/users/:userId/coaching/latest`
Retrieves latest coaching evaluation along with real-time staleness status (`isStale: true/false`).
- **Auth Required:** Yes

### `PATCH /api/users/:userId/coaching/:coachingId/tasks/:taskId`
Updates completion status of a roadmap task.
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "status": "in_progress" // "todo" | "in_progress" | "completed"
}
```
- **Response (200 OK):** Returns updated coaching record with new roadmap status.
