jest.mock('execa', () => ({ execa: jest.fn().mockResolvedValue({}) }));
jest.mock('adm-zip');
jest.mock('fs-extra');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    spinner: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
  },
}));
jest.mock('../utils/temp', () => ({
  tmpPath: jest.fn((name: string) => `/tmp/test-${name}`),
}));
jest.mock('../utils/zip', () => ({
  addDirToZip: jest.fn().mockResolvedValue(undefined),
}));

import { execa as execaMock } from 'execa';
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import { swapAndroid } from './swap.js';

const mockExeca = execaMock as unknown as jest.Mock;
const mockExistsSync = fs.existsSync as unknown as jest.Mock;
const mockReadFile = fs.readFile as unknown as jest.Mock;
const mockRemove = fs.remove as unknown as jest.Mock;
const mockPathExists = fs.pathExists as unknown as jest.Mock;
const MockAdmZip = AdmZip as jest.MockedClass<typeof AdmZip>;

const baseOpts = {
  apkPath: 'app.apk',
  jsBundlePath: 'index.android.bundle',
  keystorePath: 'my.keystore',
  keystorePassword: 'kspass',
  keyAlias: 'myalias',
  outputPath: 'patched.apk',
  copyAssets: false,
};

function makeMockZip() {
  return {
    getEntry: jest.fn().mockReturnValue(null),
    deleteFile: jest.fn(),
    addFile: jest.fn(),
    writeZip: jest.fn(),
  };
}

describe('swapAndroid', () => {
  let mockZipInstance: ReturnType<typeof makeMockZip>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockZipInstance = makeMockZip();
    MockAdmZip.mockImplementation(() => mockZipInstance as unknown as AdmZip);

    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(Buffer.from('bundle content'));
    mockRemove.mockResolvedValue(undefined);
    mockPathExists.mockResolvedValue(false);
  });

  describe('input validation', () => {
    it('throws when the APK file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(swapAndroid(baseOpts)).rejects.toThrow('APK not found');
    });

    it('throws when the JS bundle file does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // APK exists
        .mockReturnValueOnce(false); // bundle missing
      await expect(swapAndroid(baseOpts)).rejects.toThrow('JS bundle not found');
    });

    it('throws when the keystore file does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // APK
        .mockReturnValueOnce(true)   // bundle
        .mockReturnValueOnce(false); // keystore missing
      await expect(swapAndroid(baseOpts)).rejects.toThrow('Keystore not found');
    });
  });

  describe('bundle replacement', () => {
    it('adds the bundle at the correct APK entry path', async () => {
      await swapAndroid(baseOpts);
      expect(mockZipInstance.addFile).toHaveBeenCalledWith(
        'assets/index.android.bundle',
        expect.any(Buffer)
      );
    });

    it('deletes the existing bundle entry before adding the new one', async () => {
      mockZipInstance.getEntry.mockReturnValue({ name: 'assets/index.android.bundle' });

      await swapAndroid(baseOpts);

      expect(mockZipInstance.deleteFile).toHaveBeenCalledWith('assets/index.android.bundle');
      expect(mockZipInstance.addFile).toHaveBeenCalled();
    });

    it('skips deleteFile when there is no existing bundle entry', async () => {
      mockZipInstance.getEntry.mockReturnValue(null);

      await swapAndroid(baseOpts);

      expect(mockZipInstance.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('zipalign', () => {
    it('calls zipalign with -p -f 4 flags', async () => {
      await swapAndroid(baseOpts);
      expect(mockExeca).toHaveBeenCalledWith(
        'zipalign',
        expect.arrayContaining(['-p', '-f', '4'])
      );
    });
  });

  describe('apksigner', () => {
    it('calls apksigner sign with v2/v4 enabled and v3 disabled', async () => {
      await swapAndroid(baseOpts);
      expect(mockExeca).toHaveBeenCalledWith(
        'apksigner',
        expect.arrayContaining([
          'sign',
          '--v2-signing-enabled', 'true',
          '--v3-signing-enabled', 'false',
          '--v4-signing-enabled', 'true',
        ]),
        expect.anything()
      );
    });

    it('passes keystore password via env var, not as a CLI argument', async () => {
      await swapAndroid(baseOpts);
      const apksignerCall = mockExeca.mock.calls.find(
        ([cmd]: [string]) => cmd === 'apksigner'
      );
      const [, args, opts] = apksignerCall;
      expect(args).toContain('env:RNBS_KS_PASS');
      expect(args).not.toContain('kspass');
      expect(opts.env.RNBS_KS_PASS).toBe('kspass');
    });

    it('passes key password via env var when provided', async () => {
      await swapAndroid({ ...baseOpts, keyPassword: 'keypass' });
      const apksignerCall = mockExeca.mock.calls.find(
        ([cmd]: [string]) => cmd === 'apksigner'
      );
      const [, args, opts] = apksignerCall;
      expect(args).toContain('env:RNBS_KEY_PASS');
      expect(args).not.toContain('keypass');
      expect(opts.env.RNBS_KEY_PASS).toBe('keypass');
    });

    it('omits --key-pass when keyPassword is not provided', async () => {
      await swapAndroid(baseOpts);
      const apksignerCall = mockExeca.mock.calls.find(
        ([cmd]: [string]) => cmd === 'apksigner'
      );
      expect(apksignerCall[1]).not.toContain('--key-pass');
    });
  });

  describe('temp file cleanup', () => {
    it('removes both temp directories after a successful swap', async () => {
      await swapAndroid(baseOpts);
      expect(mockRemove).toHaveBeenCalledTimes(2);
    });

    it('removes temp directories even when zipalign fails', async () => {
      mockExeca.mockRejectedValueOnce(new Error('zipalign failed'));

      await expect(swapAndroid(baseOpts)).rejects.toThrow('zipalign failed');
      expect(mockRemove).toHaveBeenCalledTimes(2);
    });
  });

  describe('asset copying', () => {
    it('warns when copyAssets is true but no assets directory is found', async () => {
      const { logger: log } = jest.requireMock('../utils/logger');
      mockPathExists.mockResolvedValue(false);

      await swapAndroid({ ...baseOpts, copyAssets: true });

      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('No assets directory'));
    });

    it('skips addDirToZip when copyAssets is false', async () => {
      const { addDirToZip } = jest.requireMock('../utils/zip');

      await swapAndroid({ ...baseOpts, copyAssets: false });

      expect(addDirToZip).not.toHaveBeenCalled();
    });
  });
});
