jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdtempSync: jest.fn(() => '/tmp/rnbundleswapper-build-test'),
}));
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  tmpdir: jest.fn(() => '/tmp'),
  platform: jest.fn(() => 'linux'),
}));
jest.mock('execa', () => ({ execa: jest.fn().mockResolvedValue({}) }));
jest.mock('fs-extra');
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    spinner: jest.fn(() => ({ succeed: jest.fn(), fail: jest.fn() })),
  },
}));

import { execa as execaMock } from 'execa';
import fs from 'fs-extra';
import { buildBundle } from './bundle.js';

const mockExeca = execaMock as jest.Mock;
const mockExistsSync = fs.existsSync as jest.Mock;
const mockEnsureDir = fs.ensureDir as jest.Mock;
const mockMove = fs.move as jest.Mock;
const mockRemove = fs.remove as jest.Mock;

const OUT_DIR = '/tmp/rnbundleswapper-build-test';

describe('buildBundle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockImplementation((p: string) => p === '/project');
    mockEnsureDir.mockResolvedValue(undefined);
    mockMove.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('throws when the project root does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(buildBundle({ projectRoot: '/missing', platform: 'android' })).rejects.toThrow(
        'Project root not found',
      );
    });
  });

  describe('metro bundle invocation', () => {
    it('calls react-native bundle with correct platform and output flags', async () => {
      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: false });

      expect(mockExeca).toHaveBeenCalledWith(
        'react-native',
        expect.arrayContaining([
          'bundle',
          '--platform',
          'android',
          '--bundle-output',
          expect.stringContaining('index.android.bundle'),
        ]),
        expect.objectContaining({ cwd: '/project' }),
      );
    });

    it('uses main.jsbundle as output name for iOS', async () => {
      await buildBundle({ projectRoot: '/project', platform: 'ios', hermes: false });

      expect(mockExeca).toHaveBeenCalledWith(
        'react-native',
        expect.arrayContaining(['--bundle-output', expect.stringContaining('main.jsbundle')]),
        expect.anything(),
      );
    });

    it('prefers the local react-native binary when available', async () => {
      mockExistsSync.mockImplementation(
        (p: string) => p === '/project' || String(p).endsWith('react-native'),
      );

      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: false });

      const [cmd] = mockExeca.mock.calls[0];
      expect(cmd).toContain('node_modules');
    });

    it('falls back to global react-native when local binary is absent', async () => {
      mockExistsSync.mockImplementation((p: string) => p === '/project');

      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: false });

      const [cmd] = mockExeca.mock.calls[0];
      expect(cmd).toBe('react-native');
    });

    it('passes --reset-cache to react-native bundle', async () => {
      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: false });

      expect(mockExeca).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['--reset-cache']),
        expect.anything(),
      );
    });

    it('cleans up outDir and rethrows when Metro fails', async () => {
      mockExeca.mockRejectedValueOnce(new Error('Metro error'));

      await expect(
        buildBundle({ projectRoot: '/project', platform: 'android', hermes: false }),
      ).rejects.toThrow('Metro error');

      expect(mockRemove).toHaveBeenCalledWith(OUT_DIR);
    });
  });

  describe('Hermes compilation', () => {
    it('runs hermesc when hermes is true and hermesc is found', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        const s = String(p);
        return s === '/project' || s.endsWith('hermesc');
      });

      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: true });

      const hermesCall = mockExeca.mock.calls.find(([cmd]: [string]) =>
        String(cmd).endsWith('hermesc'),
      );
      expect(hermesCall).toBeDefined();
      expect(hermesCall[1]).toContain('-emit-binary');
    });

    it('skips hermesc when hermes is false', async () => {
      await buildBundle({ projectRoot: '/project', platform: 'android', hermes: false });

      const hermesCalls = mockExeca.mock.calls.filter(([cmd]: [string]) =>
        String(cmd).endsWith('hermesc'),
      );
      expect(hermesCalls).toHaveLength(0);
    });

    it('warns and skips Hermes when hermesc binary is not found', async () => {
      const { logger: log } = jest.requireMock('./logger');
      mockExistsSync.mockImplementation((p: string) => p === '/project');

      const result = await buildBundle({
        projectRoot: '/project',
        platform: 'android',
        hermes: true,
      });

      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('hermesc not found'));
      expect(result.bundlePath).toBeDefined();
    });

    it('returns bundlePath, assetsDir, and outDir', async () => {
      const result = await buildBundle({
        projectRoot: '/project',
        platform: 'android',
        hermes: false,
      });

      expect(result.bundlePath).toContain('index.android.bundle');
      expect(result.assetsDir).toContain('assets');
      expect(result.outDir).toBe(OUT_DIR);
    });
  });
});
