import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';

export async function addDirToZip(zip: AdmZip, dirPath: string, zipRoot: string) {
  const entries = await fs.readdir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = await fs.stat(fullPath);
    const zipPath = path.posix.join(zipRoot, entry);
    if (stats.isDirectory()) {
      await addDirToZip(zip, fullPath, zipPath);
    } else {
      const content = await fs.readFile(fullPath);
      zip.addFile(zipPath, content);
    }
  }
} 