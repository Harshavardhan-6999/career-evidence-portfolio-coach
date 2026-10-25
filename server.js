/**
 * Module 2: Server Entrypoint
 * Owner: P. Srihith Reddy (25071A66B9)
 *
 * Boots the HTTP listener and connects to MongoDB Atlas.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicitly load .env from project root before importing application modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import app from './src/app.js';
import { connectDb, disconnectDb, getDbStatus } from './src/storage/db.js';
import { isAiConfigured, getAiModelName } from './src/ai/aiClient.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  // Connect to MongoDB
  await connectDb();

  const server = app.listen(PORT, HOST, () => {
    console.log('================================================================');
    console.log('🚀 Career Evidence and Portfolio Coach Server Started');
    console.log(`📍 URL:           http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`📦 Node.js:       ${process.version}`);
    console.log(`🍃 Database:      MongoDB Status: ${getDbStatus()}`);
    console.log(`🤖 AI Configured: ${isAiConfigured() ? `Yes (Model: ${getAiModelName()})` : 'No (Rule-based fallback active)'}`);
    console.log('================================================================');
  });

  // Graceful termination handling
  const shutdown = async () => {
    console.log('\nShutting down server gracefully...');
    server.close(async () => {
      await disconnectDb();
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
