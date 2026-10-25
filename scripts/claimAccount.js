/**
 * Account Claim Script for Legacy Profiles
 *
 * Allows a student to claim a legacy profile migrated from JSON store
 * by providing their verified email and password.
 *
 * Usage:
 *   node scripts/claimAccount.js --name "Aarav Sharma" --email "aarav@college.edu" --password "Aarav@2026!"
 *   node scripts/claimAccount.js --legacy-id "a341bbd6-e2c8-4136-a216-090767d6fdf6" --email "aarav@college.edu" --password "Aarav@2026!"
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/storage/db.js';
import { User } from '../src/models/User.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      result.name = args[i + 1];
      i++;
    } else if (args[i] === '--legacy-id' && args[i + 1]) {
      result.legacyId = args[i + 1];
      i++;
    } else if (args[i] === '--email' && args[i + 1]) {
      result.email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      result.password = args[i + 1];
      i++;
    }
  }
  return result;
}

async function claimAccount() {
  const { name, legacyId, email, password } = parseArgs();

  if ((!name && !legacyId) || !email || !password) {
    console.error('❌ Error: Missing required arguments.');
    console.log('Usage: node scripts/claimAccount.js --name <StudentName> --email <Email> --password <Password>');
    console.log('   or: node scripts/claimAccount.js --legacy-id <LegacyUUID> --email <Email> --password <Password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDb();

  const query = legacyId ? { legacyId } : { name: new RegExp(`^${name}$`, 'i') };
  const user = await User.findOne(query);

  if (!user) {
    console.error(`❌ Error: No student profile found matching query: ${JSON.stringify(query)}`);
    await disconnectDb();
    process.exit(1);
  }

  // Check if email is already in use by another account
  const emailInUse = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
  if (emailInUse) {
    console.error(`❌ Error: Email "${email}" is already registered to another student profile.`);
    await disconnectDb();
    process.exit(1);
  }

  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  user.email = email.toLowerCase();
  user.passwordHash = passwordHash;
  await user.save();

  console.log('================================================================');
  console.log(`✅ Student Profile Claimed Successfully!`);
  console.log(`👤 Student Name:  ${user.name}`);
  console.log(`📧 Login Email:   ${user.email}`);
  console.log(`🎯 Target Role:   ${user.targetRoleId}`);
  console.log(`🆔 MongoDB ID:    ${user._id}`);
  console.log('================================================================');

  await disconnectDb();
}

claimAccount().catch((err) => {
  console.error('❌ Claim failed:', err);
  process.exit(1);
});
