function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function buildApiUrl(path: string) {
  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
  );
  return base ? `${base}${path}` : path;
}
