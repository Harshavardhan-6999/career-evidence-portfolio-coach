/**
 * Data Migration Script: JSON Store -> MongoDB Atlas
 *
 * Requirements:
 * 1. Preserves data/store.json before migrating by creating a timestamped backup in data/backups/.
 * 2. Provides safe --dry-run and explicit --execute flags.
 * 3. Safe for reruns: uses legacyId indexing to avoid duplicate insertions.
 * 4. Maintains ID mappings from legacy UUIDs to MongoDB ObjectIds for referential integrity.
 * 5. Does not fabricate shared/default passwords for legacy unauthenticated profiles;
 *    generates unguessable secure placeholders and marks profiles with legacyId for account claiming.
 *
 * Usage:
 *   node scripts/migrateToMongo.js --dry-run
 *   node scripts/migrateToMongo.js --execute
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDb, disconnectDb } from '../src/storage/db.js';
import { User } from '../src/models/User.js';
import { Evidence } from '../src/models/Evidence.js';
import { Skill } from '../src/models/Skill.js';
import { Role } from '../src/models/Role.js';
import { SkillMapping } from '../src/models/SkillMapping.js';
import { Portfolio } from '../src/models/Portfolio.js';
import { CoachingResult } from '../src/models/CoachingResult.js';

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

async function backupJsonStore() {
  const sourcePath = path.resolve(process.cwd(), 'data', 'store.json');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `store_backup_${timestamp}.json`);

  const rawData = await fs.readFile(sourcePath, 'utf8');
  await fs.writeFile(backupPath, rawData, 'utf8');
  console.log(`🔒 Preserved original JSON store backup at:\n   ${backupPath}`);
  return JSON.parse(rawData);
}

async function runMigration() {
  console.log('================================================================');
  console.log('🔄 Career Evidence & Portfolio Coach - MongoDB Data Migration');
  console.log(`⚙️  Mode: ${isDryRun ? 'DRY-RUN (Simulated, no changes applied)' : 'EXECUTE (Applying changes to MongoDB)'}`);
  console.log('================================================================\n');

  // Step 1: Backup JSON Store
  const storeData = await backupJsonStore();

  const users = storeData.users || [];
  const evidence = storeData.evidence || [];
  const skillMappings = storeData.skillMappings || [];
  const portfolios = storeData.portfolios || [];
  const coachingResults = storeData.coachingResults || [];

  console.log(`\nFound JSON records:`);
  console.log(` - Users:            ${users.length}`);
  console.log(` - Evidence:         ${evidence.length}`);
  console.log(` - Skill Mappings:   ${skillMappings.length}`);
  console.log(` - Portfolios:       ${portfolios.length}`);
  console.log(` - Coaching Results: ${coachingResults.length}\n`);

  if (isDryRun) {
    console.log('🔍 [DRY-RUN] Verifying integrity and reference mappings:');

    const userIds = new Set(users.map((u) => u.id));
    const evidenceIds = new Set(evidence.map((e) => e.id));

    let danglingEvidence = 0;
    for (const e of evidence) {
      if (!userIds.has(e.userId)) danglingEvidence++;
    }

    let danglingMappings = 0;
    for (const m of skillMappings) {
      if (!userIds.has(m.userId) || !evidenceIds.has(m.evidenceId)) danglingMappings++;
    }

    let danglingPortfolios = 0;
    for (const p of portfolios) {
      if (!userIds.has(p.userId)) danglingPortfolios++;
    }

    console.log(` - Dangling Evidence:  ${danglingEvidence}`);
    console.log(` - Dangling Mappings:  ${danglingMappings}`);
    console.log(` - Dangling Portfolios: ${danglingPortfolios}`);
    console.log('\n✅ Dry run completed successfully. No database writes were performed.');
    console.log('👉 To apply this migration to MongoDB Atlas, run:');
    console.log('   node scripts/migrateToMongo.js --execute\n');
    return;
  }

  // Step 2: Connect to MongoDB
  await connectDb();

  // Maps to convert legacy UUIDs to new MongoDB ObjectIds
  const userIdMap = new Map();
  const evidenceIdMap = new Map();
  const portfolioIdMap = new Map();

  console.log('\n--- 1. Migrating Users ---');
  for (const u of users) {
    let existingUser = await User.findOne({ legacyId: u.id });
    if (!existingUser) {
      // Secure unguessable randomized password placeholder for unclaimed accounts
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);
      const email = u.email || `legacy_${u.id.slice(0, 8)}@unclaimed.local`;

      existingUser = await User.create({
        name: u.name,
        email,
        passwordHash,
        education: u.education || 'Not specified',
        interests: u.interests || [],
        targetRoleId: u.targetRoleId,
        bio: u.bio || '',
        role: 'student',
        legacyId: u.id,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
      });
      console.log(`  + Created user: ${u.name} (Legacy ID: ${u.id} -> MongoDB ID: ${existingUser._id})`);
    } else {
      console.log(`  = User already exists: ${u.name} (MongoDB ID: ${existingUser._id})`);
    }
    userIdMap.set(u.id, existingUser._id);
  }

  console.log('\n--- 2. Migrating Evidence ---');
  for (const ev of evidence) {
    const mongoUserId = userIdMap.get(ev.userId);
    if (!mongoUserId) {
      console.warn(`  ⚠️ Skipping evidence "${ev.title}": referenced userId ${ev.userId} not found`);
      continue;
    }

    let existingEvidence = await Evidence.findOne({ legacyId: ev.id });
    if (!existingEvidence) {
      existingEvidence = await Evidence.create({
        userId: mongoUserId,
        type: ev.type,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        supportingUrl: ev.supportingUrl || '',
        legacyId: ev.id,
        createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
        updatedAt: ev.updatedAt ? new Date(ev.updatedAt) : new Date()
      });
      console.log(`  + Created evidence: ${ev.title} (Legacy: ${ev.id} -> MongoDB: ${existingEvidence._id})`);
    } else {
      console.log(`  = Evidence already exists: ${ev.title}`);
    }
    evidenceIdMap.set(ev.id, existingEvidence._id);
  }

  console.log('\n--- 3. Migrating Skill Mappings ---');
  let mappingsCreated = 0;
  for (const m of skillMappings) {
    const mongoUserId = userIdMap.get(m.userId);
    const mongoEvidenceId = evidenceIdMap.get(m.evidenceId);

    if (!mongoUserId || !mongoEvidenceId) {
      console.warn(`  ⚠️ Skipping mapping ${m.id}: invalid user or evidence reference`);
      continue;
    }

    const existingMapping = await SkillMapping.findOne({
      userId: mongoUserId,
      skillId: m.skillId,
      evidenceId: mongoEvidenceId
    });

    if (!existingMapping) {
      await SkillMapping.create({
        userId: mongoUserId,
        skillId: m.skillId,
        evidenceId: mongoEvidenceId,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
      });
      mappingsCreated++;
    }
  }
  console.log(`  + Verified/Inserted ${mappingsCreated} skill mappings.`);

  console.log('\n--- 4. Migrating Portfolios ---');
  for (const p of portfolios) {
    const mongoUserId = userIdMap.get(p.userId);
    if (!mongoUserId) continue;

    // Map legacy evidence UUIDs to MongoDB ObjectIds preserving exact selection order
    const mappedSelectedEvidenceIds = (p.selectedEvidenceIds || [])
      .map((legacyEvId) => evidenceIdMap.get(legacyEvId))
      .filter(Boolean);

    let existingPortfolio = await Portfolio.findOne({ userId: mongoUserId });
    if (!existingPortfolio) {
      existingPortfolio = await Portfolio.create({
        userId: mongoUserId,
        title: p.title,
        selectedEvidenceIds: mappedSelectedEvidenceIds,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
      });
      console.log(`  + Created portfolio "${p.title}" for user ${mongoUserId}`);
    } else {
      console.log(`  = Portfolio already exists for user ${mongoUserId}`);
    }
    portfolioIdMap.set(p.id, existingPortfolio._id);
  }

  console.log('\n--- 5. Migrating Coaching Results ---');
  for (const c of coachingResults) {
    const mongoUserId = userIdMap.get(c.userId);
    const mongoPortfolioId = portfolioIdMap.get(c.portfolioId);

    if (!mongoUserId || !mongoPortfolioId) continue;

    const existingCoaching = await CoachingResult.findOne({
      userId: mongoUserId,
      createdAt: c.createdAt ? new Date(c.createdAt) : { $exists: true }
    });

    if (!existingCoaching) {
      // Map supporting evidence references
      const mapSupportingIds = (items = []) =>
        items.map((item) => ({
          ...item,
          supportingEvidenceIds: (item.supportingEvidenceIds || [])
            .map((id) => evidenceIdMap.get(id))
            .filter(Boolean)
        }));

      const strengths = mapSupportingIds(c.strengths);
      const evidenceGaps = mapSupportingIds(c.evidenceGaps);
      const nextSteps = mapSupportingIds(c.nextSteps);

      // Build interactive roadmap tasks from nextSteps
      const roadmap = (c.nextSteps || []).map((step, idx) => ({
        id: `task-${idx + 1}`,
        task: step.action,
        reason: step.reason,
        priority: step.priority || 'medium',
        status: 'todo',
        supportingEvidenceIds: (step.supportingEvidenceIds || [])
          .map((id) => evidenceIdMap.get(id))
          .filter(Boolean)
      }));

      await CoachingResult.create({
        userId: mongoUserId,
        portfolioId: mongoPortfolioId,
        source: c.source || 'rules',
        strengths,
        evidenceGaps,
        nextSteps,
        roadmap,
        inputSnapshot: c.inputSnapshot || {},
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
      });
      console.log(`  + Migrated coaching result for user ${mongoUserId}`);
    }
  }

  await disconnectDb();
  console.log('\n🎉 Migration completed successfully and safely!');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
