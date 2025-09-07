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
 *  - Copies Metro assets into the bundle (root/assets) if found
 */
export async function swapIosApp(opts: IosAppSwapOptions): Promise<void> {
  const { appPath, jsBundlePath, outputPath } = opts;

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

  // Always copy assets if they exist
  // Look for assets in multiple possible locations
  const bundleDir = path.dirname(jsBundlePath);
  const parentDir = path.dirname(bundleDir);
  
  // Try multiple possible locations for assets
  const candidateDirs = [
    // Direct siblings of the bundle
    path.join(bundleDir, 'assets'),
    // In a sibling directory of the bundle's directory
    path.join(parentDir, 'assets'),
    // In a standard Metro output structure
    path.join(parentDir, 'ios', 'assets'),
  ];
  
  console.log(`Looking for iOS assets in multiple locations...`);
  
  let foundAssets = false;
  for (const srcAssetsDir of candidateDirs) {
    if (await fs.pathExists(srcAssetsDir)) {
      console.log(`Found assets directory at: ${srcAssetsDir}`);
      const destAssetsDir = path.join(outputPath, 'assets');
      await fs.copy(srcAssetsDir, destAssetsDir);
      console.log(`Copied assets to: ${destAssetsDir}`);
      foundAssets = true;
      break;
    }
  }
  
  if (!foundAssets) {
    console.warn(`⚠️  No assets directory found in any of the expected locations`);
  }
} 