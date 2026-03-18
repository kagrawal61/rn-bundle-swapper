import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { execa } from 'execa';
import { IosIpaSwapOptions } from '../index.js';
import { logger } from '../utils/logger.js';
import { assertExists } from '../utils/validate.js';

/**
 * Replace JS bundle inside IPA and re-sign.
 */
export async function swapIosIpa(opts: IosIpaSwapOptions): Promise<void> {
  const { ipaPath, jsBundlePath, outputPath, identity, ci, copyAssets = true } = opts;

  assertExists(ipaPath, 'IPA');
  assertExists(jsBundlePath, 'JS bundle');

  if (!identity) {
    throw new Error('Codesign identity is required for IPA swapping');
  }

  // Create working directory
  const workDir = mkdtempSync(path.join(tmpdir(), 'rnbundleswapper-'));

  try {
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
      for (const srcAssets of candidateDirs) {
        if (await fs.pathExists(srcAssets)) {
          const destAssets = path.join(appPath, 'assets');
          logger.info(`Copying assets: ${srcAssets} → ${destAssets}`);
          await fs.copy(srcAssets, destAssets);
          found = true;
          break;
        }
      }

      if (!found) {
        logger.warn('No assets directory found in any expected location');
      }
    }

    // Re-sign .app bundle
    // --deep re-signs embedded frameworks/extensions before signing the app.
    // --preserve-metadata=entitlements keeps original entitlements intact.
    // resource-rules was removed by Apple in Xcode 6 and must not be passed.
    const signSpinner = logger.spinner('Signing .app bundle...');
    try {
      await execa('codesign', [
        '--force',
        '--deep',
        '--sign',
        identity,
        '--timestamp=none',
        '--preserve-metadata=entitlements',
        appPath,
      ]);
      signSpinner.succeed('Bundle signed');
    } catch (e) {
      signSpinner.fail('codesign failed');
      if (ci) {
        throw new Error('Codesign failed in CI mode. Ensure the identity is available in the keychain.');
      }
      throw e;
    }

    // Repack IPA (outputPath resolved to absolute so zip -C workDir works correctly)
    const repackSpinner = logger.spinner('Repacking IPA...');
    try {
      await execa('zip', ['-qr', path.resolve(outputPath), 'Payload'], { cwd: workDir });
      repackSpinner.succeed('IPA repacked');
    } catch (e) {
      repackSpinner.fail('zip failed');
      throw e;
    }
  } finally {
    // Always clean up work directory, even on failure
    await fs.remove(workDir);
  }
}
