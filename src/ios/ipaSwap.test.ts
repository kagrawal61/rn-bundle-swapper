jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdtempSync: jest.fn(() => '/tmp/rnbundleswapper-ipa-test'),
}));
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  tmpdir: jest.fn(() => '/tmp'),
}));
jest.mock('execa', () => ({ execa: jest.fn().mockResolvedValue({}) }));
jest.mock('fs-extra');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    spinner: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
  },
}));

import { execa as execaMock } from 'execa';
import fs from 'fs-extra';
import { swapIosIpa } from './ipaSwap.js';

const mockExeca = execaMock as unknown as jest.Mock;
const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockPathExists = fs.pathExists as unknown as jest.Mock;
const mockReaddir = fs.readdir as unknown as jest.Mock;
const mockCopyFile = fs.copyFile as unknown as jest.Mock;
const mockCopy = fs.copy as unknown as jest.Mock;
const mockRemove = fs.remove as unknown as jest.Mock;

const WORK_DIR = '/tmp/rnbundleswapper-ipa-test';

const baseOpts = {
  ipaPath: 'MyApp.ipa',
  jsBundlePath: 'main.jsbundle',
  identity: 'Apple Distribution: Test Corp (TEAMID)',
  outputPath: 'Patched.ipa',
};

describe('swapIosIpa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default execa behavior to override any mockImplementation from prior tests
    mockExeca.mockResolvedValue({});
    mockExistsSync.mockReturnValue(true);
    mockPathExists.mockResolvedValue(true);
    mockReaddir.mockResolvedValue(['MyApp.app']);
    mockCopyFile.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('throws when the IPA file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(swapIosIpa(baseOpts)).rejects.toThrow('IPA not found');
    });

    it('throws when the JS bundle does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // IPA exists
        .mockReturnValueOnce(false); // bundle missing
      await expect(swapIosIpa(baseOpts)).rejects.toThrow('JS bundle not found');
    });

    it('throws when identity is empty', async () => {
      await expect(swapIosIpa({ ...baseOpts, identity: '' })).rejects.toThrow(
        'Codesign identity is required'
      );
    });

    it('throws when Payload directory is not found inside the IPA', async () => {
      mockPathExists.mockResolvedValue(false);
      await expect(swapIosIpa(baseOpts)).rejects.toThrow('Invalid IPA');
    });

    it('throws when no .app is found inside the Payload', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);
      await expect(swapIosIpa(baseOpts)).rejects.toThrow('No .app found');
    });
  });

  describe('unzip', () => {
    it('calls unzip on the IPA into the work directory', async () => {
      await swapIosIpa(baseOpts);
      expect(mockExeca).toHaveBeenCalledWith(
        'unzip',
        expect.arrayContaining(['-q', 'MyApp.ipa', '-d', WORK_DIR])
      );
    });
  });

  describe('bundle replacement', () => {
    it('copies the JS bundle to main.jsbundle inside the .app', async () => {
      await swapIosIpa(baseOpts);
      expect(mockCopyFile).toHaveBeenCalledWith(
        'main.jsbundle',
        expect.stringContaining('main.jsbundle')
      );
    });
  });

  describe('code signing', () => {
    it('calls codesign with --force --deep and the provided identity', async () => {
      await swapIosIpa(baseOpts);
      expect(mockExeca).toHaveBeenCalledWith(
        'codesign',
        expect.arrayContaining([
          '--force',
          '--deep',
          '--sign',
          'Apple Distribution: Test Corp (TEAMID)',
          '--timestamp=none',
          '--preserve-metadata=entitlements',
        ]),
        expect.anything()
      );
    });

    it('throws a CI-specific error when codesign fails in CI mode', async () => {
      mockExeca.mockImplementation((cmd: string) => {
        if (cmd === 'codesign') return Promise.reject(new Error('no identity found'));
        return Promise.resolve({});
      });

      await expect(swapIosIpa({ ...baseOpts, ci: true })).rejects.toThrow(
        'Codesign failed in CI mode'
      );
    });

    it('re-throws the original error in non-CI mode when codesign fails', async () => {
      mockExeca.mockImplementation((cmd: string) => {
        if (cmd === 'codesign') return Promise.reject(new Error('no identity found'));
        return Promise.resolve({});
      });

      await expect(swapIosIpa({ ...baseOpts, ci: false })).rejects.toThrow('no identity found');
    });
  });

  describe('IPA repacking', () => {
    it('calls zip to repack Payload into the output IPA', async () => {
      await swapIosIpa(baseOpts);
      expect(mockExeca).toHaveBeenCalledWith(
        'zip',
        expect.arrayContaining(['-qr', expect.stringContaining('Patched.ipa'), 'Payload']),
        expect.objectContaining({ cwd: WORK_DIR })
      );
    });
  });

  describe('cleanup', () => {
    it('removes the work directory after success', async () => {
      await swapIosIpa(baseOpts);
      expect(mockRemove).toHaveBeenCalledWith(WORK_DIR);
    });

    it('removes the work directory even when an error occurs', async () => {
      mockExeca.mockImplementation((cmd: string) => {
        if (cmd === 'codesign') return Promise.reject(new Error('sign error'));
        return Promise.resolve({});
      });

      await expect(swapIosIpa(baseOpts)).rejects.toThrow();
      expect(mockRemove).toHaveBeenCalledWith(WORK_DIR);
    });
  });
});
