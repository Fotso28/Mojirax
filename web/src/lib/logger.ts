/**
 * Client-side logger that no-ops in production.
 *
 * Replace direct console.* calls to avoid leaking PII or internal state
 * to devtools of end-users. In development the messages still reach the
 * browser console for debugging.
 *
 * Never pass user-identifiable data (email, phone, skills, names, tokens)
 * — even in dev. Log identifiers or short status codes instead.
 */

const isDev = process.env.NODE_ENV !== 'production';

function noop(): void {}

export const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: isDev ? console.error.bind(console) : noop,
};
