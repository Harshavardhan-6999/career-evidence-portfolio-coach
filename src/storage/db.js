/**
 * MongoDB Atlas Connection and Lifecycle Manager
 * Connects via Mongoose with resilience, health status tracking,
 * and automatic catalog seeding on first initialization.
 */

import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import '../models/Role.js';
import '../models/Skill.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });

let isConnecting = false;

/**
 * Get human-readable connection status.
 * @returns {'connected' | 'connecting' | 'disconnecting' | 'disconnected'}
 */
export function getDbStatus() {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

/**
 * Checks if MongoDB is currently in readyState 1 (connected).
 * @returns {boolean}
 */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Seeds static role and skill catalogs from data/*.json into MongoDB collections
 * if they do not yet exist in the database.
 */
export async function seedCatalogsIfEmpty() {
  if (!isDbConnected()) return;

  try {
    const Role = mongoose.model('Role');
    const Skill = mongoose.model('Skill');

    const roleCount = await Role.countDocuments();
    if (roleCount === 0) {
      const rolesPath = path.resolve(process.cwd(), 'data', 'roles.json');
      const rawRoles = await fs.readFile(rolesPath, 'utf8');
      const rolesData = JSON.parse(rawRoles);
      await Role.insertMany(rolesData);
      console.log(`📦 Seeded ${rolesData.length} educational roles into MongoDB.`);
    }

    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      const skillsPath = path.resolve(process.cwd(), 'data', 'skills.json');
      const rawSkills = await fs.readFile(skillsPath, 'utf8');
      const skillsData = JSON.parse(rawSkills);
      await Skill.insertMany(skillsData);
      console.log(`📦 Seeded ${skillsData.length} catalog skills into MongoDB.`);
    }
  } catch (err) {
    console.warn(`⚠️ Catalog auto-seed warning: ${err.message}`);
  }
}

/**
 * Extracts sanitized hostname from connection string without leaking credentials.
 * @param {string} rawUri
 * @returns {string}
 */
export function getSanitizedHost(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return 'none';
  try {
    const atIndex = rawUri.indexOf('@');
    const hostPart = atIndex !== -1 ? rawUri.slice(atIndex + 1) : rawUri.replace(/^mongodb(\+srv)?:\/\//, '');
    const cleanHost = hostPart.split('/')[0].split('?')[0];
    return cleanHost || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 *
 * @param {string} [customUri] Optional URI override (e.g. for in-memory testing)
 * @returns {Promise<typeof mongoose | null>}
 */
export async function connectDb(customUri = null) {
  if (isDbConnected()) {
    return mongoose;
  }

  // Ensure environment is loaded from project root if not already populated
  if (!process.env.MONGODB_URI) {
    dotenv.config({ path: rootEnvPath });
  }

  let uri = customUri || process.env.MONGODB_URI;

  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
    console.warn('⚠️  MONGODB_URI is not set. Database operations will report 503 until configured.');
    return null;
  }

  uri = uri.trim();

  // Strip wrapping single or double quotes
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // Safety guard: prevent accidental connections to remote Atlas database during test execution
  if (process.env.NODE_ENV === 'test') {
    if (uri && (uri.includes('mongodb.net') || uri.includes('mongodb+srv://'))) {
      throw new Error(
        `[CRITICAL ISOLATION ERROR] Attempted to connect to remote MongoDB Atlas cluster [${getSanitizedHost(uri)}] while NODE_ENV=test. Automated tests are strictly required to run against an isolated in-memory or localhost test database.`
      );
    }
  }

  // Ensure Atlas SRV host includes .mongodb.net suffix if omitted
  if (uri.startsWith('mongodb+srv://')) {
    const atIndex = uri.indexOf('@');
    if (atIndex !== -1) {
      const slashIndex = uri.indexOf('/', atIndex);
      const questionIndex = uri.indexOf('?', atIndex);
      const endHostIndex = slashIndex !== -1 ? slashIndex : (questionIndex !== -1 ? questionIndex : uri.length);
      const host = uri.slice(atIndex + 1, endHostIndex);
      if (host && !host.includes('.')) {
        uri = uri.slice(0, atIndex + 1) + host + '.mongodb.net' + uri.slice(endHostIndex);
      }
    }
  }

  if (isConnecting) {
    return mongoose;
  }

  const targetHost = getSanitizedHost(uri);

  try {
    isConnecting = true;
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`🍃 Connected to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);

    // Ensure catalogs are seeded
    await seedCatalogsIfEmpty();

    return mongoose;
  } catch (err) {
    console.error(`❌ MongoDB connection failed for host [${targetHost}]: ${err.message}`);
    // Do not crash server; allow health check and offline handlers to report status
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🍃 Disconnected from MongoDB.');
  }
}
