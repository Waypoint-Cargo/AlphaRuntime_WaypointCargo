/**
 * SEC-5: Open Redirect Prevention
 *
 * Sanitize a redirect path from router location state before using it.
 * Allows only same-origin paths (starts with '/', not '//').
 * Falls back to the dashboard if the path is invalid or external.
 */
export function sanitizeRedirectPath(path, fallback) {
  if (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//')
  ) {
    return path;
  }
  return fallback;
}
