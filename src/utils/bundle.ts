import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { mkdtempSync } from 'fs';
import { execa } from 'execa';
import { logger } from './logger.js';

export interface BuildBundleOptions {
  projectRoot: string;
  platform: 'android' | 'ios';
  /** Compile output with Hermes. Default: true */
  hermes?: boolean;
  /** Build a dev bundle. Default: false */
  dev?: boolean;
  /** Entry file relative to projectRoot. Auto-detected if omitted. */
  entryFile?: string;
}

export interface BuildBundleResult {
  /** Path to the built (and optionally Hermes-compiled) bundle */
  bundlePath: string;
  /** Directory containing Metro assets */
  assetsDir: string;
  /** Temp directory containing all outputs — caller must remove this when done */
  outDir: string;
}

/** Detect the RN entry file in a project root. */
function findEntryFile(projectRoot: string): string {
  const candidates = ['index.js', 'index.ts', 'index.android.js', 'index.ios.js'];
  for (const f of candidates) {
    if (fs.existsSync(path.join(projectRoot, f))) return f;
  }
  return 'index.js';
}

/**
 * Locate the hermesc binary bundled with react-native or hermes-engine.
 * Returns null when not found (caller decides whether to warn or throw).
 */
function findHermesc(projectRoot: string): string | null {
  const plat = os.platform();
  const binDir =
    plat === 'darwin' ? 'osx-bin' : plat === 'win32' ? 'win64-bin' : 'linux64-bin';
  const binName = plat === 'win32' ? 'hermesc.exe' : 'hermesc';

  const candidates = [
    // RN ≥ 0.71 ships hermes-engine as a standalone package
    path.join(projectRoot, 'node_modules', 'hermes-engine', binDir, binName),
    // Older RN embeds hermesc in sdks/
    path.join(projectRoot, 'node_modules', 'react-native', 'sdks', 'hermesc', binDir, binName),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Build a React Native JS bundle from a project root using Metro.
 * Optionally compiles the output to Hermes bytecode.
 */
export async function buildBundle(opts: BuildBundleOptions): Promise<BuildBundleResult> {
  const { projectRoot, platform, hermes = true, dev = false, entryFile } = opts;

  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project root not found: ${projectRoot}`);
  }

  const outDir = mkdtempSync(path.join(os.tmpdir(), 'rnbundleswapper-build-'));
  const bundleName = platform === 'android' ? 'index.android.bundle' : 'main.jsbundle';
  const bundlePath = path.join(outDir, bundleName);
  const assetsDir = path.join(outDir, 'assets');

  await fs.ensureDir(assetsDir);

  const entry = entryFile ?? findEntryFile(projectRoot);

  // Prefer the local react-native binary over a global one so the version matches the project.
  const rnBin = path.join(projectRoot, 'node_modules', '.bin', 'react-native');
  const rnCmd = fs.existsSync(rnBin) ? rnBin : 'react-native';

  const bundleSpinner = logger.spinner(
    `Building ${platform} bundle (entry: ${entry}, dev: ${dev})...`
  );
  try {
    await execa(
      rnCmd,
      [
        'bundle',
        '--platform', platform,
        '--dev', String(dev),
        '--entry-file', entry,
        '--bundle-output', bundlePath,
        '--assets-dest', assetsDir,
        '--reset-cache',
      ],
      { cwd: projectRoot }
    );
    bundleSpinner.succeed('Bundle built');
  } catch (err) {
    bundleSpinner.fail('react-native bundle failed');
    await fs.remove(outDir);
    throw err;
  }

  if (hermes) {
    const hermesc = findHermesc(projectRoot);
    if (!hermesc) {
      logger.warn(
        'hermesc not found in node_modules — skipping Hermes compilation. Pass --no-hermes to suppress this warning.'
      );
    } else {
      const hbcPath = bundlePath + '.hbc';
      const hermesSpinner = logger.spinner('Compiling with Hermes...');
      try {
        await execa(hermesc, ['-emit-binary', '-out', hbcPath, bundlePath]);
        // Replace raw JS with bytecode so downstream swap uses the compiled file
        await fs.move(hbcPath, bundlePath, { overwrite: true });
        hermesSpinner.succeed('Hermes compilation done');
      } catch (err) {
        hermesSpinner.fail('Hermes compilation failed');
        await fs.remove(outDir);
        throw err;
      }
    }
  }

  return { bundlePath, assetsDir, outDir };
}
