import fs from 'fs-extra';
import path from 'path';
import { IosAppSwapOptions } from '../index.js';
import { copyIosAssets } from '../utils/iosAssets.js';

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
  const { appPath, jsBundlePath, outputPath, copyAssets = true } = opts;

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
    await copyIosAssets(jsBundlePath, outputPath);
  }
}
