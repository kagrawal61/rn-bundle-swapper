import { createRequire } from 'module';
import { Command } from 'commander';
import { swapAndroid, swapIosApp, swapIosIpa } from './index.js';
import { buildBundle } from './utils/bundle.js';
import fs from 'fs-extra';
import chalk from 'chalk';
import { showBanner, BannerStyle } from './utils/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const envStyleRaw = process.env.RNBS_BANNER_STYLE as BannerStyle | undefined;
const allowedStyles: BannerStyle[] = ['modern', 'ascii', 'compact'];
const bannerStyle: BannerStyle = allowedStyles.includes(envStyleRaw as BannerStyle)
  ? (envStyleRaw as BannerStyle)
  : 'modern';

showBanner('rn-bundle-swapper', version, bannerStyle);

const program = new Command();
program
  .name('rn-bundle-swapper')
  .description(
    'Swap or update the JavaScript bundle inside an already–built React Native APK, .app, or .ipa file.'
  )
  .version(version)
  .addHelpCommand('help [command]', 'Display help for a specific command')
  .showHelpAfterError('(add --help for usage information)');

function requireBundlePath(options: Record<string, string>): string {
  if (!options.jsbundle) {
    console.error(chalk.red('ERROR: --jsbundle is required when --build-jsbundle is not set.'));
    process.exit(1);
  }
  return options.jsbundle;
}

program
  .command('android <apkPath>')
  .description('Swap bundle in an APK and re-sign it')
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--keystore <path>', 'Path to keystore')
  .option('--ks-pass <password>', 'Keystore password')
  .option('--ks-alias <alias>', 'Keystore alias')
  .option('--key-pass <password>', 'Key password')
  .option('--copy-assets', 'Copy Metro assets alongside the bundle', false)
  .option('-o, --output <path>', 'Output APK path', 'patched.apk')
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper android app.apk \\
      --jsbundle index.android.bundle \\
      --keystore my.keystore --ks-pass android --ks-alias myalias

  # Build bundle from project, then swap (Hermes enabled by default)
  $ rn-bundle-swapper android app.apk \\
      --build-jsbundle --project-root ./MyApp \\
      --keystore my.keystore --ks-pass android --ks-alias myalias

  # Build without Hermes
  $ rn-bundle-swapper android app.apk \\
      --build-jsbundle --no-hermes --project-root ./MyApp \\
      --keystore my.keystore --ks-pass android --ks-alias myalias
`)
  .action(async (apkPath, options) => {
    const missing = ['keystore', 'ksPass', 'ksAlias'].filter((k) => !options[k]);
    if (missing.length > 0) {
      const flags = missing.map((k) => `--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`);
      console.error(chalk.red(`ERROR: missing required option(s): ${flags.join(', ')}`));
      process.exit(1);
    }

    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'android',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      // Assets are in a known location — enable copy automatically
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapAndroid({
        apkPath,
        jsBundlePath,
        keystorePath: options.keystore,
        keystorePassword: options.ksPass,
        keyAlias: options.ksAlias,
        keyPassword: options.keyPass,
        outputPath: options.output,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ APK written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

program
  .command('ios-app <appPath>')
  .description('Swap bundle in an iOS .app (Simulator)')
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--copy-assets', 'Copy Metro assets alongside the bundle', false)
  .option('-o, --output <path>', 'Output .app path', 'Patched.app')
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper ios-app MyApp.app --jsbundle main.jsbundle

  # Build bundle from project, then swap
  $ rn-bundle-swapper ios-app MyApp.app \\
      --build-jsbundle --project-root ./MyApp
`)
  .action(async (appPath, options) => {
    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'ios',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapIosApp({
        appPath,
        jsBundlePath,
        outputPath: options.output,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .app written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

program
  .command('ios-ipa <ipaPath>')
  .description('Swap bundle in an iOS .ipa (Device) and re-sign')
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--identity <identity>', 'Codesign identity')
  .option('--copy-assets', 'Copy Metro assets alongside the bundle', false)
  .option('-o, --output <path>', 'Output .ipa path', 'Patched.ipa')
  .option('--ci', 'Fail if identity not found; non-interactive', false)
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper ios-ipa MyApp.ipa \\
      --jsbundle main.jsbundle \\
      --identity "Apple Distribution: Example Corp (TEAMID)"

  # Build bundle from project, then swap (CI mode)
  $ rn-bundle-swapper ios-ipa MyApp.ipa \\
      --build-jsbundle --project-root ./MyApp \\
      --identity "Apple Distribution: Example Corp (TEAMID)" \\
      --ci
`)
  .action(async (ipaPath, options) => {
    if (!options.identity) {
      console.error(chalk.red('ERROR: missing required option: --identity'));
      process.exit(1);
    }

    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'ios',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapIosIpa({
        ipaPath,
        jsBundlePath,
        identity: options.identity,
        outputPath: options.output,
        ci: options.ci,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .ipa written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

// Support JSON config file as --config <file.json>
program.option('--config <path>', 'Path to JSON config file with arguments');

/**
 * Allowed keys in a JSON config file. Validated before injection into argv to
 * prevent untrusted config files from injecting arbitrary flags.
 */
const ALLOWED_CONFIG_KEYS = new Set([
  // Shared
  'jsbundle', 'build-jsbundle', 'project-root', 'no-hermes', 'copy-assets', 'output',
  // Android
  'keystore', 'ks-pass', 'ks-alias', 'key-pass',
  // iOS IPA
  'identity', 'ci',
]);

// Config file preprocessing: inject JSON keys as CLI flags before Commander parses.
(async () => {
  const argv = process.argv;
  const configIndex = argv.indexOf('--config');
  if (configIndex !== -1 && argv.length > configIndex + 1) {
    const configPath = argv[configIndex + 1];
    if (fs.existsSync(configPath)) {
      try {
        const configContent = await fs.readJson(configPath);
        const unknownKeys = Object.keys(configContent).filter((k) => !ALLOWED_CONFIG_KEYS.has(k));
        if (unknownKeys.length > 0) {
          console.error(chalk.red(`Unknown config key(s): ${unknownKeys.join(', ')}`));
          console.error(chalk.gray(`Allowed keys: ${[...ALLOWED_CONFIG_KEYS].join(', ')}`));
          process.exit(1);
        }
        const newArgs = [...argv.slice(0, 2)];
        Object.entries(configContent).forEach(([key, value]) => {
          newArgs.push(`--${key}`);
          if (typeof value !== 'boolean') {
            newArgs.push(String(value));
          }
        });
        newArgs.push(...argv.slice(configIndex + 2));
        program.parse(newArgs);
      } catch (err) {
        console.error(chalk.red(`Failed to read config at ${configPath}: ${(err as Error).message}`));
        process.exit(1);
      }
    } else {
      console.error(chalk.red(`Config file not found at ${configPath}`));
      process.exit(1);
    }
  } else {
    program.parse(argv);
  }
})();
