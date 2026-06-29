import type { Response } from 'express';
import { serialize } from 'cookie';
import { env } from '../config/env';

export const csrfCookieName = `${env.sessionCookieName}_csrf`;
export const oauthStateCookieName = `${env.sessionCookieName}_oauth_state`;
export const oauthVerifierCookieName = `${env.sessionCookieName}_oauth_verifier`;

export function buildCookieScope(input: {
  isProduction: boolean;
  sessionCookieDomain?: string;
}) {
  return {
    sameSite: 'lax' as const,
    secure: input.isProduction,
    domain: input.sessionCookieDomain || undefined,
    path: '/' as const,
  };
}

export function buildHostOnlyCookieScope(input: { isProduction: boolean }) {
  return {
    sameSite: 'lax' as const,
    secure: input.isProduction,
    path: '/' as const,
  };
}

function cookieOptions(httpOnly: boolean, maxAgeSeconds?: number) {
  return {
    httpOnly,
    ...buildCookieScope({
      isProduction: env.isProduction,
      sessionCookieDomain: env.sessionCookieDomain,
    }),
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  };
}

function hostOnlyCookieOptions(httpOnly: boolean, maxAgeSeconds?: number) {
  return {
    httpOnly,
    ...buildHostOnlyCookieScope({
      isProduction: env.isProduction,
    }),
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  };
}

function clearLegacyHostOnlyCookie(res: Response, name: string, httpOnly: boolean) {
  if (!env.sessionCookieDomain) {
    return;
  }

  res.append(
    'Set-Cookie',
    serialize(name, '', {
      ...hostOnlyCookieOptions(httpOnly),
      expires: new Date(0),
    }),
  );
}

export function setSessionCookies(input: {
  res: Response;
  sessionToken: string;
  csrfToken: string;
}) {
  clearLegacyHostOnlyCookie(input.res, env.sessionCookieName, true);
  clearLegacyHostOnlyCookie(input.res, csrfCookieName, false);
  input.res.append(
    'Set-Cookie',
    serialize(
      env.sessionCookieName,
      input.sessionToken,
      cookieOptions(true, 14 * 24 * 60 * 60),
    ),
  );
  input.res.append(
    'Set-Cookie',
    serialize(
      csrfCookieName,
      input.csrfToken,
      cookieOptions(false, 14 * 24 * 60 * 60),
    ),
  );
}

export function clearSessionCookies(res: Response) {
  clearLegacyHostOnlyCookie(res, env.sessionCookieName, true);
  clearLegacyHostOnlyCookie(res, csrfCookieName, false);
  res.append(
    'Set-Cookie',
    serialize(env.sessionCookieName, '', {
      ...cookieOptions(true),
      expires: new Date(0),
    }),
  );
  res.append(
    'Set-Cookie',
    serialize(csrfCookieName, '', {
      ...cookieOptions(false),
      expires: new Date(0),
    }),
  );
}

export function setAnonymousCsrfCookie(res: Response, csrfToken: string) {
  clearLegacyHostOnlyCookie(res, csrfCookieName, false);
  res.append(
    'Set-Cookie',
    serialize(csrfCookieName, csrfToken, cookieOptions(false, 2 * 60 * 60)),
  );
}

export function setOAuthCookies(input: {
  res: Response;
  state: string;
  verifier: string;
}) {
  clearLegacyHostOnlyCookie(input.res, oauthStateCookieName, true);
  clearLegacyHostOnlyCookie(input.res, oauthVerifierCookieName, true);
  input.res.append(
    'Set-Cookie',
    serialize(oauthStateCookieName, input.state, cookieOptions(true, 10 * 60)),
  );
  input.res.append(
    'Set-Cookie',
    serialize(
      oauthVerifierCookieName,
      input.verifier,
      cookieOptions(true, 10 * 60),
    ),
  );
}

export function clearOAuthCookies(res: Response) {
  clearLegacyHostOnlyCookie(res, oauthStateCookieName, true);
  clearLegacyHostOnlyCookie(res, oauthVerifierCookieName, true);
  res.append(
    'Set-Cookie',
    serialize(oauthStateCookieName, '', {
      ...cookieOptions(true),
      expires: new Date(0),
    }),
  );
  res.append(
    'Set-Cookie',
    serialize(oauthVerifierCookieName, '', {
      ...cookieOptions(true),
      expires: new Date(0),
    }),
  );
}
