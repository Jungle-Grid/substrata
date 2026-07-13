import fs from 'node:fs';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const INSECURE_SECRETS = new Set([
  'change-me',
  'changeme',
  'replace-me',
  'replace-with-a-long-random-secret',
  'local-demo-only-replace-before-any-shared-deployment',
  'secret',
  'substrata',
]);
const INTERNAL_HOSTS = new Set([
  'api',
  'postgres',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal',
]);

export function parseEnvText(text) {
  const values = {};
  for (const [index, sourceLine] of text.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) {
      throw new Error(`Invalid environment assignment on line ${index + 1}.`);
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      throw new Error(
        `Invalid environment variable name on line ${index + 1}.`,
      );
    }
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function readEnvFile(filePath) {
  return parseEnvText(fs.readFileSync(filePath, 'utf8'));
}

export function resolveEnvFileArgument(args) {
  const envFileIndex = args.indexOf('--env-file');
  if (envFileIndex >= 0) {
    const filePath = args[envFileIndex + 1];
    if (!filePath || filePath.startsWith('--')) {
      throw new Error('--env-file requires a path.');
    }
    return filePath;
  }
  return args[0] ?? 'infra/.env.production';
}

function present(env, key) {
  return Boolean(env[key]?.trim());
}

function booleanValue(env, key, errors, defaultValue = false) {
  if (!present(env, key)) return defaultValue;
  const value = env[key].trim().toLowerCase();
  if (!TRUE_VALUES.has(value) && !FALSE_VALUES.has(value)) {
    errors.push(
      `${key} must be a boolean (true/false, 1/0, yes/no, or on/off).`,
    );
    return defaultValue;
  }
  return TRUE_VALUES.has(value);
}

function requireValue(env, key, errors) {
  if (!present(env, key)) errors.push(`${key} is required.`);
}

function validatePort(env, key, errors) {
  if (!present(env, key)) return;
  const value = Number(env[key]);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    errors.push(`${key} must be an integer from 1 to 65535.`);
  }
}

function validateInteger(env, key, errors, minimum) {
  if (!present(env, key)) return;
  const value = Number(env[key]);
  if (!Number.isInteger(value) || value < minimum) {
    errors.push(
      `${key} must be an integer greater than or equal to ${minimum}.`,
    );
  }
}

function validateNumber(env, key, errors, minimum) {
  if (!present(env, key)) return;
  const value = Number(env[key]);
  if (!Number.isFinite(value) || value < minimum) {
    errors.push(`${key} must be a number greater than or equal to ${minimum}.`);
  }
}

function validateUrl(env, key, errors, { publicUrl = false } = {}) {
  if (!present(env, key)) return;
  let parsed;
  try {
    parsed = new URL(env[key]);
  } catch {
    errors.push(`${key} must be an absolute HTTP or HTTPS URL.`);
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    errors.push(`${key} must use http or https.`);
  }
  if (publicUrl && INTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    errors.push(
      `${key} must be browser-accessible and cannot use an internal Docker or loopback hostname.`,
    );
  }
}

function enabledWithAlias(env, canonical, alias, errors, warnings) {
  const canonicalPresent = present(env, canonical);
  const aliasPresent = present(env, alias);
  if (
    canonicalPresent &&
    aliasPresent &&
    env[canonical].trim().toLowerCase() !== env[alias].trim().toLowerCase()
  ) {
    errors.push(
      `${canonical} and deprecated ${alias} disagree; remove the alias.`,
    );
  }
  if (!canonicalPresent && aliasPresent) {
    warnings.push(`${alias} is deprecated; rename it to ${canonical}.`);
    return booleanValue(env, alias, errors);
  }
  return booleanValue(env, canonical, errors);
}

export function validateProductionEnv(env) {
  const errors = [];
  const warnings = [];

  for (const key of [
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'APP_URL',
    'WEB_APP_URL',
    'API_URL',
    'NEXT_PUBLIC_API_BASE_URL',
    'API_CORS_ORIGIN',
    'API_PORT',
    'WEB_PORT',
    'SESSION_SECRET',
    'EMAIL_PROVIDER',
    'STORAGE_DRIVER',
  ]) {
    requireValue(env, key, errors);
  }

  if (present(env, 'NODE_ENV') && env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV must be production.');
  }

  for (const key of [
    'APP_URL',
    'WEB_APP_URL',
    'API_URL',
    'NEXT_PUBLIC_API_BASE_URL',
    'API_CORS_ORIGIN',
  ]) {
    validateUrl(env, key, errors, { publicUrl: true });
  }
  for (const key of [
    'GOOGLE_OAUTH_REDIRECT_URI',
    'FIREWORKS_BASE_URL',
    'JUNGLE_GRID_API_URL',
    'LOCAL_GEMMA_BASE_URL',
    'OLLAMA_HOST',
  ]) {
    validateUrl(env, key, errors);
  }

  for (const key of ['API_PORT', 'WEB_PORT', 'POSTGRES_PORT'])
    validatePort(env, key, errors);
  validateInteger(env, 'AI_MAX_INPUT_CHARS', errors, 4000);
  validateInteger(env, 'SUBSTRATA_MIN_OWNED_PRODUCT_EVIDENCE', errors, 1);
  validateInteger(env, 'LOCAL_GEMMA_MAX_NEW_TOKENS', errors, 1);
  validateInteger(env, 'FIREWORKS_MAX_RETRIES', errors, 0);
  validateNumber(env, 'LOCAL_GEMMA_TEMPERATURE', errors, 0);
  validateNumber(env, 'FIREWORKS_TIMEOUT_SECONDS', errors, 5);
  validateNumber(env, 'FIREWORKS_INPUT_TOKEN_USD', errors, 0);
  validateNumber(env, 'FIREWORKS_OUTPUT_TOKEN_USD', errors, 0);

  for (const key of [
    'GOOGLE_OAUTH_ENABLED',
    'GEMINI_ENABLED',
    'AI_FALLBACK_TO_HEURISTIC',
    'LOCAL_GEMMA_ENABLED',
    'FIREWORKS_ENABLED',
    'AMD_NOTEBOOK_MANUAL_ENABLED',
  ]) {
    booleanValue(env, key, errors);
  }
  enabledWithAlias(
    env,
    'JUNGLE_GRID_ENABLED',
    'JUNGLEGRID_ENABLED',
    errors,
    warnings,
  );

  const sessionSecret = env.SESSION_SECRET?.trim() ?? '';
  if (
    sessionSecret &&
    (sessionSecret.length < 32 ||
      INSECURE_SECRETS.has(sessionSecret.toLowerCase()))
  ) {
    errors.push(
      'SESSION_SECRET must be at least 32 characters and must not use a known insecure placeholder.',
    );
  }
  const databasePassword = env.POSTGRES_PASSWORD?.trim() ?? '';
  if (
    databasePassword &&
    INSECURE_SECRETS.has(databasePassword.toLowerCase())
  ) {
    errors.push('POSTGRES_PASSWORD must not use a known insecure placeholder.');
  }
  for (const key of ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']) {
    if (present(env, key) && encodeURIComponent(env[key]) !== env[key]) {
      errors.push(
        `${key} must use URL-safe characters because Compose constructs the internal DATABASE_URL.`,
      );
    }
  }

  const emailProvider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (emailProvider && !['console', 'zeptomail'].includes(emailProvider)) {
    errors.push('EMAIL_PROVIDER must be console or zeptomail.');
  }
  if (emailProvider === 'console') {
    errors.push('EMAIL_PROVIDER=console is not allowed in production.');
  }
  if (emailProvider === 'zeptomail') {
    if (
      !present(env, 'ZEPTOMAIL_SEND_MAIL_TOKEN') &&
      !present(env, 'ZEPTO_MAIL_API_TOKEN')
    ) {
      errors.push(
        'ZEPTOMAIL_SEND_MAIL_TOKEN is required when EMAIL_PROVIDER=zeptomail.',
      );
    }
    requireValue(env, 'EMAIL_FROM_ADDRESS', errors);
  }
  if (
    !present(env, 'ZEPTOMAIL_SEND_MAIL_TOKEN') &&
    present(env, 'ZEPTO_MAIL_API_TOKEN')
  ) {
    warnings.push(
      'ZEPTO_MAIL_API_TOKEN is deprecated; rename it to ZEPTOMAIL_SEND_MAIL_TOKEN.',
    );
  }

  if (booleanValue(env, 'GOOGLE_OAUTH_ENABLED', errors)) {
    requireValue(env, 'GOOGLE_CLIENT_ID', errors);
    requireValue(env, 'GOOGLE_CLIENT_SECRET', errors);
    requireValue(env, 'GOOGLE_OAUTH_REDIRECT_URI', errors);
  }
  if (booleanValue(env, 'GEMINI_ENABLED', errors)) {
    requireValue(env, 'GEMINI_API_KEY', errors);
    warnings.push(
      'Gemini configuration validates, but Gemini is not wired into the current execution router.',
    );
  }
  if (booleanValue(env, 'FIREWORKS_ENABLED', errors)) {
    requireValue(env, 'FIREWORKS_API_KEY', errors);
  }
  if (
    enabledWithAlias(
      env,
      'JUNGLE_GRID_ENABLED',
      'JUNGLEGRID_ENABLED',
      errors,
      [],
    )
  ) {
    requireValue(env, 'JUNGLE_GRID_API_KEY', errors);
  }
  if (booleanValue(env, 'LOCAL_GEMMA_ENABLED', errors)) {
    requireValue(env, 'LOCAL_GEMMA_MODEL', errors);
    if (!present(env, 'LOCAL_GEMMA_BASE_URL') && !present(env, 'OLLAMA_HOST')) {
      errors.push(
        'LOCAL_GEMMA_BASE_URL or OLLAMA_HOST is required when LOCAL_GEMMA_ENABLED=true.',
      );
    }
  }

  if (env.STORAGE_DRIVER && env.STORAGE_DRIVER !== 'local') {
    errors.push(
      'STORAGE_DRIVER must be local for the current production Compose stack.',
    );
  }
  if (
    present(env, 'LOCAL_STORAGE_ROOT') &&
    !env.LOCAL_STORAGE_ROOT.startsWith('/')
  ) {
    errors.push(
      'LOCAL_STORAGE_ROOT must be an absolute container path in production.',
    );
  }
  if (present(env, 'DATABASE_URL')) {
    warnings.push(
      'DATABASE_URL is ignored by production Compose; it constructs the internal URL from POSTGRES_* variables.',
    );
  }
  for (const unused of [
    'AI_ENABLED',
    'AI_PROVIDER',
    'AI_MODEL',
    'AI_DEMO_PUBLIC_DOCS_ONLY',
    'SUBSTRATA_EXECUTION_MODES',
  ]) {
    if (present(env, unused))
      warnings.push(
        `${unused} is not consumed by the current runtime and should be removed.`,
      );
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

function main() {
  let filePath;
  try {
    filePath = resolveEnvFileArgument(process.argv.slice(2));
  } catch (error) {
    console.error(
      `Production environment validation failed: ${error instanceof Error ? error.message : 'invalid arguments'}`,
    );
    process.exitCode = 1;
    return;
  }
  let env;
  try {
    env = readEnvFile(filePath);
  } catch (error) {
    console.error(
      `Production environment validation failed: ${error instanceof Error ? error.message : 'unable to read environment file'}`,
    );
    process.exitCode = 1;
    return;
  }
  const result = validateProductionEnv(env);
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length) {
    console.error('Production environment validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Production environment validation passed.');
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  main();
