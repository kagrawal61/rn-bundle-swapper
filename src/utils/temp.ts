import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * Returns a unique path inside the OS temp directory without creating the file.
 */
export function tmpPath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rnbundleswapper-'));
  return join(dir, `${randomBytes(4).toString('hex')}-${name}`);
}
