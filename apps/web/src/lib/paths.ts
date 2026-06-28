export function getSafeReturnPath(
  value: string | null | undefined,
  fallback = '/app',
) {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

  if (value.startsWith('//') || value.startsWith('/auth/')) {
    return fallback;
  }

  return value;
}

export function buildSignInHref(returnPath?: string) {
  const next = getSafeReturnPath(returnPath, '/app');
  return `/sign-in?next=${encodeURIComponent(next)}`;
}
