/**
 * Test Helper Utility for MongoDB In-Memory Testing & Ephemeral HTTP Servers
 * Owner: P. Sasikanth (25071A66C3)
 */

process.env.NODE_ENV = 'test';

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import app from '../src/app.js';
import { connectDb, disconnectDb, isDbConnected } from '../src/storage/db.js';
import { generateToken } from '../src/middleware/auth.js';
import { setStoreFilePath, resetStore } from '../src/storage/store.js';
import {
  User,
  Evidence,
  SkillMapping,
  Portfolio,
  CoachingResult,
  JobDescriptionAnalysis
} from '../src/models/index.js';

let mongodInstance = null;

/**
 * Creates an isolated temporary store environment for legacy JSON store unit tests.
 */
export async function createIsolatedTestStore() {
  const tempDir = path.resolve(process.cwd(), 'tests', 'fixtures');
  await fs.mkdir(tempDir, { recursive: true });
  const tempStorePath = path.join(tempDir, `test-store-${crypto.randomUUID()}.json`);
  setStoreFilePath(tempStorePath);
  await resetStore();

  return {
    tempStorePath,
    cleanup: async () => {
      try {
        await fs.unlink(tempStorePath);
      } catch {
        // ignore if already deleted
      }
    }
  };
}

/**
 * Initializes MongoMemoryServer and connects Mongoose for isolated testing.
 */
export async function setupTestDb() {
  process.env.NODE_ENV = 'test';
  if (!mongodInstance) {
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await connectDb(uri);
  } else if (!isDbConnected()) {
    await connectDb(mongodInstance.getUri());
  }

  // Strict isolation verification: confirm connected host is local in-memory
  const host = mongoose.connection.host;
  if (host && host.includes('mongodb.net')) {
    await disconnectDb();
    throw new Error(
      `CRITICAL ISOLATION FAILURE: Connected to remote Atlas host [${host}] during test setup! Aborting.`
    );
  }

  return mongodInstance;
}

/**
 * Disconnects Mongoose and stops MongoMemoryServer.
 */
export async function teardownTestDb() {
  if (mongodInstance) {
    await disconnectDb();
    await mongodInstance.stop();
    mongodInstance = null;
  }
}

/**
 * Resets mutable test data between tests while preserving Role and Skill catalogs.
 */
export async function clearTestData() {
  if (!isDbConnected()) return;

  // Strict isolation verification: confirm host is local before clearing any data
  const host = mongoose.connection.host;
  if (!host || host.includes('mongodb.net')) {
    throw new Error(
      `CRITICAL ISOLATION FAILURE: Attempted clearTestData on remote host [${host}]! Aborting to protect Atlas data.`
    );
  }

  await Promise.all([
    User.deleteMany({}),
    Evidence.deleteMany({}),
    SkillMapping.deleteMany({}),
    Portfolio.deleteMany({}),
    CoachingResult.deleteMany({}),
    JobDescriptionAnalysis.deleteMany({})
  ]);
}

/**
 * Boots Express app on an ephemeral port (0) for end-to-end integration testing.
 */
export async function createTestServer() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

/**
 * Factory to create an authenticated student user and generate auth headers.
 * @param {object} [overrides]
 */
export async function createAuthenticatedUser(overrides = {}) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('TestPass123!', salt);
  const rand = Math.floor(Math.random() * 100000);

  const user = await User.create({
    name: overrides.name || `Student Tester ${rand}`,
    email: overrides.email || `tester_${rand}@college.edu`,
    passwordHash,
    education: overrides.education || 'B.Tech CSE, 3rd Year',
    interests: overrides.interests || ['APIs', 'Node.js', 'Databases'],
    targetRoleId: overrides.targetRoleId || 'role-backend-dev',
    bio: overrides.bio || 'Testing bio description',
    role: overrides.role || 'student',
    legacyId: overrides.legacyId
  });

  const token = generateToken(user);
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  return {
    user: user.toJSON(),
    rawUser: user,
    token,
    authHeaders
  };
}
