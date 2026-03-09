import fs from 'fs-extra';
import path from 'path';
import { IosAppSwapOptions } from '../index.js';
import { logger } from '../utils/logger.js';

function assertExists(p: string, label: string) {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found at path: ${p}`);
  }
}

/**
 * Swap JS bundle inside an unzipped .app bundle (Simulator build).
 *  - Replaces main.jsbundle
 *  - Copies Metro assets into the bundle (root/assets) if copyAssets is true
 */
export async function swapIosApp(opts: IosAppSwapOptions): Promise<void> {
  const { appPath, jsBundlePath, outputPath, copyAssets = false } = opts;

  assertExists(appPath, '.app directory');
  assertExists(jsBundlePath, 'JS bundle');

  // Copy .app to outputPath (simple dir copy) to avoid mutating original
  if (await fs.pathExists(outputPath)) {
    await fs.remove(outputPath);
  }
  await fs.copy(appPath, outputPath);

  // Replace main.jsbundle
  const destBundle = path.join(outputPath, 'main.jsbundle');
  await fs.copyFile(jsBundlePath, destBundle);

  if (copyAssets) {
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
        const destAssetsDir = path.join(outputPath, 'assets');
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
}
