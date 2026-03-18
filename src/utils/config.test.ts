jest.mock('fs-extra');

import fs from 'fs-extra';
import { loadConfigFlags, ALLOWED_CONFIG_KEYS } from './config.js';

const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockReadJson = fs.readJson as unknown as jest.Mock;

describe('loadConfigFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the config file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(loadConfigFlags('/path/to/missing.json')).rejects.toThrow(
      'Config file not found at /path/to/missing.json'
    );
  });

  it('throws when the config file contains invalid JSON', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockRejectedValue(new SyntaxError('Unexpected token'));

    await expect(loadConfigFlags('/path/to/bad.json')).rejects.toThrow(
      'Failed to read config at /path/to/bad.json'
    );
  });

  it('throws when config contains unknown/disallowed keys', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({ jsbundle: 'bundle.js', 'evil-flag': true });

    await expect(loadConfigFlags('/path/to/config.json')).rejects.toThrow(
      'Unknown config key(s): evil-flag'
    );
  });

  it('lists all unknown keys in the error message', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({ foo: 'a', bar: 'b' });

    await expect(loadConfigFlags('/path/to/config.json')).rejects.toThrow(
      'Unknown config key(s): foo, bar'
    );
  });

  it('converts string values to --key value flags', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({ jsbundle: 'bundle.js', output: 'out.apk' });

    const flags = await loadConfigFlags('/path/to/config.json');

    expect(flags).toEqual(['--jsbundle', 'bundle.js', '--output', 'out.apk']);
  });

  it('converts boolean true values to bare --key flags', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({ ci: true, 'no-hermes': true });

    const flags = await loadConfigFlags('/path/to/config.json');

    expect(flags).toEqual(['--ci', '--no-hermes']);
  });

  it('handles a mix of string and boolean values', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({
      jsbundle: 'main.jsbundle',
      'copy-assets': true,
      identity: 'Apple Distribution: Test',
    });

    const flags = await loadConfigFlags('/path/to/config.json');

    expect(flags).toEqual([
      '--jsbundle', 'main.jsbundle',
      '--copy-assets',
      '--identity', 'Apple Distribution: Test',
    ]);
  });

  it('returns an empty array for an empty config object', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadJson.mockResolvedValue({});

    const flags = await loadConfigFlags('/path/to/config.json');

    expect(flags).toEqual([]);
  });

  it('accepts all allowed config keys without throwing', async () => {
    mockExistsSync.mockReturnValue(true);
    const config: Record<string, string | boolean> = {};
    for (const key of ALLOWED_CONFIG_KEYS) {
      config[key] = 'test-value';
    }
    mockReadJson.mockResolvedValue(config);

    await expect(loadConfigFlags('/path/to/config.json')).resolves.toBeDefined();
  });
});
