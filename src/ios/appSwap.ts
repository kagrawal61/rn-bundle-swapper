import fs from 'fs-extra';
import path from 'path';
import { IosAppSwapOptions } from '../index.js';

function assertExists(p: string, label: string) {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found at path: ${p}`);
  }
}

/**
 * Swap JS bundle inside an unzipped .app bundle (Simulator build).
 *  - Replaces main.jsbundle
 *  - Optionally copies Metro assets into the bundle (root/assets)
 */
export async function swapIosApp(opts: IosAppSwapOptions): Promise<void> {
  const { appPath, jsBundlePath, outputPath, copyAssets } = opts;

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
    // Assume assets directory sits next to the JS bundle as "assets"
    const srcAssetsDir = path.join(path.dirname(jsBundlePath), 'assets');
    if (await fs.pathExists(srcAssetsDir)) {
      const destAssetsDir = path.join(outputPath, 'assets');
      await fs.copy(srcAssetsDir, destAssetsDir);
    } else {
      console.warn(`⚠️  copyAssets requested, but no assets directory found at ${srcAssetsDir}`);
    }
  }
} 