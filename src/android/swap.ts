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
    copyAssets,
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

  // TODO: Copy assets if requested
  if (copyAssets) {
    // React Native bundles assets into res/drawable*/ etc. Expect a 'res' directory adjacent to bundle or within 'assets'.
    const candidateDirs = [
      path.join(path.dirname(jsBundlePath), 'res'),
      path.join(path.dirname(jsBundlePath), 'assets'),
    ];
    let assetsDir: string | null = null;
    for (const dir of candidateDirs) {
      if (await fs.pathExists(dir)) {
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
          await addDirToZip(zip, full, path.posix.join('res', entry));
        } else {
          // Some assets might be at root; place them under res/raw
          const content = await fs.readFile(full);
          zip.addFile(path.posix.join('res', 'raw', entry), content);
        }
      }
    } else {
      console.warn('copyAssets requested but no res/assets directory found near JS bundle');
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