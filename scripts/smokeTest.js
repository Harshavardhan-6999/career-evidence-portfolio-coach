/**
 * Module 10: End-to-End HTTP Smoke Test Script
 * Owner: K. Bhuvan (25071A66A6)
 *
 * Boots an ephemeral test server on an isolated port and tests all API endpoints
 * and core flows end-to-end using Node.js native fetch and MongoDB persistence.
 */

import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { connectDb, disconnectDb } from '../src/storage/db.js';

let passedCount = 0;
let failedCount = 0;
let mongod = null;

function assertCondition(desc, condition, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${desc} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

async function runSmokeTests() {
  console.log('🔥 Starting Full-Stack Automated HTTP Smoke Tests...');
  console.log('================================================================');

  // By default, smoke tests run against an isolated in-memory MongoMemoryServer to guarantee zero Atlas mutation
  if (!process.env.USE_LIVE_ATLAS_DB || process.env.NODE_ENV === 'test') {
    mongod = await MongoMemoryServer.create();
    await connectDb(mongod.getUri());
  } else {
    await connectDb();
  }

  // Boot server on ephemeral port (0 selects any free port automatically)
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Ephemeral test server active at: ${baseUrl}\n`);

  let authToken = '';
  let authHeaders = {};
  let userId = '';
  let foreignUserId = '';
  let foreignAuthHeaders = {};
  let ev1Id = '';
  let ev2Id = '';
  let foreignEvId = '';
  let coachingId = '';

  try {
    // 1. Health check & Catalogs
    console.log('[1/12] Testing Health and Catalog Endpoints');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assertCondition('GET /health returns 200 and status ok', healthRes.status === 200 && healthData.status === 'ok');

    const rolesRes = await fetch(`${baseUrl}/api/roles`);
    const rolesData = await rolesRes.json();
    assertCondition('GET /api/roles returns catalog array', rolesRes.status === 200 && Array.isArray(rolesData.data) && rolesData.data.length >= 3);

    const skillsRes = await fetch(`${baseUrl}/api/skills`);
    const skillsData = await skillsRes.json();
    assertCondition('GET /api/skills returns catalog array', skillsRes.status === 200 && Array.isArray(skillsData.data) && skillsData.data.length >= 10);

    // 2. Authentication & Account Registration
    console.log('\n[2/12] Testing Authentication & Session Endpoints');
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan SmokeTest',
        email: 'jordan.smoke@college.edu',
        password: 'SecurePassword2026!',
        education: 'B.Tech CSE, 3rd Year',
        targetRoleId: 'role-backend-dev',
        interests: ['Backend', 'APIs', 'React'],
        bio: 'Smoke testing candidate profile'
      })
    });
    const registerData = await registerRes.json();
    assertCondition('POST /api/auth/register returns 201 with auth token', registerRes.status === 201 && registerData.data.token);
    authToken = registerData.data.token;
    userId = registerData.data.user.id;
    authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    };

    const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assertCondition('GET /api/auth/me returns current session user', meRes.status === 200 && meData.data.user.email === 'jordan.smoke@college.edu');

    // Create a foreign user to test security boundaries
    const foreignRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Foreign Candidate',
        email: 'foreign.candidate@college.edu',
        password: 'SecurePassword2026!',
        education: 'B.Tech IT',
        targetRoleId: 'role-frontend-dev'
      })
    });
    const foreignRegData = await foreignRegRes.json();
    foreignUserId = foreignRegData.data.user.id;
    foreignAuthHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${foreignRegData.data.token}`
    };

    // 3. User Profile Operations & Security Boundary
    console.log('\n[3/12] Testing Profile Operations & Cross-Account Isolation');
    const getUserRes = await fetch(`${baseUrl}/api/users/${userId}`, { headers: authHeaders });
    const getUserData = await getUserRes.json();
    assertCondition('GET /api/users/:userId returns user with targetRole', getUserRes.status === 200 && getUserData.data.name === 'Jordan SmokeTest');

    const updateProfileRes = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ bio: 'Updated smoke testing bio statement.' })
    });
    const updateProfileData = await updateProfileRes.json();
    assertCondition('PATCH /api/users/:userId updates profile bio', updateProfileRes.status === 200 && updateProfileData.data.bio === 'Updated smoke testing bio statement.');

    // Security check: foreign user cannot read Jordan's profile
    const crossProfileRes = await fetch(`${baseUrl}/api/users/${userId}`, { headers: foreignAuthHeaders });
    assertCondition('Cross-user profile access rejected with 403 Forbidden', crossProfileRes.status === 403);

    // 4. Evidence Management
    console.log('\n[4/12] Testing Evidence Records (Projects, Certifications)');
    const createEv1Res = await fetch(`${baseUrl}/api/users/${userId}/evidence`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'project',
        title: 'Distributed In-Memory Task Queue',
        description: 'Engineered an asynchronous task broker using Node.js, Express, and Redis.',
        date: '2026-04-10',
        supportingUrl: 'https://github.com/jordan/task-queue'
      })
    });
    const createEv1Data = await createEv1Res.json();
    assertCondition('POST /api/users/:userId/evidence creates project evidence', createEv1Res.status === 201 && createEv1Data.data.id);
    ev1Id = createEv1Data.data.id;

    const createEv2Res = await fetch(`${baseUrl}/api/users/${userId}/evidence`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'certification',
        title: 'Relational Database Optimization Specialist',
        description: 'Certified in PostgreSQL query optimization and indexing strategies.',
        date: '2026-02-18'
      })
    });
    const createEv2Data = await createEv2Res.json();
    assertCondition('POST /api/users/:userId/evidence creates certification evidence', createEv2Res.status === 201 && createEv2Data.data.id);
    ev2Id = createEv2Data.data.id;

    // Foreign evidence
    const createForeignEvRes = await fetch(`${baseUrl}/api/users/${foreignUserId}/evidence`, {
      method: 'POST',
      headers: foreignAuthHeaders,
      body: JSON.stringify({
        type: 'project',
        title: 'Foreign Web UI',
        description: 'Accessible React UI design system.',
        date: '2026-03-01'
      })
    });
    foreignEvId = (await createForeignEvRes.json()).data.id;

    // 5. AI Skill Suggestions & Skill Mapping
    console.log('\n[5/12] Testing Skill Mapping & AI Skill Suggestions');
    const aiSuggestRes = await fetch(`${baseUrl}/api/users/${userId}/evidence/${ev1Id}/analyze`, {
      method: 'POST',
      headers: authHeaders
    });
    const aiSuggestData = await aiSuggestRes.json();
    assertCondition(
      'POST /api/users/:userId/evidence/:id/analyze handles AI evaluation (200 with suggestions or 503 if AI unconfigured)',
      (aiSuggestRes.status === 200 && Array.isArray(aiSuggestData?.data?.suggestedSkills)) ||
        (aiSuggestRes.status === 503 && aiSuggestData?.error?.code === 'AI_SERVICE_UNAVAILABLE')
    );

    const map1Res = await fetch(`${baseUrl}/api/users/${userId}/skill-mappings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ skillId: 'skill-nodejs', evidenceId: ev1Id })
    });
    assertCondition('POST /api/users/:userId/skill-mappings maps skill-nodejs to ev1', map1Res.status === 201);

    const map2Res = await fetch(`${baseUrl}/api/users/${userId}/skill-mappings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ skillId: 'skill-sql', evidenceId: ev2Id })
    });
    assertCondition('POST /api/users/:userId/skill-mappings maps skill-sql to ev2', map2Res.status === 201);

    // Reject duplicate mapping
    const dupMapRes = await fetch(`${baseUrl}/api/users/${userId}/skill-mappings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ skillId: 'skill-nodejs', evidenceId: ev1Id })
    });
    assertCondition('Duplicate mapping rejected with 409 Conflict', dupMapRes.status === 409);

    // 6. Target Role Gap Analysis
    console.log('\n[6/12] Testing Target Role Gap Analysis');
    const roleGapRes = await fetch(`${baseUrl}/api/users/${userId}/role-gap`, { headers: authHeaders });
    const roleGapData = await roleGapRes.json();
    assertCondition(
      'GET /api/users/:userId/role-gap returns expected comparison with disclaimer',
      roleGapRes.status === 200 &&
        roleGapData.data.disclaimer.includes('Missing evidence does not prove lack of ability') &&
        roleGapData.data.skillsWithEvidence.length >= 2
    );

    // 7. Curated Portfolio Assembly
    console.log('\n[7/12] Testing Curated Portfolio Ordering & Assembly');
    const putPortRes = await fetch(`${baseUrl}/api/users/${userId}/portfolio`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Jordan SmokeTest - Backend Engineering Portfolio',
        selectedEvidenceIds: [ev2Id, ev1Id] // reverse order test
      })
    });
    const putPortData = await putPortRes.json();
    assertCondition('PUT /api/users/:userId/portfolio upserts portfolio', putPortRes.status === 200 && putPortData.data.title);

    const getPortRes = await fetch(`${baseUrl}/api/users/${userId}/portfolio`, { headers: authHeaders });
    const getPortData = await getPortRes.json();
    assertCondition(
      'GET /api/users/:userId/portfolio preserves exact specified evidence order',
      getPortRes.status === 200 &&
        getPortData.data.selectedEvidence[0].id === ev2Id &&
        getPortData.data.selectedEvidence[1].id === ev1Id
    );

    // 8. Job Description Analysis & 3-Tier Matrix
    console.log('\n[8/12] Testing Job Description Parsing & 3-Tier Skill Gap Matrix');
    const jdText = `
      Position: Backend Cloud Engineer
      Requirements:
      - Hands-on experience with Node.js and SQL
      - Experience with React interfaces
      - Familiarity with Docker containerization
    `;
    const jdRes = await fetch(`${baseUrl}/api/job-descriptions/analyze`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ rawText: jdText })
    });
    const jdData = await jdRes.json();
    assertCondition(
      'POST /api/job-descriptions/analyze returns 3-tier skill classification',
      jdRes.status === 201 &&
        jdData.data.skillGapAnalysis.supportedByEvidence.length > 0 &&
        jdData.data.skillGapAnalysis.claimedWithoutEvidence.length > 0
    );

    // 9. AI Coaching & Interactive Career Roadmap
    console.log('\n[9/12] Testing AI Coaching Feedback & Career Roadmap Generation');
    const coachRes = await fetch(`${baseUrl}/api/users/${userId}/coaching`, {
      method: 'POST',
      headers: authHeaders
    });
    const coachData = await coachRes.json();
    assertCondition(
      'POST /api/users/:userId/coaching returns strengths, gaps, and roadmap',
      coachRes.status === 201 &&
        Array.isArray(coachData.data.strengths) &&
        Array.isArray(coachData.data.roadmap) &&
        coachData.data.roadmap.length > 0
    );
    coachingId = coachData.data.id;
    const firstTaskId = coachData.data.roadmap[0].id;

    // 10. Update Roadmap Task Progress
    console.log('\n[10/12] Testing Interactive Roadmap Task Status Updates');
    const updateTaskRes = await fetch(
      `${baseUrl}/api/users/${userId}/coaching/${coachingId}/tasks/${firstTaskId}`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'completed' })
      }
    );
    const updateTaskData = await updateTaskRes.json();
    const updatedTask = updateTaskData.data?.roadmap?.find((t) => t.id === firstTaskId);
    assertCondition(
      'PATCH updates roadmap task status to "completed"',
      updateTaskRes.status === 200 && updatedTask?.status === 'completed'
    );

    // 11. Cascade Deletion (Evidence -> Mappings & Portfolio)
    console.log('\n[11/12] Testing Cascade Deletion Integrity');
    const delEvRes = await fetch(`${baseUrl}/api/users/${userId}/evidence/${ev1Id}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assertCondition('DELETE evidence returns 200', delEvRes.status === 200);

    const checkEvRes = await fetch(`${baseUrl}/api/users/${userId}/evidence/${ev1Id}`, { headers: authHeaders });
    assertCondition('Deleted evidence now returns 404 NOT_FOUND', checkEvRes.status === 404);

    const checkPortRes = await fetch(`${baseUrl}/api/users/${userId}/portfolio`, { headers: authHeaders });
    const checkPortData = await checkPortRes.json();
    assertCondition(
      'Portfolio automatically purged deleted evidence from selection',
      checkPortRes.status === 200 && checkPortData.data.selectedEvidence.every((e) => e.id !== ev1Id)
    );

    // 12. Coaching Staleness Verification
    console.log('\n[12/12] Testing Coaching Staleness Trigger');
    const staleRes = await fetch(`${baseUrl}/api/users/${userId}/coaching/latest`, { headers: authHeaders });
    const staleData = await staleRes.json();
    assertCondition(
      'GET /api/users/:userId/coaching/latest flags isStale === true after evidence removal',
      staleRes.status === 200 && staleData.data.isStale === true
    );

  } catch (err) {
    console.error('💥 Smoke test runtime exception:', err);
    failedCount++;
  } finally {
    server.close();
    await disconnectDb();
    if (mongod) await mongod.stop();

    console.log('\n================================================================');
    console.log(`📊 Smoke Test Summary: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('================================================================');
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runSmokeTests();
