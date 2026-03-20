jest.mock('adm-zip');
jest.mock('fs-extra');

import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import { addDirToZip } from './zip.js';

const mockReaddir = fs.readdir as unknown as jest.Mock;
const mockStat = fs.stat as unknown as jest.Mock;
const mockReadFile = fs.readFile as unknown as jest.Mock;

describe('addDirToZip', () => {
  let mockZip: { addFile: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockZip = { addFile: jest.fn() };
  });

  it('adds a single file at the correct zip path', async () => {
    mockReaddir.mockResolvedValue(['bundle.js']);
    mockStat.mockResolvedValue({ isDirectory: () => false });
    mockReadFile.mockResolvedValue(Buffer.from('file content'));

    await addDirToZip(mockZip as unknown as AdmZip, '/src/assets', 'assets');

    expect(mockZip.addFile).toHaveBeenCalledTimes(1);
    expect(mockZip.addFile).toHaveBeenCalledWith('assets/bundle.js', expect.any(Buffer));
  });

  it('recursively adds files from subdirectories', async () => {
    mockReaddir.mockResolvedValueOnce(['images']).mockResolvedValueOnce(['logo.png']);
    mockStat
      .mockResolvedValueOnce({ isDirectory: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false });
    mockReadFile.mockResolvedValue(Buffer.from('png data'));

    await addDirToZip(mockZip as unknown as AdmZip, '/src/assets', 'assets');

    expect(mockZip.addFile).toHaveBeenCalledWith('assets/images/logo.png', expect.any(Buffer));
  });

  it('adds multiple files from the same directory', async () => {
    mockReaddir.mockResolvedValue(['a.js', 'b.js']);
    mockStat.mockResolvedValue({ isDirectory: () => false });
    mockReadFile.mockResolvedValue(Buffer.from('x'));

    await addDirToZip(mockZip as unknown as AdmZip, '/src', 'root');

    expect(mockZip.addFile).toHaveBeenCalledTimes(2);
    expect(mockZip.addFile).toHaveBeenCalledWith('root/a.js', expect.any(Buffer));
    expect(mockZip.addFile).toHaveBeenCalledWith('root/b.js', expect.any(Buffer));
  });

  it('handles an empty directory without error', async () => {
    mockReaddir.mockResolvedValue([]);

    await addDirToZip(mockZip as unknown as AdmZip, '/empty', 'assets');

    expect(mockZip.addFile).not.toHaveBeenCalled();
  });

  it('uses posix separators in zip paths regardless of OS', async () => {
    mockReaddir.mockResolvedValueOnce(['sub']).mockResolvedValueOnce(['file.js']);
    mockStat
      .mockResolvedValueOnce({ isDirectory: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false });
    mockReadFile.mockResolvedValue(Buffer.from(''));

    await addDirToZip(mockZip as unknown as AdmZip, '/dir', 'res/raw');

    expect(mockZip.addFile).toHaveBeenCalledWith('res/raw/sub/file.js', expect.any(Buffer));
  });
});
