import fs from 'fs-extra';
import { tmpPath } from '../utils/temp.js';
import AdmZip from 'adm-zip';
import {execa} from 'execa';
import { logger } from '../utils/logger.js';
import path from 'path';
import { AndroidSwapOptions } from '../index.js';
import { addDirToZip } from '../utils/zip.js';

function assertFileExists(p: string, label: string) {
  if (!fs.existsSync(p)) {
    throw new Error(`${label} not found at path: ${p}`);
  }
}

/**
 * Replace JS bundle in an APK and re-sign it.
 */
export async function swapAndroid(opts: AndroidSwapOptions): Promise<void> {
  const {
    apkPath,
    jsBundlePath,
    outputPath,
    keystorePath,
    keystorePassword,
    keyAlias,
    keyPassword,
  } = opts;

  assertFileExists(apkPath, 'APK');
  assertFileExists(jsBundlePath, 'JS bundle');
  assertFileExists(keystorePath, 'Keystore');

  // Load APK
  const zip = new AdmZip(apkPath);

  // Update bundle entry
  const bundleContent = await fs.readFile(jsBundlePath);
  const bundleEntry = 'assets/index.android.bundle';
  if (zip.getEntry(bundleEntry)) {
    zip.deleteFile(bundleEntry);
  }
  zip.addFile(bundleEntry, bundleContent);

  // Always copy assets
  {
    // Look for assets in multiple possible locations
    const bundleDir = path.dirname(jsBundlePath);
    const parentDir = path.dirname(bundleDir);
    
    // React Native bundles assets into res/drawable*/ etc.
    // Try multiple possible locations for assets
    const candidateDirs = [
      // Direct siblings of the bundle
      path.join(bundleDir, 'assets'), // Metro output places assets here
      path.join(bundleDir, 'res'),
      // In a sibling directory of the bundle's directory
      path.join(parentDir, 'assets'),
      path.join(parentDir, 'res'),
      // In a standard Metro output structure
      path.join(parentDir, 'android', 'assets'),
      path.join(parentDir, 'android', 'res'),
    ];
    
    logger.info(`Looking for Android assets in multiple locations...`);
    
    let assetsDir: string | null = null;
    for (const dir of candidateDirs) {
      if (await fs.pathExists(dir)) {
        logger.info(`Found assets directory at: ${dir}`);
        assetsDir = dir;
        break;
      }
    }
    
    if (assetsDir) {
      const entries = await fs.readdir(assetsDir);
      for (const entry of entries) {
        const full = path.join(assetsDir, entry);
        const stats = await fs.stat(full);
        if (stats.isDirectory()) {
          logger.info(`Adding asset directory: ${entry}`);
          // For drawable directories, preserve the exact path structure
          if (entry.startsWith('drawable')) {
            await addDirToZip(zip, full, entry);
          } else {
            await addDirToZip(zip, full, path.posix.join('res', entry));
          }
        } else {
          // Some assets might be at root; place them under res/raw
          logger.info(`Adding asset file: ${entry}`);
          const content = await fs.readFile(full);
          zip.addFile(path.posix.join('res', 'raw', entry), content);
        }
      }
    } else {
      logger.warn('No res/assets directory found in any of the expected locations');
    }
  }

  // Write unsigned APK
  const unsignedApk = tmpPath('unsigned.apk');
  zip.writeZip(unsignedApk);

  // Align APK
  const alignedApk = tmpPath('aligned.apk');
  const alignSpinner = logger.spinner('Aligning APK (zipalign)...');
  try {
    await execa('zipalign', ['-p', '-f', '4', unsignedApk, alignedApk]);
    alignSpinner.succeed('APK aligned');
  } catch (err) {
    alignSpinner.fail('zipalign failed');
    throw err;
  }

  // Sign APK
  const signArgs = [
    'sign',
    '--ks',
    keystorePath,
    '--ks-pass',
    `pass:${keystorePassword}`,
    '--ks-key-alias',
    keyAlias,
    '--out',
    outputPath,
    alignedApk,
  ];
  if (keyPassword) {
    signArgs.splice(6, 0, '--key-pass', `pass:${keyPassword}`); // insert after ks-key-alias
  }

  const signSpinner = logger.spinner('Signing APK...');
  try {
    await execa('apksigner', signArgs);
    signSpinner.succeed('APK signed');
  } catch (err) {
    signSpinner.fail('apksigner failed');
    throw err;
  }

  // Clean up temp files
  await fs.remove(path.dirname(unsignedApk));
  await fs.remove(path.dirname(alignedApk));
} 