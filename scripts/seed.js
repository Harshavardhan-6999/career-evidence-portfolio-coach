/**
 * Module 10: Safe Database Seed Script
 * Owner: K. Bhuvan (25071A66A6)
 *
 * Populates data/store.json with realistic, fictional student profiles,
 * evidence items, skill mappings, and portfolios.
 *
 * SAFETY RULE: Will NEVER overwrite existing store data unless run with the explicit --reset flag.
 */

import crypto from 'node:crypto';
import { getStore, resetStore, withStoreTransaction } from '../src/storage/store.js';

const isReset = process.argv.includes('--reset');

async function seed() {
  console.log('🌱 Starting database seed script...');

  const existing = await getStore();
  if (existing.users.length > 0 && !isReset) {
    console.log(`⚠️  Existing data detected (${existing.users.length} users, ${existing.evidence.length} evidence items).`);
    console.log('   Seed aborted to prevent accidental data loss.');
    console.log('   To wipe and reseed cleanly, run: npm run seed -- --reset');
    process.exit(0);
  }

  console.log(isReset ? '🧹 Resetting existing store data (--reset specified)...' : '📦 Initializing fresh store...');
  await resetStore();

  const now = new Date().toISOString();

  // -------------------------------------------------------------
  // Fictional Student 1: Aarav Sharma (Backend Developer Target)
  // -------------------------------------------------------------
  const user1Id = crypto.randomUUID();
  const ev1Id = crypto.randomUUID();
  const ev2Id = crypto.randomUUID();
  const ev3Id = crypto.randomUUID();

  const user1 = {
    id: user1Id,
    name: 'Aarav Sharma',
    education: 'B.Tech in Computer Science and Engineering, 3rd Year',
    interests: ['Distributed Systems', 'API Architecture', 'Relational Databases'],
    targetRoleId: 'role-backend-dev',
    bio: 'Aspiring backend engineer interested in scalable Node.js microservices and SQL performance tuning.',
    createdAt: now,
    updatedAt: now
  };

  const user1Evidence = [
    {
      id: ev1Id,
      userId: user1Id,
      type: 'project',
      title: 'Distributed Order Processing REST API',
      description: 'Engineered an asynchronous order processing API using Node.js and Express. Integrated PostgreSQL with indexed transactions and connection pooling to handle concurrent checkout operations.',
      date: '2026-03-15',
      supportingUrl: 'https://github.com/example-student/order-processing-api',
      createdAt: now,
      updatedAt: now
    },
    {
      id: ev2Id,
      userId: user1Id,
      type: 'internship',
      title: 'Backend Engineering Intern at CloudPulse',
      description: 'Implemented authenticated RESTful endpoints for tenant telemetry. Designed automated unit and integration tests using Node.js test runners, improving test coverage by 25%.',
      date: '2026-06-30',
      supportingUrl: 'https://example.com/internships/cloudpulse-verification',
      createdAt: now,
      updatedAt: now
    },
    {
      id: ev3Id,
      userId: user1Id,
      type: 'certification',
      title: 'Git Version Control & Collaboration Professional',
      description: 'Completed 30-hour verified curriculum on Git branching strategies, rebasing, merge conflict resolution, and CI/CD pull request workflows.',
      date: '2026-01-20',
      supportingUrl: 'https://credentials.example.edu/git-cert-10492',
      createdAt: now,
      updatedAt: now
    }
  ];

  const user1Mappings = [
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-nodejs', evidenceId: ev1Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-express', evidenceId: ev1Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-sql', evidenceId: ev1Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-rest-apis', evidenceId: ev1Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-nodejs', evidenceId: ev2Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-testing', evidenceId: ev2Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user1Id, skillId: 'skill-git', evidenceId: ev3Id, createdAt: now }
  ];

  const user1Portfolio = {
    id: crypto.randomUUID(),
    userId: user1Id,
    title: 'Aarav Sharma - Backend Systems & API Portfolio',
    selectedEvidenceIds: [ev1Id, ev2Id, ev3Id],
    createdAt: now,
    updatedAt: now
  };

  // -------------------------------------------------------------
  // Fictional Student 2: Maya Patel (Frontend Developer Target)
  // -------------------------------------------------------------
  const user2Id = crypto.randomUUID();
  const ev4Id = crypto.randomUUID();
  const ev5Id = crypto.randomUUID();

  const user2 = {
    id: user2Id,
    name: 'Maya Patel',
    education: 'B.Tech in Information Technology, Final Year',
    interests: ['Component Design Systems', 'Web Accessibility (a11y)', 'State Management'],
    targetRoleId: 'role-frontend-dev',
    bio: 'Frontend enthusiast focused on building accessible, responsive web interfaces with modern React and CSS.',
    createdAt: now,
    updatedAt: now
  };

  const user2Evidence = [
    {
      id: ev4Id,
      userId: user2Id,
      type: 'project',
      title: 'Accessible Design System Component Library',
      description: 'Created a reusable React component library with WCAG 2.1 AA compliance, keyboard navigation, and responsive CSS Grid/Flexbox layouts.',
      date: '2026-04-10',
      supportingUrl: 'https://github.com/example-student/accessible-ui-components',
      createdAt: now,
      updatedAt: now
    },
    {
      id: ev5Id,
      userId: user2Id,
      type: 'project',
      title: 'Real-Time Task Kanban Board',
      description: 'Developed an interactive drag-and-drop task dashboard using React and JavaScript ES6+. Connected to external REST APIs for live state synchronization.',
      date: '2026-05-22',
      supportingUrl: 'https://github.com/example-student/kanban-react-board',
      createdAt: now,
      updatedAt: now
    }
  ];

  const user2Mappings = [
    { id: crypto.randomUUID(), userId: user2Id, skillId: 'skill-react', evidenceId: ev4Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user2Id, skillId: 'skill-html-css', evidenceId: ev4Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user2Id, skillId: 'skill-responsive-design', evidenceId: ev4Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user2Id, skillId: 'skill-javascript', evidenceId: ev5Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user2Id, skillId: 'skill-rest-apis', evidenceId: ev5Id, createdAt: now }
  ];

  const user2Portfolio = {
    id: crypto.randomUUID(),
    userId: user2Id,
    title: 'Maya Patel - Frontend UI Engineering Showcase',
    selectedEvidenceIds: [ev4Id, ev5Id],
    createdAt: now,
    updatedAt: now
  };

  // -------------------------------------------------------------
  // Fictional Student 3: Liam Chen (Data Analyst Target)
  // -------------------------------------------------------------
  const user3Id = crypto.randomUUID();
  const ev6Id = crypto.randomUUID();

  const user3 = {
    id: user3Id,
    name: 'Liam Chen',
    education: 'B.Tech in Computer Science and Engineering, 3rd Year',
    interests: ['Statistical Modeling', 'Business Intelligence', 'Data Wrangling'],
    targetRoleId: 'role-data-analyst',
    bio: 'Data analyst dedicated to turning messy data into clear business narratives and visual dashboards.',
    createdAt: now,
    updatedAt: now
  };

  const user3Evidence = [
    {
      id: ev6Id,
      userId: user3Id,
      type: 'project',
      title: 'Urban Housing Trends Exploratory Analysis',
      description: 'Conducted exploratory data analysis across 50,000 real estate records using Python and Pandas. Designed interactive charts and calculated statistical regression metrics.',
      date: '2026-02-18',
      supportingUrl: 'https://github.com/example-student/housing-market-eda',
      createdAt: now,
      updatedAt: now
    }
  ];

  const user3Mappings = [
    { id: crypto.randomUUID(), userId: user3Id, skillId: 'skill-python', evidenceId: ev6Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user3Id, skillId: 'skill-pandas', evidenceId: ev6Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user3Id, skillId: 'skill-data-viz', evidenceId: ev6Id, createdAt: now },
    { id: crypto.randomUUID(), userId: user3Id, skillId: 'skill-stats', evidenceId: ev6Id, createdAt: now }
  ];

  const user3Portfolio = {
    id: crypto.randomUUID(),
    userId: user3Id,
    title: 'Liam Chen - Data Analytics & Statistics Projects',
    selectedEvidenceIds: [ev6Id],
    createdAt: now,
    updatedAt: now
  };

  // Commit all seed records atomically
  await withStoreTransaction(async (store) => {
    store.users.push(user1, user2, user3);
    store.evidence.push(...user1Evidence, ...user2Evidence, ...user3Evidence);
    store.skillMappings.push(...user1Mappings, ...user2Mappings, ...user3Mappings);
    store.portfolios.push(user1Portfolio, user2Portfolio, user3Portfolio);
    return { result: true, modified: true };
  });

  console.log('✅ Database successfully seeded!');
  console.log('----------------------------------------------------------------');
  console.log(`👤 Student 1 (Backend Dev):  ${user1.name} [ID: ${user1Id}]`);
  console.log(`👤 Student 2 (Frontend Dev): ${user2.name} [ID: ${user2Id}]`);
  console.log(`👤 Student 3 (Data Analyst): ${user3.name} [ID: ${user3Id}]`);
  console.log('----------------------------------------------------------------');
  console.log('💡 Tip: Use these IDs directly in Postman or curl tests.');
}

seed().catch((err) => {
  console.error('❌ Seed script failed:', err);
  process.exit(1);
});
