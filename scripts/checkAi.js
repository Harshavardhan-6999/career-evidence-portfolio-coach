/**
 * Module 2 & 10: Gemini AI Connectivity and Structured Output Check Script
 * Owners: P. Srihith Reddy (25071A66B9) & K. Bhuvan (25071A66A6)
 *
 * Checks if GEMINI_API_KEY is configured and verifies model connectivity.
 * If credentials are not configured, it records that real AI verification is pending
 * without throwing errors or breaking CI/CD pipelines.
 */

import 'dotenv/config';
import { Type } from '@google/genai';
import { isAiConfigured, getAiModelName, generateStructuredJson } from '../src/ai/aiClient.js';

async function checkAi() {
  console.log('🤖 Career Evidence & Portfolio Coach - AI Verification Utility');
  console.log('================================================================');

  if (!isAiConfigured()) {
    console.log('ℹ️  STATUS: GEMINI_API_KEY is NOT set in environment or .env file.');
    console.log('');
    console.log('📋 Educational Prototype Information:');
    console.log('   - The backend is currently operating in DETERMINISTIC RULE-BASED MODE.');
    console.log('   - All standard REST APIs (profiles, evidence, skills, role-gap, portfolio) work 100%.');
    console.log('   - Coaching returns transparent, rule-based feedback (source: "rules").');
    console.log('');
    console.log('🔑 How to enable live Gemini AI integration:');
    console.log('   1. Visit Google AI Studio at: https://aistudio.google.com/');
    console.log('   2. Generate a free API key.');
    console.log('   3. Add the key to your .env file:');
    console.log('      GEMINI_API_KEY=your_actual_api_key_here');
    console.log(`      AI_MODEL=${getAiModelName()}`);
    console.log('   4. Re-run this check script: npm run check-ai');
    console.log('');
    console.log('📌 Verification Record: Live AI model verification is PENDING credentials.');
    process.exit(0);
  }

  const model = getAiModelName();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 60000;

  console.log('🔑 GEMINI_API_KEY detected: [Configured]');
  console.log(`🎯 Target Model:           ${model}`);
  console.log(`⏱️  Configured Timeout:     ${timeoutMs}ms`);
  console.log('⏳ Sending test structured JSON request through shared AI client...');

  try {
    const parsed = await generateStructuredJson({
      systemInstruction: 'You are a technical educator. Respond in structured JSON only.',
      prompt: 'Classify the skill level required to write a basic Express GET endpoint.',
      schema: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          status: { type: Type.STRING }
        },
        required: ['concept', 'difficulty', 'status']
      },
      timeoutMs,
      model
    });

    console.log('✅ Gemini API Response Received and Parsed Successfully:');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('================================================================');
    console.log('🎉 Live AI Verification SUCCESSFUL! Structured outputs are operational.');
  } catch (err) {
    console.error('❌ Gemini API Verification FAILED:');
    console.error(`   Message: ${err.message}`);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   - Check your network connectivity.');
    console.log('   - Verify your API key has quota and permissions in Google AI Studio.');
    console.log(`   - Confirm that model "${model}" is supported in your region.`);
    process.exit(1);
  }
}

checkAi();
