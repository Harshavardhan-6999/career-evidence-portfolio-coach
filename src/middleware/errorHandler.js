/**
 * Module 2 & 9: Centralized Error Handler Middleware
 * Owners: P. Srihith Reddy (25071A66B9) & P. Sasikanth (25071A66C3)
 *
 * Catches all errors, formats them into a strict standard contract,
 * and ensures internal details/secrets/stack traces are never exposed to clients.
 */

import { AppError } from '../validators/commonValidators.js';
import { StoreCorruptedError } from '../storage/store.js';

export function errorHandler(err, req, res, next) {
  // 1. JSON parsing errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body'
      }
    });
  }

  // 2. Request body size limit exceeded
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeded maximum size limit (100kb)'
      }
    });
  }

  // 3. Known application validation or business logic errors
  if (err instanceof AppError) {
    const responseBody = {
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details) {
      responseBody.error.details = err.details;
    }
    return res.status(err.statusCode).json(responseBody);
  }

  // 4. Corrupted database store error
  if (err instanceof StoreCorruptedError) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'STORE_CORRUPTED',
        message: 'The local storage file is corrupted. Server is preserving data without overwriting.'
      }
    });
  }

  // 5. Fallback for unhandled unexpected internal errors (hide stack trace & secrets)
  console.error('[UNHANDLED_ERROR]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred'
    }
  });
}
