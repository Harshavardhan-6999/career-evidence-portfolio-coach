/**
 * Module 1: Role Catalog and Requirements
 * Owner: N. Tharun Kumar (25071A66B8)
 *
 * Loads educational career role catalog from MongoDB with JSON file fallback.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Role } from '../models/Role.js';
import { isDbConnected } from '../storage/db.js';

let fileRolesCache = null;
const ROLES_FILE_PATH = path.resolve(process.cwd(), 'data', 'roles.json');

async function getRolesFromFile() {
  if (!fileRolesCache) {
    const raw = await fs.readFile(ROLES_FILE_PATH, 'utf8');
    fileRolesCache = JSON.parse(raw);
  }
  return fileRolesCache;
}

/**
 * Loads role catalog from MongoDB or file cache fallback.
 * @returns {Promise<Array<{id: string, name: string, description: string, expectedSkillIds: string[]}>>}
 */
export async function getRoles() {
  if (isDbConnected()) {
    try {
      const roles = await Role.find({}).lean();
      if (roles.length > 0) {
        return roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          expectedSkillIds: r.expectedSkillIds
        }));
      }
    } catch {
      // Fall through to file fallback
    }
  }
  return getRolesFromFile();
}

/**
 * Find a specific role by ID.
 * @param {string} roleId
 * @returns {Promise<object|null>}
 */
export async function getRoleById(roleId) {
  if (isDbConnected()) {
    try {
      const role = await Role.findOne({ id: roleId }).lean();
      if (role) {
        return {
          id: role.id,
          name: role.name,
          description: role.description,
          expectedSkillIds: role.expectedSkillIds
        };
      }
    } catch {
      // Fall through to file fallback
    }
  }
  const roles = await getRolesFromFile();
  return roles.find((r) => r.id === roleId) || null;
}
