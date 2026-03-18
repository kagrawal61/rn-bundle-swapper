import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

export async function copyIosAssets(jsBundlePath: string, destDir: string): Promise<void> {
  const bundleDir = path.dirname(jsBundlePath);
  const parentDir = path.dirname(bundleDir);

  const candidateDirs = [
    path.join(bundleDir, 'assets'),
    path.join(parentDir, 'assets'),
    path.join(parentDir, 'ios', 'assets'),
  ];

  logger.info('Looking for iOS assets...');

  let found = false;
  for (const srcAssetsDir of candidateDirs) {
    if (await fs.pathExists(srcAssetsDir)) {
      const destAssetsDir = path.join(destDir, 'assets');
      logger.info(`Copying assets: ${srcAssetsDir} → ${destAssetsDir}`);
      await fs.copy(srcAssetsDir, destAssetsDir);
      found = true;
      break;
    }
  }

  if (!found) {
    logger.warn('No assets directory found in any expected location');
  }
}
