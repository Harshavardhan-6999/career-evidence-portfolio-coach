/**
 * Module 2: Shared AI Client Adapter
 * Owner: P. Srihith Reddy (25071A66B9)
 *
 * Encapsulates the Google Gen AI SDK (@google/genai) integration.
 * Handles structured JSON output, timeouts, API key validation, error normalization,
 * and test stub injection so the app never makes paid calls during test suites.
 */

import { GoogleGenAI } from '@google/genai';
import { AppError } from '../validators/commonValidators.js';

const DEFAULT_MODEL = 'gemini-3.5-flash';
export const DEFAULT_TIMEOUT_MS = 60000;

// Test stub storage for deterministic testing without external calls
let currentStub = null;

/**
 * Check if the Gemini API key is present in environment.
 * @returns {boolean}
 */
export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Get active model name from environment or fallback default.
 * @returns {string}
 */
export function getAiModelName() {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

/**
 * Configure an in-memory stub for testing.
 * @param {(params: {systemInstruction: string, prompt: string, schema: any}) => Promise<any> | any} stubFn
 */
export function setAiStub(stubFn) {
  currentStub = stubFn;
}

/**
 * Check if a test stub is currently active.
 * @returns {boolean}
 */
export function isAiStubbed() {
  return Boolean(currentStub);
}

/**
 * Clear the current test stub.
 */
export function clearAiStub() {
  currentStub = null;
}

/**
 * Make a structured JSON call to Gemini or test stub.
 *
 * @param {object} options
 * @param {string} options.systemInstruction
 * @param {string} options.prompt
 * @param {object} options.schema
 * @param {number} [options.timeoutMs]
 * @param {string} [options.model]
 * @param {AbortSignal} [options.abortSignal]
 * @returns {Promise<any>} Parsed JSON response object
 */
export async function generateStructuredJson({
  systemInstruction,
  prompt,
  schema,
  timeoutMs = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  model = getAiModelName(),
  abortSignal = null
}) {
  // 1. If a test stub is injected, use it directly (zero cost, predictable tests)
  if (currentStub) {
    return await currentStub({ systemInstruction, prompt, schema, model });
  }

  // 2. Check credentials
  if (!isAiConfigured()) {
    throw new AppError(
      'Gemini API is not configured. Please set GEMINI_API_KEY in .env to enable live AI features.',
      503,
      'AI_SERVICE_UNAVAILABLE'
    );
  }

  const apiKey = process.env.GEMINI_API_KEY.trim();
  const ai = new GoogleGenAI({ apiKey });

  // 3. Setup AbortController for SDK-level request cancellation on timeout
  const abortController = new AbortController();

  if (abortSignal) {
    if (abortSignal.aborted) {
      abortController.abort();
    } else {
      abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      // Cancel the underlying provider request via AbortSignal
      abortController.abort();
      reject(new AppError(`AI service request exceeded ${timeoutMs}ms timeout limit`, 503, 'AI_SERVICE_UNAVAILABLE'));
    }, timeoutMs);
  });

  // Candidate model failover chain: Primary model first, followed by fast, high-availability fallbacks
  const primaryModel = model || getAiModelName();
  const fallbackCandidates = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
  const modelChain = [primaryModel, ...fallbackCandidates.filter((m) => m !== primaryModel)];

  // 4. Execute generateContent call with failover and single-attempt retry options
  try {
    for (let i = 0; i < modelChain.length; i++) {
      const currentModel = modelChain[i];
      const modelStart = Date.now();
      console.log(`[AIClient] Attempting structured JSON generation with model: ${currentModel} (${i + 1}/${modelChain.length})`);

      try {
        const apiCallPromise = ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            temperature: 0.1,
            abortSignal: abortController.signal,
            httpOptions: {
              retryOptions: {
                attempts: 1 // Fail fast on 429/503 to prevent hanging SDK retry loops
              }
            }
          }
        });

        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        clearTimeout(timerId);
        const duration = Date.now() - modelStart;
        console.log(`[AIClient] Model ${currentModel} responded successfully in ${duration}ms`);

        const rawText = response.text;
        if (!rawText) {
          throw new AppError('AI provider returned empty response body', 502, 'AI_INVALID_OUTPUT');
        }

        try {
          return JSON.parse(rawText);
        } catch (parseErr) {
          throw new AppError('AI provider returned invalid JSON syntax', 502, 'AI_INVALID_OUTPUT');
        }
      } catch (callErr) {
        if (abortController.signal.aborted) {
          throw callErr;
        }

        const isQuotaOrUnavailable =
          callErr?.status === 429 ||
          callErr?.status === 503 ||
          callErr?.message?.includes('429') ||
          callErr?.message?.includes('503') ||
          callErr?.message?.includes('quota') ||
          callErr?.message?.includes('high demand');

        const hasNextModel = i < modelChain.length - 1;

        if (isQuotaOrUnavailable && hasNextModel) {
          const duration = Date.now() - modelStart;
          console.warn(`[AIClient] Model ${currentModel} returned ${callErr.status || 503} after ${duration}ms. Failing over to ${modelChain[i + 1]}...`);
          continue;
        }

        throw callErr;
      }
    }
  } catch (err) {
    clearTimeout(timerId);

    // If request timed out and triggered abort
    if (abortController.signal.aborted) {
      throw new AppError(`AI service request exceeded ${timeoutMs}ms timeout limit`, 503, 'AI_SERVICE_UNAVAILABLE');
    }

    // If it's already an AppError, rethrow directly
    if (err instanceof AppError) {
      throw err;
    }

    // Check for provider abort error
    if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort')) {
      throw new AppError(`AI service request exceeded ${timeoutMs}ms timeout limit`, 503, 'AI_SERVICE_UNAVAILABLE');
    }

    // Sanitize any potential provider errors so secrets / raw dumps are not leaked
    const safeMessage = err && err.message ? err.message.replace(/key=[^&\s]+/gi, 'key=***') : 'Unknown AI error';
    throw new AppError(
      `AI service error: ${safeMessage}`,
      503,
      'AI_SERVICE_UNAVAILABLE'
    );
  }
}
