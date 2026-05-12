import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const CREDENTIALS_PATH = join(homedir(), '.amba', 'credentials.json');

export async function loadCredentials(): Promise<Credentials> {
  try {
    const raw = await readFile(CREDENTIALS_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('access_token' in parsed) ||
      !('refresh_token' in parsed) ||
      !('expires_at' in parsed)
    ) {
      throw new Error('Invalid credentials format');
    }

    const creds = parsed as Credentials;

    if (!creds.access_token || typeof creds.access_token !== 'string') {
      throw new Error('Missing or invalid access_token in credentials');
    }

    return creds;
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Credentials file not found at ${CREDENTIALS_PATH}. ` +
          'Run "amba login" to authenticate first.',
      );
    }
    throw err;
  }
}

export function isTokenExpired(credentials: Credentials): boolean {
  if (!credentials.expires_at) return false;
  const expiresAt = new Date(credentials.expires_at).getTime();
  // Consider expired 60 seconds before actual expiry
  return Date.now() > expiresAt - 60_000;
}
