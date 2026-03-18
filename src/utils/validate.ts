import fs from 'fs-extra';

export function assertExists(p: string, label: string): void {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found at path: ${p}`);
  }
}
