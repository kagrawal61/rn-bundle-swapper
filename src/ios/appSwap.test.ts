jest.mock('fs-extra');
jest.mock('../utils/validate', () => ({
  assertExists: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    spinner: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
  },
}));

import fs from 'fs-extra';
import { assertExists as assertExistsMock } from '../utils/validate.js';
import { swapIosApp } from './appSwap.js';

const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockAssertExists = assertExistsMock as unknown as jest.Mock;
const mockPathExists = fs.pathExists as unknown as jest.Mock;
const mockRemove = fs.remove as unknown as jest.Mock;
const mockCopy = fs.copy as unknown as jest.Mock;
const mockCopyFile = fs.copyFile as unknown as jest.Mock;

const baseOpts = {
  appPath: 'MyApp.app',
  jsBundlePath: 'main.jsbundle',
  outputPath: 'Patched.app',
  copyAssets: false,
};

describe('swapIosApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertExists.mockImplementation((p: string, label: string) => {
      if (!mockExistsSync(p)) {
        throw new Error(`${label} not found at path: ${p}`);
      }
    });
    mockExistsSync.mockReturnValue(true);
    mockPathExists.mockResolvedValue(false);
    mockRemove.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('throws when the .app directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(swapIosApp(baseOpts)).rejects.toThrow('.app directory not found');
    });

    it('throws when the JS bundle file does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // .app exists
        .mockReturnValueOnce(false); // bundle missing
      await expect(swapIosApp(baseOpts)).rejects.toThrow('JS bundle not found');
    });
  });

  describe('app copying', () => {
    it('copies the .app directory to the output path', async () => {
      await swapIosApp(baseOpts);
      expect(mockCopy).toHaveBeenCalledWith('MyApp.app', 'Patched.app');
    });

    it('removes an existing output path before copying', async () => {
      mockPathExists.mockResolvedValue(true);

      await swapIosApp(baseOpts);

      expect(mockRemove).toHaveBeenCalledWith('Patched.app');
      expect(mockCopy).toHaveBeenCalledWith('MyApp.app', 'Patched.app');
    });

    it('skips remove when output path does not already exist', async () => {
      mockPathExists.mockResolvedValue(false);

      await swapIosApp(baseOpts);

      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  describe('bundle replacement', () => {
    it('copies the JS bundle to main.jsbundle inside the output .app', async () => {
      await swapIosApp(baseOpts);
      expect(mockCopyFile).toHaveBeenCalledWith(
        'main.jsbundle',
        expect.stringContaining('main.jsbundle')
      );
    });
  });

  describe('asset copying', () => {
    it('copies assets when copyAssets is true and a candidate dir is found', async () => {
      // Simulate the first candidate assets dir being found
      mockPathExists.mockImplementation(async (p: string) => p.endsWith('assets'));

      await swapIosApp({ ...baseOpts, copyAssets: true });

      // copy is called twice: once for .app dir, once for assets
      expect(mockCopy).toHaveBeenCalledTimes(2);
    });

    it('warns when copyAssets is true but no assets directory is found', async () => {
      const { logger: log } = jest.requireMock('../utils/logger');
      mockPathExists.mockResolvedValue(false);

      await swapIosApp({ ...baseOpts, copyAssets: true });

      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('No assets directory'));
    });

    it('skips asset copying when copyAssets is false', async () => {
      await swapIosApp({ ...baseOpts, copyAssets: false });

      // Only one copy call: the .app dir
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });
  });
});
