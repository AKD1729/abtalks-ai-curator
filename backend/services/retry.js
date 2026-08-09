/**
 * Retry Utility with Exponential Backoff
 */

async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 2;
  const initialDelayMs = options.initialDelayMs || 800;
  const backoffFactor = options.backoffFactor || 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }
      console.warn(`[Retry] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}

module.exports = {
  withRetry
};
