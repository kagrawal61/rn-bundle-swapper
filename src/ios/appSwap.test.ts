jest.mock('fs-extra');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    spinner: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
  },
}));
jest.mock('../utils/iosAssets', () => ({
  copyIosAssets: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs-extra';
import { copyIosAssets as copyIosAssetsMock } from '../utils/iosAssets.js';
import { swapIosApp } from './appSwap.js';

const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockPathExists = fs.pathExists as unknown as jest.Mock;
const mockRemove = fs.remove as unknown as jest.Mock;
const mockCopy = fs.copy as unknown as jest.Mock;
const mockCopyFile = fs.copyFile as unknown as jest.Mock;
const mockCopyIosAssets = copyIosAssetsMock as unknown as jest.Mock;

const baseOpts = {
  appPath: 'MyApp.app',
  jsBundlePath: 'main.jsbundle',
  outputPath: 'Patched.app',
  copyAssets: false,
};

describe('swapIosApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('calls copyIosAssets when copyAssets is true', async () => {
      await swapIosApp({ ...baseOpts, copyAssets: true });

      expect(mockCopyIosAssets).toHaveBeenCalledWith('main.jsbundle', 'Patched.app');
    });

    it('skips asset copying when copyAssets is false', async () => {
      await swapIosApp({ ...baseOpts, copyAssets: false });

      expect(mockCopyIosAssets).not.toHaveBeenCalled();
    });
  });
});
