jest.mock('fs', () => ({
  mkdtempSync: jest.fn(() => '/tmp/rnbundleswapper-abc123'),
}));

import { mkdtempSync } from 'fs';
import { tmpPath } from './temp.js';

const mockMkdtemp = mkdtempSync as jest.Mock;

describe('tmpPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdtemp.mockReturnValue('/tmp/rnbundleswapper-abc123');
  });

  it('returns a string', () => {
    expect(typeof tmpPath('test.apk')).toBe('string');
  });

  it('includes the given name in the returned path', () => {
    const result = tmpPath('unsigned.apk');
    expect(result).toContain('unsigned.apk');
  });

  it('places the file inside the directory returned by mkdtempSync', () => {
    const result = tmpPath('signed.apk');
    expect(result.startsWith('/tmp/rnbundleswapper-abc123')).toBe(true);
  });

  it('calls mkdtempSync with a prefix containing rnbundleswapper', () => {
    tmpPath('test.apk');
    expect(mockMkdtemp).toHaveBeenCalledWith(expect.stringContaining('rnbundleswapper'));
  });

  it('prepends a hex prefix to the name for uniqueness', () => {
    const result = tmpPath('test.apk');
    // format: <dir>/<hex>-test.apk
    expect(result).toMatch(/-test\.apk$/);
  });
});
