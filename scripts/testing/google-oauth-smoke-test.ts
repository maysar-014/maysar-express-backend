import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import {
  googleOAuthConfig,
  googleOAuthEndpoints,
  validateGoogleOAuthConfig
} from '../../services/auth-service/src/config/google-oauth.config';

interface CliOptions {
  dryRun: boolean;
  code?: string;
  skipUserInfo: boolean;
}

const normalizeAuthorizationCode = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    const codeFromUrl = parsed.searchParams.get('code');
    if (codeFromUrl) {
      return codeFromUrl.trim();
    }

    if (parsed.hostname.includes('accounts.google.com')) {
      throw new Error(
        'You pasted the Google authorization URL, not the callback code. Complete consent, then copy the code query parameter from the redirect URL.'
      );
    }

    throw new Error('The pasted URL does not contain a code parameter. Copy the code from the Google redirect URL.');
  }

  if (trimmed.includes('code=')) {
    const queryString = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
    const params = new URLSearchParams(queryString);
    const codeFromQuery = params.get('code');
    if (codeFromQuery) {
      return codeFromQuery.trim();
    }
  }

  return trimmed;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: false,
    skipUserInfo: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--skip-userinfo') {
      options.skipUserInfo = true;
      continue;
    }

    if (arg.startsWith('--code=')) {
      options.code = arg.slice('--code='.length).trim() || undefined;
      continue;
    }

    if (arg === '--code') {
      const nextValue = argv[i + 1];
      if (nextValue && !nextValue.startsWith('--')) {
        options.code = nextValue.trim() || undefined;
        i += 1;
      }
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: ts-node scripts/testing/google-oauth-smoke-test.ts [--dry-run] [--code <auth-code>] [--skip-userinfo]',
        '',
        'Flags:',
        '  --dry-run         Print the generated Google OAuth authorization URL and exit',
        '  --code <code>     Provide the Google authorization code non-interactively',
        '  --skip-userinfo   Skip the follow-up userinfo request after token exchange',
      ].join('\n'));
      process.exit(0);
    }
  }

  return options;
};

const promptForCode = async (): Promise<string> => {
  if (!input.isTTY) {
    throw new Error('An authorization code is required. Re-run with --code or set GOOGLE_OAUTH_TEST_CODE.');
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question('Paste the Google callback URL or authorization code: ');
    return answer.trim();
  } finally {
    rl.close();
  }
};

const formatSeconds = (expiryDate?: number | null): string => {
  if (!expiryDate) {
    return 'unknown';
  }

  return `${Math.max(0, Math.floor((expiryDate - Date.now()) / 1000))}s`;
};

const extractDomain = (email: string): string => email.split('@').pop()?.toLowerCase() || '';

const getErrorHint = (message: string): string | undefined => {
  const lowered = message.toLowerCase();

  if (lowered.includes('redirect_uri_mismatch')) {
    return 'Check GOOGLE_OAUTH_CALLBACK_URL and the authorized redirect URIs in Google Cloud Console.';
  }

  if (lowered.includes('invalid_client')) {
    return 'Check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.';
  }

  if (lowered.includes('invalid_grant')) {
    return 'The code may be expired, already used, or the PKCE verifier/redirect URI may not match.';
  }

  if (lowered.includes('access_denied')) {
    return 'The Google account may have denied consent.';
  }

  return undefined;
};

const printConfigValidation = (errors: string[]): never => {
  console.error('[google-oauth-smoke] Google OAuth configuration is not ready:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const validation = validateGoogleOAuthConfig();

  if (!validation.isValid) {
    printConfigValidation(validation.errors);
  }

  const oauth2Client = new OAuth2Client(
    googleOAuthConfig.clientId,
    googleOAuthConfig.clientSecret,
    googleOAuthConfig.callbackUrl
  );

  const { codeVerifier, codeChallenge } = await oauth2Client.generateCodeVerifierAsync();
  if (!codeVerifier || !codeChallenge) {
    throw new Error('Failed to generate the PKCE code verifier and challenge.');
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: googleOAuthConfig.accessType,
    scope: googleOAuthConfig.scopes,
    prompt: googleOAuthConfig.prompt,
    response_type: googleOAuthConfig.responseType,
    include_granted_scopes: true,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    state
  });

  console.log('[google-oauth-smoke] Google OAuth configuration looks valid.');
  console.log(`  callbackUrl: ${googleOAuthConfig.callbackUrl}`);
  console.log(`  scopes: ${googleOAuthConfig.scopes.join(' ')}`);
  console.log(`  authUrl: ${authUrl}`);

  if (options.dryRun) {
    console.log('[google-oauth-smoke] Dry run complete.');
    return;
  }

  const rawCode = options.code || process.env.GOOGLE_OAUTH_TEST_CODE || (await promptForCode());
  const code = normalizeAuthorizationCode(rawCode);
  if (!code) {
    throw new Error('An authorization code is required to complete the smoke test.');
  }

  try {
    const { tokens } = await oauth2Client.getToken({ code, codeVerifier });

    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token.');
    }

    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleOAuthConfig.clientId
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Google returned an invalid ID token payload.');
    }

    let userInfo: Record<string, unknown> | undefined;
    if (!options.skipUserInfo) {
      const userInfoResponse = await oauth2Client.request({
        url: googleOAuthEndpoints.userInfoEndpoint,
        method: 'GET'
      });
      userInfo = userInfoResponse.data as Record<string, unknown>;
    }

    const email = typeof payload.email === 'string'
      ? payload.email
      : typeof userInfo?.email === 'string'
        ? userInfo.email
        : '';
    const warnings: string[] = [];

    if (googleOAuthConfig.verificationEmail && payload.email_verified === false) {
      warnings.push('The Google account email is not verified; the app would reject this user.');
    }

    if (googleOAuthConfig.allowedDomains.length > 0 && email) {
      const domain = extractDomain(email);
      const allowedDomains = googleOAuthConfig.allowedDomains.map(item => item.toLowerCase());
      if (!allowedDomains.includes(domain)) {
        warnings.push('The account email domain is not in GOOGLE_OAUTH_ALLOWED_DOMAINS; the app would reject this user.');
      }
    }

    if (googleOAuthConfig.accessType === 'offline' && !tokens.refresh_token) {
      warnings.push('Google did not return a refresh token. That can happen after a prior consent grant.');
    }

    console.log('[google-oauth-smoke] Smoke test passed.');
    console.log(`  subject: ${payload.sub || 'n/a'}`);
    console.log(`  email: ${email || 'n/a'}`);
    console.log(`  email_verified: ${payload.email_verified === false ? 'false' : 'true'}`);
    console.log(`  name: ${typeof payload.name === 'string' ? payload.name : 'n/a'}`);
    console.log(`  access_token_expires_in: ${formatSeconds(tokens.expiry_date)}`);
    console.log(`  refresh_token_returned: ${tokens.refresh_token ? 'yes' : 'no'}`);

    if (userInfo) {
      console.log(`  userinfo_email: ${typeof userInfo.email === 'string' ? userInfo.email : 'n/a'}`);
      console.log(`  userinfo_verified_email: ${typeof userInfo.verified_email === 'boolean' ? String(userInfo.verified_email) : 'n/a'}`);
    }

    if (warnings.length > 0) {
      console.log('[google-oauth-smoke] Policy warnings:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[google-oauth-smoke] OAuth code exchange failed.');
    console.error(`  ${message}`);

    const hint = getErrorHint(message);
    if (hint) {
      console.error(`  hint: ${hint}`);
    }

    process.exit(1);
  }
};

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[google-oauth-smoke] Unexpected failure.');
  console.error(`  ${message}`);
  process.exit(1);
});
