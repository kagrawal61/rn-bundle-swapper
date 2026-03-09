import fs from 'fs-extra';
import { tmpPath } from '../utils/temp.js';
import AdmZip from 'adm-zip';
import { execa } from 'execa';
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
    copyAssets = false,
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

  if (copyAssets) {
    const bundleDir = path.dirname(jsBundlePath);
    const parentDir = path.dirname(bundleDir);

    // Metro places Android assets in res/drawable-*/ and assets/ dirs.
    // Check common output locations in priority order.
    const candidateDirs = [
      path.join(bundleDir, 'res'),
      path.join(bundleDir, 'assets'),
      path.join(parentDir, 'res'),
      path.join(parentDir, 'assets'),
      path.join(parentDir, 'android', 'res'),
      path.join(parentDir, 'android', 'assets'),
    ];

    logger.info('Looking for Android assets...');

    let assetsDir: string | null = null;
    for (const dir of candidateDirs) {
      if (await fs.pathExists(dir)) {
        logger.info(`Found assets directory: ${dir}`);
        assetsDir = dir;
        break;
      }
    }

    if (assetsDir) {
      const isResDir = path.basename(assetsDir) === 'res';
      const entries = await fs.readdir(assetsDir);
      for (const entry of entries) {
        const full = path.join(assetsDir, entry);
        const stats = await fs.stat(full);
        if (stats.isDirectory()) {
          // res/ subdirs (drawable-*, values/, etc.) always go under res/ in the APK.
          // assets/ subdirs go under assets/ in the APK.
          const zipRoot = isResDir
            ? path.posix.join('res', entry)
            : path.posix.join('assets', entry);
          logger.info(`Adding directory: ${entry} → ${zipRoot}`);
          await addDirToZip(zip, full, zipRoot);
        } else {
          // Loose files from a res/ dir go to res/raw/; from assets/ go to assets/
          const zipPath = isResDir
            ? path.posix.join('res', 'raw', entry)
            : path.posix.join('assets', entry);
          logger.info(`Adding file: ${entry} → ${zipPath}`);
          const content = await fs.readFile(full);
          zip.addFile(zipPath, content);
        }
      }
    } else {
      logger.warn('No assets directory found in any expected location');
    }
  }

  // Write unsigned APK
  const unsignedApk = tmpPath('unsigned.apk');
  const alignedApk = tmpPath('aligned.apk');

  try {
    zip.writeZip(unsignedApk);

    // Align APK
    const alignSpinner = logger.spinner('Aligning APK (zipalign)...');
    try {
      await execa('zipalign', ['-p', '-f', '4', unsignedApk, alignedApk]);
      alignSpinner.succeed('APK aligned');
    } catch (err) {
      alignSpinner.fail('zipalign failed');
      throw err;
    }

    // Sign APK
    // Passwords are passed via environment variables (env: scheme) rather than
    // as literal CLI arguments to prevent exposure in `ps aux` / process listings.
    const signEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      RNBS_KS_PASS: keystorePassword,
    };
    if (keyPassword) signEnv.RNBS_KEY_PASS = keyPassword;

    // Args: sign, --v2 true, --v3 false, --v4 true, --ks <path>, --ks-pass env:<var>,
    //       --ks-key-alias <alias>, [--key-pass env:<var>,] --out <out>, <input>
    const signArgs = [
      'sign',
      '--v2-signing-enabled', 'true',
      '--v3-signing-enabled', 'false',
      '--v4-signing-enabled', 'true',
      '--ks',
      keystorePath,
      '--ks-pass',
      'env:RNBS_KS_PASS',
      '--ks-key-alias',
      keyAlias,
      // index 12 = keyAlias value; --key-pass goes after this (index 13)
      '--out',
      outputPath,
      alignedApk,
    ];
    if (keyPassword) {
      // Insert --key-pass after --ks-key-alias value (index 12 = keyAlias, insert at 13)
      signArgs.splice(13, 0, '--key-pass', 'env:RNBS_KEY_PASS');
    }

    const signSpinner = logger.spinner('Signing APK...');
    try {
      await execa('apksigner', signArgs, { env: signEnv });
      signSpinner.succeed('APK signed');
    } catch (err) {
      signSpinner.fail('apksigner failed');
      throw err;
    }
  } finally {
    // Always clean up temp files, even on failure
    await fs.remove(path.dirname(unsignedApk));
    await fs.remove(path.dirname(alignedApk));
  }
}
