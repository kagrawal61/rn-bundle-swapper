import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { execa } from 'execa';
import { IosIpaSwapOptions } from '../index.js';

function assertExists(p: string, label: string) {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found at path: ${p}`);
  }
}

/**
 * Replace JS bundle inside IPA and re-sign.
 */
export async function swapIosIpa(opts: IosIpaSwapOptions): Promise<void> {
  const { ipaPath, jsBundlePath, outputPath, identity, ci } = opts;

  assertExists(ipaPath, 'IPA');
  assertExists(jsBundlePath, 'JS bundle');

  if (!identity) {
    throw new Error('Codesign identity is required for IPA swapping');
  }

  // Create working directory
  const workDir = mkdtempSync(path.join(tmpdir(), 'rnbundleswapper-'));

  // Unzip IPA
  await execa('unzip', ['-q', ipaPath, '-d', workDir]);

  const payloadDir = path.join(workDir, 'Payload');
  if (!(await fs.pathExists(payloadDir))) {
    throw new Error('Invalid IPA: Payload directory not found');
  }

  const apps = (await fs.readdir(payloadDir)).filter((f) => f.endsWith('.app'));
  if (apps.length === 0) {
    throw new Error('No .app found inside IPA Payload');
  }
  const appPath = path.join(payloadDir, apps[0]);

  // Replace main.jsbundle
  const destBundle = path.join(appPath, 'main.jsbundle');
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
  for (const srcAssets of candidateDirs) {
    if (await fs.pathExists(srcAssets)) {
      console.log(`Found assets directory at: ${srcAssets}`);
      const destAssets = path.join(appPath, 'assets');
      await fs.copy(srcAssets, destAssets);
      console.log(`Copied assets to: ${destAssets}`);
      foundAssets = true;
      break;
    }
  }
  
  if (!foundAssets) {
    console.warn(`⚠️  No assets directory found in any of the expected locations`);
  }

  // Re-sign .app bundle
  try {
    await execa('codesign', [
      '--force',
      '--sign',
      identity,
      '--timestamp=none',
      '--preserve-metadata=entitlements,resource-rules',
      appPath,
    ], { stdio: 'inherit' });
  } catch (e) {
    if (ci) {
      throw new Error('Codesign failed in CI mode. Ensure the identity is available in the keychain.');
    }
    throw e;
  }

  // Repack IPA
  const cwd = workDir;
  const zipArgs = ['-qr', path.resolve(outputPath), 'Payload'];
  await execa('zip', zipArgs, { cwd });

  // Clean up work directory
  await fs.remove(workDir);
} 