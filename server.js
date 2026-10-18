/**
 * Module 2: Server Entrypoint
 * Owner: P. Srihith Reddy (25071A66B9)
 *
 * Boots the HTTP listener on local loopback interface (127.0.0.1) by default.
 */

import 'dotenv/config';
import app from './src/app.js';
import { isAiConfigured, getAiModelName } from './src/ai/aiClient.js';
import { getStoreFilePath } from './src/storage/store.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log('🚀 Career Evidence and Portfolio Coach Backend Started');
  console.log(`📍 URL:           http://${HOST}:${PORT}`);
  console.log(`📦 Node.js:       ${process.version}`);
  console.log(`💾 Store Path:    ${getStoreFilePath()}`);
  console.log(`🤖 AI Configured: ${isAiConfigured() ? `Yes (Model: ${getAiModelName()})` : 'No (Rule-based fallback active)'}`);
  console.log('================================================================');
});

// Graceful termination handling
const shutdown = () => {
  console.log('\nShutting down server gracefully...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
