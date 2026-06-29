export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttribute(value: string) {
  return escapeHtml(value);
}

export function maskEmailAddress(email: string) {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) {
    return maskToken(email);
  }

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}*`
      : `${localPart.slice(0, 2)}***`;

  const domainSegments = domain.split('.');
  const domainName = domainSegments.shift() ?? '';
  const visibleDomain =
    domainName.length <= 2
      ? `${domainName[0] ?? '*'}*`
      : `${domainName.slice(0, 2)}***`;

  return `${visibleLocal}@${[visibleDomain, ...domainSegments].filter(Boolean).join('.')}`;
}

export function maskToken(token: string) {
  if (token.length <= 8) {
    return `${token.slice(0, 2)}***`;
  }

  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

export function maskSensitiveUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const token = url.searchParams.get('token');
    if (token) {
      url.searchParams.set('token', maskToken(token));
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}
