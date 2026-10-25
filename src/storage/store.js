/**
 * Module 3: Storage, Consistency, and Transaction Serialization
 * Owner: M. Harshavardhan (25071A66B1)
 *
 * Implements atomic, serialized file-based JSON storage.
 * All mutations run through an in-process queue mutex and write via a temp file + atomic rename.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_STORE_FILE = path.resolve(process.cwd(), 'data', 'store.json');
let activeStorePath = process.env.STORE_FILE_PATH
  ? path.resolve(process.env.STORE_FILE_PATH)
  : DEFAULT_STORE_FILE;

// Empty store schema
const INITIAL_STORE_STATE = Object.freeze({
  users: [],
  evidence: [],
  skillMappings: [],
  portfolios: [],
  coachingResults: []
});

/**
 * Custom error for corrupted store files to avoid accidental data overwrite.
 */
export class StoreCorruptedError extends Error {
  constructor(filePath, originalError) {
    super(`Store file at "${filePath}" contains corrupted or unparseable JSON: ${originalError.message}`);
    this.name = 'StoreCorruptedError';
    this.code = 'STORE_CORRUPTED';
    this.filePath = filePath;
  }
}

// In-process transaction queue promise chain
let transactionQueue = Promise.resolve();

/**
 * Configure the active store path (used for tests and script isolation).
 * @param {string} newPath
 */
export function setStoreFilePath(newPath) {
  activeStorePath = path.resolve(newPath);
}

/**
 * Get current store file path.
 * @returns {string}
 */
export function getStoreFilePath() {
  return activeStorePath;
}

/**
 * Deep clone an object to prevent unintended external mutations.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Ensure the directory for the store exists.
 * @param {string} filePath
 */
async function ensureStoreDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Safely load and parse the store file from disk.
 * If file does not exist, it initializes with INITIAL_STORE_STATE.
 * If file is corrupted, it throws StoreCorruptedError without overwriting.
 * @param {string} filePath
 * @returns {Promise<object>}
 */
async function readStoreFromDisk(filePath) {
  await ensureStoreDirectory(filePath);

  let rawContent;
  try {
    rawContent = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File does not exist yet; initialize safely
      const initial = deepClone(INITIAL_STORE_STATE);
      await writeStoreToDisk(filePath, initial);
      return initial;
    }
    throw err;
  }

  // Parse raw JSON
  try {
    const parsed = JSON.parse(rawContent);
    // Ensure all required collections exist
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      skillMappings: Array.isArray(parsed.skillMappings) ? parsed.skillMappings : [],
      portfolios: Array.isArray(parsed.portfolios) ? parsed.portfolios : [],
      coachingResults: Array.isArray(parsed.coachingResults) ? parsed.coachingResults : []
    };
  } catch (parseErr) {
    throw new StoreCorruptedError(filePath, parseErr);
  }
}

/**
 * Atomically write store data to disk using a temporary file and rename.
 * Includes retry loop for Windows file-system locking quirks.
 * @param {string} targetPath
 * @param {object} data
 */
async function writeStoreToDisk(targetPath, data) {
  await ensureStoreDirectory(targetPath);
  const dir = path.dirname(targetPath);
  const tempPath = path.join(dir, `${path.basename(targetPath)}.tmp.${crypto.randomUUID()}`);
  const serialized = JSON.stringify(data, null, 2);

  await fs.writeFile(tempPath, serialized, 'utf8');

  // Retry rename if Windows briefly locks the target
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fs.rename(tempPath, targetPath);
      return;
    } catch (renameErr) {
      if (attempt === maxRetries) {
        // Cleanup temp file if possible before throwing
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup failure
        }
        throw renameErr;
      }
      // Wait 20ms before retry
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

/**
 * Execute an operation serialized through the in-process queue.
 * Ensures that if an operation fails, the queue does not permanently deadlock.
 * @template T
 * @param {(store: object) => Promise<{ result: T, modified?: boolean } | T>} callback
 * @returns {Promise<T>}
 */
export function withStoreTransaction(callback) {
  // Chain on current queue; execute even if prior promise rejected
  const operation = async () => {
    const store = await readStoreFromDisk(activeStorePath);
    const storeSnapshot = deepClone(store);

    // Run callback with isolated store object
    const outcome = await callback(store);

    // If callback returned an object with { result, modified: true/false }
    let modified = true;
    let resultValue = outcome;
    if (outcome && typeof outcome === 'object' && 'modified' in outcome && 'result' in outcome) {
      modified = outcome.modified;
      resultValue = outcome.result;
    }

    if (modified) {
      await writeStoreToDisk(activeStorePath, store);
    }

    return resultValue;
  };

  const nextPromise = transactionQueue.then(operation, operation);
  // Keep queue alive even on rejection so future operations succeed
  transactionQueue = nextPromise.catch(() => {});
  return nextPromise;
}

/**
 * Read-only snapshot of the current store state.
 * @returns {Promise<object>}
 */
export async function getStore() {
  return withStoreTransaction(async (store) => {
    return {
      result: deepClone(store),
      modified: false
    };
  });
}

/**
 * Reset store with given data or empty schema (used for testing and explicit seed resets).
 * @param {object} [customData]
 * @returns {Promise<object>}
 */
export async function resetStore(customData = null) {
  return withStoreTransaction(async (store) => {
    const nextState = customData ? deepClone(customData) : deepClone(INITIAL_STORE_STATE);
    store.users = nextState.users || [];
    store.evidence = nextState.evidence || [];
    store.skillMappings = nextState.skillMappings || [];
    store.portfolios = nextState.portfolios || [];
    store.coachingResults = nextState.coachingResults || [];
    return {
      result: deepClone(store),
      modified: true
    };
  });
}
