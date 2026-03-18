import fs from 'fs-extra';

/**
 * Allowed keys in a JSON config file. Validated before injection into argv to
 * prevent untrusted config files from injecting arbitrary flags.
 */
export const ALLOWED_CONFIG_KEYS = new Set([
  // Shared
  'jsbundle', 'build-jsbundle', 'project-root', 'no-hermes', 'copy-assets', 'no-copy-assets', 'output',
  // Android
  'keystore', 'ks-pass', 'ks-alias', 'key-pass',
  // iOS IPA
  'identity', 'ci',
]);

/**
 * Load a JSON config file and convert its entries into CLI-style flags.
 * Throws on missing file, invalid JSON, or unknown keys.
 *
 * @returns an array of CLI flags, e.g. ['--jsbundle', 'bundle.js', '--ci']
 */
export async function loadConfigFlags(configPath: string): Promise<string[]> {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }

  let configContent: Record<string, unknown>;
  try {
    configContent = await fs.readJson(configPath);
  } catch (err) {
    throw new Error(`Failed to read config at ${configPath}: ${(err as Error).message}`);
  }

  const unknownKeys = Object.keys(configContent).filter((k) => !ALLOWED_CONFIG_KEYS.has(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown config key(s): ${unknownKeys.join(', ')}`);
  }

  const flags: string[] = [];
  Object.entries(configContent).forEach(([key, value]) => {
    flags.push(`--${key}`);
    if (typeof value !== 'boolean') {
      flags.push(String(value));
    }
  });

  return flags;
}
